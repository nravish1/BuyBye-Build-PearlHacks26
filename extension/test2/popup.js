// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const wageEl = document.getElementById('wage');
  const disableBtn = document.getElementById('disableBtn');
  const disableMenu = document.getElementById('disableMenu');
  const waitBtn = document.getElementById('wait');
  const resumeBtn = document.getElementById('resume');
  const resultEl = document.getElementById('result');

   if (!wageEl || !resultEl) {
    // Not running inside popup.html, abort silently.
    return;
  }
  // Load settings & lastCart
  chrome.storage.local.get(['hourlyWage', 'lastCart', 'disabledUntil', 'permanentDisable'], (r) => {
    wageEl.value = r.hourlyWage || 20;
    showLastCart(r.lastCart);

    // Show current disable status if active
    if (r.permanentDisable) {
      resultEl.textContent = 'Disabled until re-enabled';
      disableBtn.textContent = 'Enable ▾';
    } else if (r.disabledUntil && Date.now() < r.disabledUntil) {
      const remaining = Math.ceil((r.disabledUntil - Date.now()) / 3600000);
      resultEl.textContent = `Disabled for ~${remaining} more hour${remaining > 1 ? 's' : ''}`;
      disableBtn.textContent = 'Enable ▾';
    }
  });

  wageEl.addEventListener('change', (e) => {
    chrome.storage.local.set({ hourlyWage: Number(e.target.value) });
  });

  // Toggle dropdown
  disableBtn.addEventListener('click', () => {
    disableMenu.classList.toggle('hidden');
  });

  // Close dropdown if clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.disable-wrapper')) {
      disableMenu.classList.add('hidden');
    }
  });

  // Handle disable options
  document.querySelectorAll('.disable-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const hours = parseInt(btn.dataset.hours);
      const permanent = hours === 0;
      const disabledUntil = permanent ? null : Date.now() + hours * 60 * 60 * 1000;

      chrome.storage.local.set({ disabledUntil, permanentDisable: permanent }, () => {
        disableMenu.classList.add('hidden');
        resultEl.textContent = permanent
          ? 'Disabled until re-enabled'
          : `Disabled for ${hours} hour${hours > 1 ? 's' : ''}`;
        disableBtn.textContent = 'Enable ▾';
      });
    });
  });


  resumeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESUME_PURCHASE' }, (r) => {
      resultEl.textContent = r?.resumed ? 'Resuming purchase...' : 'Could not resume';
    });
  });

  function showLastCart(cart) {
    const lastDiv = document.getElementById('last');
    if (!cart) { lastDiv.textContent = 'No purchase detected yet.'; return; }
    chrome.storage.local.get('hourlyWage', (r) => {
      const wage = r.hourlyWage || 20;
      const price = parseFloat((cart.priceText || '').replace(/[^0-9.]/g, '')) || 0;
      const hours = (price / wage).toFixed(2);
      lastDiv.innerHTML = `
        <div><strong>${cart.title || '(no title)'}</strong></div>
        <div>${cart.priceText || 'unknown price'} — ${hours} hrs of work</div>
        <div><small>${cart.url}</small></div>`;
    });
  }
});