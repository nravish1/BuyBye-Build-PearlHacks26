document.addEventListener('click', (e) => {
  const checkoutButton = e.target;

  const text = (
    checkoutButton.innerText ||
    checkoutButton.value ||
    checkoutButton.getAttribute('aria-label') ||
    checkoutButton.getAttribute('data-action') || ''
  ).toLowerCase().trim();

  console.log('clicked:', text);

  const checkoutPhrases = [
    'proceed to checkout',
    'continue to checkout',
    'checkout',
    'place order',
    'buy now',
    'pay now'
  ];

  if (checkoutPhrases.some(phrase => text.includes(phrase))) {
    e.preventDefault();
    e.stopPropagation();
    const priceText = document.querySelector('.a-price, .price, [data-price]')?.innerText || '';
    chrome.runtime.sendMessage({
      type: 'PAUSE_SHOW_MODAL',
      payload: { priceText, title: document.title, url: window.location.href }
    });
    showPauseModal();
  }

}, true);

function showPauseModal() {
  const itemName = extractItemName();
  const host = document.createElement('div');
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'DM Sans', sans-serif;
    }

    #overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(61, 43, 43, 0.55);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #pause-modal {
      background: #fdfaf9;
      border: 1px solid #edddd4;
      border-radius: 24px;
      padding: 32px 28px 24px;
      width: 400px;
      box-shadow: 0 20px 60px rgba(158, 112, 112, 0.18);
      animation: slideUp 0.3s ease;
      position: relative;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ───────────────────────────────── */
    .modal-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .pause-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #a07878, #c4a0a0);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    h2 {
      font-family: 'Lora', serif;
      font-size: 18px;
      font-weight: 500;
      color: #3d2b2b;
      font-style: italic;
    }

    /* ── Item detected ────────────────────────── */
    .item-chip {
      background: #f5eeee;
      border: 1px solid #d4b8b8;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 12px;
      color: #8a6a6a;
      margin: 12px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Message area ─────────────────────────── */
    #modal-message {
      font-size: 14px;
      color: #6b4a4a;
      line-height: 1.6;
      margin-bottom: 20px;
      min-height: 44px;
    }

    /* ── Progress bar (timer) ─────────────────── */
    .timer-track {
      height: 3px;
      background: #edddd4;
      border-radius: 100px;
      margin-bottom: 18px;
      overflow: hidden;
    }

    .timer-fill {
      height: 100%;
      background: linear-gradient(90deg, #c49a9a, #9e7070);
      border-radius: 100px;
      width: 100%;
      transition: width 1s linear;
    }

    /* ── Buttons ──────────────────────────────── */
    .btn-row {
      display: flex;
      gap: 10px;
    }

    #talk-me-out {
      flex: 1;
      padding: 11px 16px;
      background: linear-gradient(135deg, #9e7070, #c49a9a);
      color: white;
      border: none;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(158, 112, 112, 0.25);
      transition: opacity 0.2s;
    }

    #talk-me-out:hover { opacity: 0.9; }

    #continue-anyway {
      flex: 1;
      padding: 11px 16px;
      background: #f0e6e6;
      color: #b89898;
      border: 1px solid #d4b8b8;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      cursor: not-allowed;
      transition: all 0.2s;
    }

    #continue-anyway:not([disabled]) {
      background: #f5eeee;
      color: #7a4f4f;
      border-color: #c4a0a0;
      cursor: pointer;
    }

    #continue-anyway:not([disabled]):hover {
      background: #edddd4;
    }

  .close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid #d4b8b8;
    background: #f5eeee;
    color: #9e7070;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover { background: #edddd4; }

    /* ── Footer note ──────────────────────────── */
    .modal-footer {
      text-align: center;
      font-size: 11px;
      color: #b89898;
      margin-top: 14px;
    }
  </style>

  <div id="overlay">
    <div id="pause-modal">
    <button class="close-btn" id="close-modal">✕</button>

      <div class="modal-header">
        <div class="pause-icon">⏸</div>
        <h2>BuyBye</h2>
      </div>

      <div class="item-chip" id="item-chip">Detecting item...</div>

      <p id="modal-message">Before you buy: take a breath. Is this something you really need right now?</p>

      <div class="timer-track">
        <div class="timer-fill" id="timer-fill"></div>
      </div>

      <div class="btn-row">
        <button id="talk-me-out">Talk me out of it</button>
        <button id="continue-anyway" disabled>I still want it (5)</button>
      </div>

      <p class="modal-footer">Make your goals the priority</p>

    </div>
  </div>
  `;

  shadow.getElementById('close-modal').addEventListener('click', () => {
  clearInterval(interval);
  host.remove();
  });
  // ── Show item name ──────────────────────────────────────────────────────
  const chip = shadow.getElementById('item-chip');
  if (itemName && itemName !== 'Items in Cart') {
    chip.textContent = itemName;
  } else {
    chip.textContent = (document.title || 'Items in Cart');
  }

  // ── Countdown timer ─────────────────────────────────────────────────────
  let timer = 5;
  const btn = shadow.getElementById('continue-anyway');
  const fill = shadow.getElementById('timer-fill');

  btn.textContent = `I still want it (${timer})`;

  const interval = setInterval(() => {
    timer--;
    fill.style.width = `${(timer / 5) * 100}%`;

    if (timer > 0) {
      btn.textContent = `I still want it (${timer})`;
    } else {
      clearInterval(interval);
      btn.textContent = 'I still want it';
      btn.disabled = false;
    }
  }, 1000);

  // ── Talk me out of it ───────────────────────────────────────────────────
  shadow.getElementById('talk-me-out').addEventListener('click', () => {
    const msgEl = shadow.getElementById('modal-message');
    msgEl.textContent = 'Thinking...';

    shadow.getElementById('talk-me-out').disabled = true;
    shadow.getElementById('talk-me-out').style.opacity = '0.6';

    chrome.runtime.sendMessage({
      type: 'CAPTURE_UPLOAD',
      payload: { title: document.title, priceText: '' }
    }, (response) => {
      msgEl.textContent = response?.analysis?.message || 'Take a moment — your goals are worth more than this purchase.';
      shadow.getElementById('talk-me-out').style.display = 'none';
    });
  });

  // ── Continue anyway ─────────────────────────────────────────────────────
  shadow.getElementById('continue-anyway').addEventListener('click', () => {
    const price = extractPrice();
    console.log('Extracted price:', price);

    chrome.runtime.sendMessage({
      type: 'PURCHASE_MADE',
      payload: { price, item: itemName, site: window.location.hostname }
    });

    host.remove();
  });

  // ── Price extraction ────────────────────────────────────────────────────
  function extractPrice() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.price) return parseFloat(data.price);
        if (data.offers?.price) return parseFloat(data.offers.price);
      } catch(e) {}
    }

    const meta = document.querySelector('meta[property="product:price:amount"]') ||
                 document.querySelector('meta[itemprop="price"]');
    if (meta) return parseFloat(meta.getAttribute('content'));

    const selectors = [
      '[class*="total"]', '[class*="order-total"]', '[class*="cart-total"]',
      '[data-testid*="total"]', '[aria-label*="total"]',
      '[class*="grand-total"]', '[class*="subtotal"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const match = el.textContent.match(/\$[\d,]+\.?\d*/);
        if (match) return parseFloat(match[0].replace(/[^0-9.]/g, ''));
      }
    }

    const bodyText = document.body.innerText;
    const match = bodyText.match(/(?:total|subtotal)[^\n]*?\$([\d,]+\.?\d*)/i);
    if (match) return parseFloat(match[1].replace(/,/g, ''));

    console.log('price not found');
    return null;
  }

  // ── Item name extraction ────────────────────────────────────────────────
  function extractItemName() {
    const cartList = document.querySelector('[data-testid="cart-items-list"]') || document;
    const nameElements = cartList.querySelectorAll('[data-testid="productName"] span');

  if (nameElements.length === 0) {
    const backupLinks = cartList.querySelectorAll('a[data-automation-id="name"]');
    if (backupLinks.length > 0) {
      return Array.from(backupLinks).map(el => el.getAttribute('aria-label') || el.innerText).join(', ');
    }
const amazonTitles = document.querySelectorAll('.a-truncate-cut')
if (amazonTitles.length > 0) {
  const names = Array.from(amazonTitles)
    .map(el => el.textContent.trim())
    .filter(text => text.length > 5)
    .filter((v, i, a) => a.indexOf(v) === i)
  if (names.length > 0) return names.join(', ')
}
    return "Items in Cart";
  }
  const names = Array.from(nameElements)
    .map(el => el.innerText.trim())
    .filter(text => text.length > 0);

    return [...new Set(names)].join(', ');
  }
}