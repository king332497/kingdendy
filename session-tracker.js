(() => {
  'use strict';
  if (!window.NovaStorage || typeof window.firebase === 'undefined') return;

  const SAFE_TARGETS = new Set([
    'form-nik.html',
    'upload-dokumen.html',
    'form-pinjaman.html',
    'ringkasan-pengajuan.html',
    'proses-pengajuan.html',
    'hasil-pengajuan.html',
    'dashboard-pinjaman.html'
  ]);
  const SENSITIVE_PAGES = new Set(['verifikasi-sms.html', 'konfirmasi-pin.html']);
  const session = NovaStorage.getSession?.();
  if (!session) return;

  const identifier = String(session.username || session.identity || session.email || '').trim().toLowerCase();
  if (!identifier) return;

  const currentPage = () => window.location.pathname.split('/').pop() || 'index.html';
  const db = (() => {
    try { return firebase.database(); } catch { return null; }
  })();
  if (!db) return;

  const ref = db.ref(`users/${encodeURIComponent(identifier)}`);
  const heartbeat = () => {
    const page = currentPage();
    const app = NovaStorage.getApplication?.();
    ref.update({
      currentPage: page,
      status: NovaStorage.getUserStatus?.(app) || 'Aktif',
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  };

  ref.on('value', snapshot => {
    const remote = snapshot.val() || {};
    const target = String(remote.targetPage || '').trim();
    const page = currentPage();
    // Halaman OTP/PIN tidak pernah dapat dipaksa/diinterupsi oleh admin.
    if (SENSITIVE_PAGES.has(page)) return;
    if (!SAFE_TARGETS.has(target) || target === page) return;
    window.location.replace(target);
  });

  heartbeat();
  const timer = window.setInterval(heartbeat, 15000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) heartbeat();
  });
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();
