document.addEventListener('click', (e) => {
  // const checkoutButton = e.target.closest('button, a, input[type="submit"]');
  // if(!checkoutButton) return;

  const checkoutButton = e.target;

  const text = (
    checkoutButton.innerText ||
    checkoutButton.value ||
    checkoutButton.getAttribute('aria-label') ||
    checkoutButton.getAttribute('data-action') || ''  ).toLowerCase().trim();

  console.log('clicked:', text)
    
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
  const itemName = extractItemName()
  const host = document.createElement('div');
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });



  shadow.innerHTML = `
  <style>
    * {
      box-sizing: border-box;
      font-family: sans-serif;
      margin: 0;
      padding: 0;
    }
    #overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background-color: rgba(0,0,0,0.7) !important;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #pause-modal {
      background-color: white !important;
      padding: 30px;
      border-radius: 12px;
      width: 400px;
    }
    h2 { font-size: 22px; font-weight: bold; margin-bottom: 12px; color: black; }
    p  { font-size: 14px; margin-bottom: 20px; color: #333; }
    button { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; margin-right: 8px; }
    #talk-me-out { background: #4CAF50; color: white; }
    #continue-anyway { background: #ccc; color: #666; }
    #continue-anyway:not([disabled]) { background: #e5584e; color: white; cursor: pointer; }
  </style>
    <div id="overlay" >
      <div id="pause-modal">
        <h2>⏸ Pause & Think</h2>
        <p>Before you buy — let's check in.</p>
        <button id="talk-me-out">Talk me out of it</button>
        <button id="continue-anyway" disabled>I still want it</button>
      </div>
    </div>
  `;
  
  // shadow.body.appendChild(modal);

  let timer = 5;
  const btn = shadow.getElementById("continue-anyway");
  btn.innerText = `I still want it (${timer})`;

  const interval = setInterval(() => {
    timer--;
    if (timer > 0) {
      btn.innerText = `I still want it (${timer})`;
    } else {
      clearInterval(interval);
      btn.innerText = "I still want it";
      btn.disabled = false;
    }
  }, 1000);

  shadow.getElementById("talk-me-out").addEventListener('click', () => {
  const pEl = shadow.querySelector('p');
  pEl.innerText = 'Thinking...';
  
  chrome.runtime.sendMessage({
    type: 'CAPTURE_UPLOAD',
    payload: { title: document.title, priceText: '' }
  }, (response) => {
    pEl.innerText = response?.analysis?.message || 'Take a moment before buying!';
  });
});

  
  function extractPrice() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent)
      if (data.price) return parseFloat(data.price)
      if (data.offers?.price) return parseFloat(data.offers.price)
    } catch(e) {}
  }

  const meta = document.querySelector('meta[property="product:price:amount"]') ||
               document.querySelector('meta[itemprop="price"]')
  if (meta) return parseFloat(meta.getAttribute('content'))
    const selectors = [
    '[class*="total"]',
    '[class*="order-total"]',
    '[class*="cart-total"]',
    '[data-testid*="total"]',
    '[aria-label*="total"]',
    '[class*="grand-total"]',
    '[class*="esitmated-total"]',
    '[class*="subtotal"]'
];
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el) {
      const match = el.textContent.match(/\$[\d,]+\.?\d*/)
      if (match) return parseFloat(match[0].replace(/[^0-9.]/g, ''))
    }
  }

  const bodyText = document.body.innerText
  const match = bodyText.match(/(?:total|subtotal)[^\n]*?\$([\d,]+\.?\d*)/i)
  if (match) return parseFloat(match[1].replace(/,/g, ''))
  
  console.log('price not found')

  return null;
  
  }

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

  const uniqueNames = [...new Set(names)];

  return uniqueNames.join(', ');
}
  shadow.getElementById("continue-anyway").addEventListener('click', () => {
    const price = extractPrice();
    console.log('Extracted price:', price);

    chrome.runtime.sendMessage({
    type: 'PURCHASE_MADE',
    payload: { price, item: itemName, site: window.location.hostname }
  })
    host.remove();
  });

}
