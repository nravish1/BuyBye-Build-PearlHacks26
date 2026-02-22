// background.js (MV3 service worker)
const SERVER_BASE = 'http://localhost:3000';
const CHECK_PURCHASE_PATH = '/check-purchase';

console.log('[background] service worker loaded');

// ── Helpers ───────────────────────────────────────────────────────────────────

function captureVisibleTabPromise(windowId, options = { format: 'png' }) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.captureVisibleTab(windowId, options, (dataUrl) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(dataUrl);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function postToServer(path, bodyObj) {
  const url = `${SERVER_BASE}${path}`;
  console.log(`[background] POST -> ${url}`, { bodyKeys: Object.keys(bodyObj || {}) });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = text; }
  return { ok: resp.ok, status: resp.status, body: json };
}

function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userId', 'userName'], (r) => {
      resolve({ userId: r.userId || null, userName: r.userName || null });
    });
  });
}

// ── Message router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (!msg || !msg.type) {
      sendResponse({ ok: false, error: 'invalid_message' });
      return false;
    }

    console.log('[background] onMessage', msg.type, msg.payload || null);

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    if (msg.type === 'LOGIN') {
      (async () => {
        try {
          const { email, password } = msg.payload;
          const resp = await fetch(`${SERVER_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await resp.json();

          if (data.error) {
            sendResponse({ ok: false, error: data.error });
            return;
          }

          await chrome.storage.local.set({ userId: data.userId, userName: data.name });
          console.log('[background] logged in as', data.name, data.userId);
          sendResponse({ ok: true, userId: data.userId, userName: data.name });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    if (msg.type === 'LOGOUT') {
      chrome.storage.local.remove(['userId', 'userName'], () => {
        console.log('[background] logged out');
        sendResponse({ ok: true });
      });
      return true;
    }

    // ── GET_AUTH ──────────────────────────────────────────────────────────────
    if (msg.type === 'GET_AUTH') {
      getStoredAuth().then((auth) => sendResponse(auth));
      return true;
    }

    // ── PAUSE_SHOW_MODAL ──────────────────────────────────────────────────────
    if (msg.type === 'PAUSE_SHOW_MODAL') {
      const cart = {
        priceText: msg.payload?.priceText || null,
        title: msg.payload?.title || null,
        url: msg.payload?.url || sender?.tab?.url || null,
        savedAt: Date.now()
      };
      chrome.storage.local.get(['cartHistory'], (r) => {
        const history = r.cartHistory || [];
        history.push(cart);
        chrome.storage.local.set({ cartHistory: history, lastCart: cart }, () => {
          console.log('[background] lastCart saved', cart);
          chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: { info: 'cart_saved', cart } });
          sendResponse({ ok: true, cart });
        });
      });
      return false;
    }

    // ── CAPTURE_UPLOAD ────────────────────────────────────────────────────────
    if (msg.type === 'CAPTURE_UPLOAD') {
      (async () => {
        try {
          const tabs = await new Promise((res) => chrome.tabs.query({ active: true, currentWindow: true }, res));
          const tab = (tabs && tabs[0]) || null;
          if (!tab) {
            sendResponse({ ok: false, error: 'no_active_tab' });
            return;
          }

          const dataUrl = await captureVisibleTabPromise(tab.windowId, { format: 'png' });
          console.log('[background] screenshot captured, length:', dataUrl?.length || 0);

          const stored = await new Promise((res) => chrome.storage.local.get('lastCart', res));
          const item = msg.payload?.title || stored?.lastCart?.title || 'captured';
          const priceText = msg.payload?.priceText || stored?.lastCart?.priceText || '';
          const price = Number((priceText || '').replace(/[^0-9.]/g, '')) || 0;

          // ── Get real userId from storage ───────────────────────────────────
          const { userId, userName } = await getStoredAuth();

          if (!userId) {
            console.warn('[background] no userId — user not logged in');
            sendResponse({ ok: false, error: 'not_logged_in', message: 'Please log in via the extension popup first.' });
            return;
          }

          console.log('[background] sending purchase for user:', userName, userId);

          const serverPayload = { item, price, userId, screenshot: dataUrl };
          const { ok, status, body } = await postToServer(CHECK_PURCHASE_PATH, serverPayload);

          if (!ok) {
            console.error('[background] server error', status, body);
            sendResponse({ ok: false, status, body });
            return;
          }

          const lastCart = { title: item, priceText, url: tab.url || null, savedAt: Date.now() };
          chrome.storage.local.set({ lastCart }, () => {
            console.log('[background] lastCart updated after analysis');
          });

          chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: body });
          sendResponse({ ok: true, analysis: body });

        } catch (e) {
          console.error('[background] CAPTURE_UPLOAD error', e?.message || e);
          sendResponse({ ok: false, error: e?.message || String(e) });
        }
      })();
      return true;
    }

    // ── PURCHASE_MADE — user clicked "I still want it" ────────────────────────
    if (msg.type === 'PURCHASE_MADE') {
      (async () => {
        try {
          const { price, item, site } = msg.payload;
          const { userId } = await getStoredAuth();

          console.log('[background] PURCHASE_MADE — item:', item, 'price:', price, 'userId:', userId);

          if (!userId) {
            console.warn('[background] PURCHASE_MADE — no userId, skipping');
            sendResponse({ ok: false, error: 'not_logged_in' });
            return;
          }

          const { ok, body } = await postToServer('/purchase-completed', {
            userId,
            item: item || 'Unknown item',
            price: price || 0,
            site: site || '',
            decision: 'bought'
          });

          console.log('[background] purchase saved:', body);
          sendResponse({ ok });

        } catch (e) {
          console.error('[background] PURCHASE_MADE error', e?.message);
          sendResponse({ ok: false, error: e?.message });
        }
      })();
      return true;
    }

    // ── FORCE_UPDATE_POPUP ────────────────────────────────────────────────────
    if (msg.type === 'FORCE_UPDATE_POPUP') {
      chrome.storage.local.get(['lastCart', 'hourlyWage', 'disabledUntil', 'permanentDisable', 'userId', 'userName'], (r) => {
        sendResponse(r);
      });
      return true;
    }

    sendResponse({ ok: false, error: 'unknown_message_type' });
    return false;

  } catch (outerErr) {
    console.error('[background] onMessage outer error', outerErr);
    sendResponse({ ok: false, error: outerErr?.message || String(outerErr) });
    return false;
  }
});

// ── Defaults on install ───────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['hourlyWage'], (r) => {
    if (r.hourlyWage == null) {
      chrome.storage.local.set({ hourlyWage: 20 }, () => console.log('[background] set default hourlyWage=20'));
    }
  });
});