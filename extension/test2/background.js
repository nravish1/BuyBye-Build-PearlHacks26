// background.js (MV3 service worker)
// Central router / network manager for the extension (reminder + resume removed).

const SERVER_BASE = 'http://localhost:3000'; // adjust if needed
const CHECK_PURCHASE_PATH = '/check-purchase'; // server endpoint in index.js

console.log('[background] service worker loaded');

// Helper: promisified chrome.tabs.captureVisibleTab
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

// Helper: safe JSON parse / response wrapper
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

// Message router
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (!msg || !msg.type) {
      sendResponse({ ok: false, error: 'invalid_message' });
      return false;
    }

    console.log('[background] onMessage', msg.type, msg.payload || null);

    // Save pause modal info (from content script when user triggers pause)
    // msg.payload should contain: { title, priceText, url }
    if (msg.type === 'PAUSE_SHOW_MODAL') {
      const cart = {
        priceText: msg.payload?.priceText || null,
        title: msg.payload?.title || null,
        url: msg.payload?.url || sender?.tab?.url || null,
        savedAt: Date.now()
      };
      chrome.storage.local.set({ lastCart: cart }, () => {
        console.log('[background] lastCart saved', cart);
        // notify any open popup or content listeners
        chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: { info: 'cart_saved', cart } });
        sendResponse({ ok: true, cart });
      });
      return false;
    }

    // Capture + upload to server (from popup or content)
    // Expects optional payload with title / priceText to form server body.
    if (msg.type === 'CAPTURE_UPLOAD') {
      (async () => {
        try {
          // find active tab/window
          const tabs = await new Promise((res) => chrome.tabs.query({ active: true, currentWindow: true }, res));
          const tab = (tabs && tabs[0]) || null;
          if (!tab) {
            sendResponse({ ok: false, error: 'no_active_tab' });
            return;
          }

          const dataUrl = await captureVisibleTabPromise(tab.windowId, { format: 'png' });
          console.log('[background] captured screenshot length', dataUrl?.length || 0);

          // Build body to match server /check-purchase
          const stored = await new Promise((res) => chrome.storage.local.get('lastCart', res));
          const item = msg.payload?.title || (stored && stored.lastCart && stored.lastCart.title) || 'captured';
          const priceText = msg.payload?.priceText || (stored && stored.lastCart && stored.lastCart.priceText) || '';
          const price = Number((priceText || '').replace(/[^0-9.]/g, '')) || 0;
          const userId = msg.payload?.userId || 'test-user-id';

          const serverPayload = { item, price, userId, screenshot: dataUrl };

          const { ok, status, body } = await postToServer(CHECK_PURCHASE_PATH, serverPayload);

          if (!ok) {
            console.error('[background] server error', status, body);
            sendResponse({ ok: false, status, body });
            return;
          }

          // store lastCart (merge)
          const lastCart = {
            title: item,
            priceText,
            url: tab.url || null,
            savedAt: Date.now()
          };
          chrome.storage.local.set({ lastCart }, () => {
            console.log('[background] lastCart updated after analysis', lastCart);
          });

          // forward to popup/content
          chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: body });
          sendResponse({ ok: true, analysis: body });
        } catch (e) {
          console.error('[background] CAPTURE_UPLOAD error', e);
          sendResponse({ ok: false, error: e?.message || String(e) });
        }
      })();

      return true; // keep sendResponse channel open
    }

    // Provide popup the latest saved/lastCart etc.
    if (msg.type === 'FORCE_UPDATE_POPUP') {
      // return keys that popup uses; removed savedItems/reminder/resume fields
      chrome.storage.local.get(['lastCart','hourlyWage','disabledUntil','permanentDisable'], (r) => {
        sendResponse(r);
      });
      return true; // async
    }

    // Unknown message type
    sendResponse({ ok: false, error: 'unknown_message_type' });
    return false;

  } catch (outerErr) {
    console.error('[background] onMessage outer error', outerErr);
    sendResponse({ ok: false, error: outerErr?.message || String(outerErr) });
    return false;
  }
}); // end onMessage

// Optional: runtime.onInstalled for initial defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['hourlyWage'], (r) => {
    if (r.hourlyWage == null) {
      chrome.storage.local.set({ hourlyWage: 20 }, () => console.log('[background] set default hourlyWage=20'));
    }
  });

}); 

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PURCHASE_MADE') {
    console.log('got price:', msg.payload.price)
    console.log('got item:', msg.payload.item)
    console.log('got site:', msg.payload.site)
  }
})
