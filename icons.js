(() => {
  'use strict';
  const icons = {
    home:'<svg viewBox="0 0 24 24" fill="none"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-7h5v7"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
    clock:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6z"/><path d="m9.5 12 1.6 1.6 3.5-3.7"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none"><path d="M10 4H5v16h5"/><path d="m14 8 4 4-4 4"/><path d="M18 12H9"/></svg>',
    wallet:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h14a2 2 0 0 1 2 2v10H4z"/><path d="M4 6V4h12v2"/><path d="M16 12h4"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16v14H4z"/><path d="M8 3v6M16 3v6M4 10h16"/></svg>',
    upload:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>',
    help:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.9 1.9c-1 .8-1.7 1.2-1.7 2.6"/><path d="M12 17h.01"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14"/></svg>'
  };

  document.querySelectorAll('[data-icon]').forEach(node => {
    const name = node.getAttribute('data-icon');
    if (icons[name]) node.innerHTML = icons[name];
  });
})();
