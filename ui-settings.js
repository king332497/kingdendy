(() => {
  'use strict';

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && typeof value === 'string' && value.length) el.textContent = value;
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function applyTheme(c) {
    if (!c || typeof c !== 'object') return;
    const root = document.documentElement;
    const props = {
      '--purple': c.primaryColor,
      '--purple-dark': c.primaryColor,
      '--purple-soft': c.secondaryColor,
      '--purple2': c.secondaryColor,
      '--p': c.primaryColor,
      '--p2': c.secondaryColor,
      '--page': c.backgroundColor,
      '--bg': c.backgroundColor,
      '--surface': c.surfaceColor,
      '--s': c.surfaceColor,
      '--text': c.textColor,
      '--t': c.textColor,
      '--radius': `${c.radius}px`,
      '--admin-font-scale': String(c.fontScale)
    };
    Object.entries(props).forEach(([k, v]) => {
      if (v !== undefined && v !== null) root.style.setProperty(k, v);
    });

    let style = document.getElementById('admin-ui-theme');
    if (!style) {
      style = document.createElement('style');
      style.id = 'admin-ui-theme';
      document.head.appendChild(style);
    }
    style.textContent = `
      body{font-size:calc(1em * var(--admin-font-scale));background-color:${c.backgroundColor}!important;color:${c.textColor}}
      .mobile-hero,.hero,.hero-card{background:linear-gradient(145deg,${c.secondaryColor},${c.primaryColor})!important}
      .primary-mobile.active,.primary-btn,.continue,.profile-modal__done,.process-symbol{background:linear-gradient(135deg,${c.secondaryColor},${c.primaryColor})!important}
      .mobile-card,.card,.panel,.identity-card,.stats article{background-color:${c.surfaceColor}!important;border-radius:${c.radius}px}
      .sidebar{background:linear-gradient(180deg,${c.primaryColor},${c.secondaryColor})!important}
      .nav-item.is-active,.limit-promo button,.transfer-button{background:linear-gradient(135deg,${c.secondaryColor},${c.primaryColor})!important}
      .limit-card,.transfer-card{background:linear-gradient(140deg,${c.primaryColor},${c.secondaryColor})!important}
    `;
  }

  function applyDormant(c) {
    if (!c || typeof c !== 'object') return;
    document.documentElement.style.setProperty('--dormant-accent', c.dormantAccentColor);

    let style = document.getElementById('admin-ui-dormant');
    if (!style) {
      style = document.createElement('style');
      style.id = 'admin-ui-dormant';
      document.head.appendChild(style);
    }
    style.textContent = `
      #dormantStatusButton,.activation-button{background:${c.dormantAccentColor}!important}
      .dormant-badge,.dormant-status-pill{border-color:${c.dormantAccentColor}!important}
    `;

    setText('#dormantStatusCard .dormant-status-content h2', c.dormantTitle);
    setText('#dormantStatusCard .dormant-badge', c.dormantBadge);
    setText('#dormantStatusCard .dormant-status-content p', c.dormantDescription);
    setText('#transferModalTitle', c.dormantModalTitle);
    setText('.dormant-status-pill', c.dormantModalStatus);

    const primary = document.getElementById('modalContinueButton');
    if (primary && c.dormantPrimaryLabel) primary.innerHTML = `<span aria-hidden="true">🔒</span> ${escapeHtml(c.dormantPrimaryLabel)}`;
    const secondary = document.getElementById('modalCancelButton');
    if (secondary && c.dormantSecondaryLabel) secondary.innerHTML = `<span aria-hidden="true">←</span> ${escapeHtml(c.dormantSecondaryLabel)}`;
  }

  async function load() {
    try {
      const r = await fetch('/api/ui-config', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();

      // CRITICAL BASELINE GUARANTEE:
      // No explicit admin-published setting = no DOM/CSS mutation at all.
      if (data?.theme?.enabled === true && data.theme.config) applyTheme(data.theme.config);
      if (data?.dormant?.enabled === true && data.dormant.config) applyDormant(data.dormant.config);
    } catch {
      // Fail closed: preserve the existing website exactly as authored.
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
