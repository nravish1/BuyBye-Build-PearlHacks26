// Detect if we're on a checkout page
const checkoutKeywords = ['checkout', 'cart', 'basket', 'order-summary', 'buy-now'];
const isCheckout = checkoutKeywords.some(keyword => 
  window.location.href.includes(keyword) || 
  document.title.toLowerCase().includes(keyword)
);

if (isCheckout) {
  showPauseModal();
}

function showPauseModal() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div id="pause-overlay" style="
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 999999;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px;">
        <h2>⏸ Pause & Think</h2>
        <p>Before you buy — let's check in.</p>
        <button id="talk-me-out">Talk me out of it</button>
        <button id="continue-anyway">I still want it</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}