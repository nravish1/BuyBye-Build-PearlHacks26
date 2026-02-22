
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
    showPauseModal();
  }
  
}, true);

function showPauseModal() {
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
    alert("Here's a quick checklist to consider:\n\n1. Do I really need this?\n2. Can I afford it?\n3. Will I use it often?\n4. Is there a cheaper alternative?\n5. Can I wait for a sale?");
    host.remove();
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
  shadow.getElementById("continue-anyway").addEventListener('click', () => {
    const price = extractPrice();
    console.log('Extracted price:', price);

    chrome.runtime.sendMessage({
    type: 'PURCHASE_MADE',
    payload: { price, item: document.title, site: window.location.hostname }
  })
    host.remove();
  });

}
