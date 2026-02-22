// popup.js
document.addEventListener('DOMContentLoaded', () => {

  const loginView  = document.getElementById('login-view');
  const mainView   = document.getElementById('main-view');
  const loginError = document.getElementById('login-error');

  // ── Check auth on open ────────────────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (auth) => {
    if (auth?.userId) {
      showMain(auth);
    } else {
      showLogin();
    }
  });

  // ── Show/hide views ───────────────────────────────────────────────────────
  function showLogin() {
    loginView.style.display = 'block';
    mainView.style.display  = 'none';
  }

  function showMain(auth) {
    loginView.style.display = 'none';
    mainView.style.display  = 'block';
    document.getElementById('userName-display').textContent = '👋 ' + (auth.userName || 'User');
    loadSettings();
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  function handleLogin() {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      loginError.textContent  = 'Please enter email and password';
      loginError.style.display = 'block';
      return;
    }

    loginError.style.display = 'none';

    chrome.runtime.sendMessage({ type: 'LOGIN', payload: { email, password } }, (res) => {
      if (!res?.ok) {
        loginError.textContent  = res?.error || 'Login failed';
        loginError.style.display = 'block';
        return;
      }
      showMain({ userId: res.userId, userName: res.userName });
    });
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => showLogin());
  });

  // ── Load settings and cart (runs when main view shows) ────────────────────
  function loadSettings() {
    chrome.storage.local.get(['hourlyWage', 'lastCart', 'disabledUntil', 'permanentDisable'], (r) => {
      document.getElementById('wage').value = r.hourlyWage || 20;
      showLastCart(r.lastCart);

      const resultEl   = document.getElementById('result');
      const disableBtn = document.getElementById('disableBtn');

      if (r.permanentDisable) {
        resultEl.textContent    = 'Disabled until re-enabled';
        disableBtn.textContent  = 'Enable ▾';
      } else if (r.disabledUntil && Date.now() < r.disabledUntil) {
        const remaining = Math.ceil((r.disabledUntil - Date.now()) / 3600000);
        resultEl.textContent   = `Disabled for ~${remaining} more hour${remaining > 1 ? 's' : ''}`;
        disableBtn.textContent = 'Enable ▾';
      }
    });
  }

  // ── Hourly wage ───────────────────────────────────────────────────────────
  document.getElementById('wage').addEventListener('change', (e) => {
    chrome.storage.local.set({ hourlyWage: Number(e.target.value) });
  });

  // ── Dashboard button ──────────────────────────────────────────────────────
  document.getElementById('wait').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3001' });
  });

  // ── Resume purchase ───────────────────────────────────────────────────────
  document.getElementById('resume').addEventListener('click', () => {
    chrome.storage.local.get('lastCart', (r) => {
      if (r.lastCart?.url) chrome.tabs.create({ url: r.lastCart.url });
    });
  });

  // ── Disable dropdown ──────────────────────────────────────────────────────
  document.getElementById('disableBtn').addEventListener('click', () => {
    document.getElementById('disableMenu').classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.disable-wrapper')) {
      document.getElementById('disableMenu')?.classList.add('hidden');
    }
  });

  document.querySelectorAll('.disable-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const hours     = parseInt(btn.dataset.hours);
      const permanent = hours === 0;
      const disabledUntil = permanent ? null : Date.now() + hours * 3600000;

      chrome.storage.local.set({ disabledUntil, permanentDisable: permanent }, () => {
        document.getElementById('disableMenu').classList.add('hidden');
        document.getElementById('result').textContent = permanent
          ? 'Disabled until re-enabled'
          : `Disabled for ${hours} hour${hours > 1 ? 's' : ''}`;
        document.getElementById('disableBtn').textContent = 'Enable ▾';
      });
    });
  });

  // ── Last cart display ─────────────────────────────────────────────────────
  function showLastCart(cart) {
    const lastDiv = document.getElementById('last');
    if (!cart) { lastDiv.textContent = 'No purchase detected yet.'; return; }

    chrome.storage.local.get('hourlyWage', (r) => {
      const wage  = r.hourlyWage || 20;
      const price = parseFloat((cart.priceText || '').replace(/[^0-9.]/g, '')) || 0;
      const hours = price > 0 ? (price / wage).toFixed(2) : '?';

      lastDiv.innerHTML = `
        <div><strong>${cart.title || '(no title)'}</strong></div>
        <div>${cart.priceText || 'unknown price'} — ${hours} hrs of work</div>
        <div><small>${cart.url || ''}</small></div>
      `;
    });
  }

  // ── Listen for analysis results from background ───────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ANALYSIS_RESULT' && msg.payload?.cart) {
      showLastCart(msg.payload.cart);
    }
  });

});