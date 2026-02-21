// background.js
// Note: MV3 service worker is event-based. Persist to storage.

// Listen for messages from content/popup scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PAUSE_SHOW_MODAL') {
    const cart = {
      priceText: msg.payload.priceText || null,
      title: msg.payload.title || null,
      url: msg.payload.url,
      savedAt: Date.now()
    };
    chrome.storage.local.set({ lastCart: cart }, () => {
      // Optionally open popup for user interaction — best is to rely on user clicking extension icon
      // Or notify popup by sending a message to all extension pages
      chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: { info: 'cart_saved' } });
      sendResponse({ ok: true });
    });
    return true; // async
  }

  if (msg.type === 'CAPTURE_UPLOAD') {
    // capture visible tab and POST to server
    const fakeAnalysis = {
            message: "You've spent toooo much money this month on clothes! Maybe take a break and check out your spending dashboard?",
            item: "Test item",
            price: "$19.99",

        };
    chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: fakeAnalysis });
    sendResponse({ ok: true, analysis: fakeAnalysis });
    /*chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        
      const tab = tabs[0];
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, async (dataUrl) => {
        try {
          const resp = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ screenshot: dataUrl })
          });
          const json = await resp.json();
          // forward to popup/content
          chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', payload: json });
          sendResponse({ ok: true, analysis: json });
        } catch (e) {
          sendResponse({ ok: false, error: e.toString() });
        }
      });
    });*/
    return true; // async

  }

  if (msg.type === 'SCHEDULE_REMINDER') {
    const minutes = msg.payload?.minutes || 1440;
    chrome.alarms.create('pause_reminder', { delayInMinutes: minutes });
    // Save savedItems entry
    chrome.storage.local.get(['savedItems','lastCart'], (r) => {
      const last = r.lastCart;
      const saved = r.savedItems || [];
      saved.push({
        id: Date.now().toString(),
        ...last,
        remindAt: Date.now() + minutes * 60000
      });
      chrome.storage.local.set({ savedItems: saved });
    });
    sendResponse({ scheduled: true });
    return false;
  }

  if (msg.type === 'RESUME_PURCHASE') {
    // instruct content script to run the resume callback in the page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'DO_RESUME' });
    });
    sendResponse({ resumed: true });
    return false;
  }
  if (msg.type === 'FORCE_UPDATE_POPUP') {
    // useful for popup to request latest saved items
    chrome.storage.local.get(['lastCart','savedItems','hourlyWage'], (r) => sendResponse(r));
    return true; // async
  }
});
  
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pause_reminder') {
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icons/butterfly.png',
      title: 'Pause & Think — revisit saved item',
      message: 'Open Pause & Think to review your saved item.',
      priority: 2
    });
  }
});

