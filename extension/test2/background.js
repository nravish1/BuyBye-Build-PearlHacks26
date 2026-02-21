// background.js (MV3 service worker)
// Central router / network manager for the extension.

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

    // 1) Save pause modal info (from content script when user triggers pause)
    //    msg.payload should contain: { title, priceText, url }
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
      return false; // storage callback already called sendResponse synchronously above
    }

    // 2) Capture + upload to server (from popup or content)
    //    Expects optional payload with title / priceText to form server body.
    //    This is asynchronous -> return true
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
          const item = msg.payload?.title || (await chrome.storage.local.get('lastCart')).lastCart?.title || 'captured';
          const priceText = msg.payload?.priceText || (await chrome.storage.local.get('lastCart')).lastCart?.priceText || '';
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

      return true; // important — keep sendResponse channel open
    }

    // 3) Schedule a reminder (saves savedItems and creates an alarm)
    //    payload: { minutes } optional
    if (msg.type === 'SCHEDULE_REMINDER') {
      const minutes = Number(msg.payload?.minutes) || 1440; // default 1 day
      chrome.alarms.create('pause_reminder', { delayInMinutes: minutes });
      chrome.storage.local.get(['savedItems','lastCart'], (r) => {
        const last = r.lastCart || {};
        const saved = r.savedItems || [];
        saved.push({
          id: Date.now().toString(),
          ...last,
          remindAt: Date.now() + minutes * 60000
        });
        chrome.storage.local.set({ savedItems: saved }, () => {
          console.log('[background] reminder scheduled, savedItems updated', { minutes, item: last.title });
          sendResponse({ scheduled: true, minutes });
        });
      });
      return true; // async sendResponse (storage callback)
    }

    // 4) Resume purchase (instruct content script to call resume behavior on page)
    if (msg.type === 'RESUME_PURCHASE') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = (tabs && tabs[0]) || null;
        if (!tab) {
          sendResponse({ resumed: false, error: 'no_active_tab' });
          return;
        }
        chrome.tabs.sendMessage(tab.id, { type: 'DO_RESUME' }, (resp) => {
          // sendResponse optional depending on content script implementation
          sendResponse({ resumed: true });
        });
      });
      return true; // async
    }

    // 5) Provide popup the latest saved/lastCart etc.
    if (msg.type === 'FORCE_UPDATE_POPUP') {
      chrome.storage.local.get(['lastCart','savedItems','hourlyWage','disabledUntil','permanentDisable'], (r) => {
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

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[background] onAlarm', alarm);
  if (alarm.name === 'pause_reminder') {
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icons/butterfly.png',
      title: 'Pause & Think — revisit saved item',
      message: 'Open Pause & Think to review your saved item.',
      priority: 2
    }, (id) => {
      console.log('[background] notification created', id);
    });
  }
});

// Optional: runtime.onInstalled for initial defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['hourlyWage'], (r) => {
    if (r.hourlyWage == null) {
      chrome.storage.local.set({ hourlyWage: 20 }, () => console.log('[background] set default hourlyWage=20'));
    }
  });
});