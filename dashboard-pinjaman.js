(() => {
  'use strict';

  const BUILD_VERSION = '20260806-1750';
  window.__DASHBOARD_BUILD__ = BUILD_VERSION;
  const LEGACY_KEY = 'pinjamanDemoDataV1';
  const FORM_ROUTE = './form-pinjaman.html';
  const LOGIN_ROUTE = './index.html';

  const byId = id => document.getElementById(id);
  const setText = (id, value) => {
    const node = byId(id);
    if (node) node.textContent = String(value ?? '');
  };

  const readJson = key => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const readLegacyValue = (key, fallback = '') => {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  };

  const toNumber = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currency = value => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(toNumber(value));

  const dateLabel = date => new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date).replace('.', '');

  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  const getInitials = name => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('') || 'N';
  };

  const maskAccount = value => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 11 ? `•••••••${digits.slice(-4)}` : '•••••••----';
  };

  const readProjectData = () => {
    const application = window.NovaStorage?.getApplication?.() || {};
    const identity = window.NovaStorage?.getIdentity?.() || {};
    const legacyObject = readJson(LEGACY_KEY);
    const loan = application.loan || {};

    const fullName =
      identity.fullName ||
      readLegacyValue('userNama') ||
      readLegacyValue('fullName') ||
      readLegacyValue('namaLengkap') ||
      'Nasabah';

    const purpose =
      loan.purpose ||
      application.loanPurpose ||
      legacyObject.loanPurpose ||
      readLegacyValue('loanPurpose');

    const purposeOther =
      application.loanPurposeOther ||
      legacyObject.loanPurposeOther ||
      readLegacyValue('loanPurposeOther');

    const amount = toNumber(
      loan.amount ||
      application.loanAmount ||
      legacyObject.loanAmount ||
      readLegacyValue('loanAmount')
    );

    const tenor = toNumber(
      loan.tenor ||
      application.loanTenor ||
      application.tenor ||
      legacyObject.loanTenor ||
      readLegacyValue('loanTenor')
    );

    const monthly = toNumber(
      loan.monthlyInstallment ||
      application.estimatedInstallment ||
      legacyObject.estimatedInstallment ||
      readLegacyValue('estimatedInstallment')
    );

    const total = toNumber(
      loan.totalPayment ||
      application.estimatedTotal ||
      legacyObject.estimatedTotal ||
      readLegacyValue('estimatedTotal')
    );

    const account =
      application.disbursementAccount ||
      application.bankAccount ||
      legacyObject.disbursementAccount ||
      readLegacyValue('disbursementAccount');

    const completed =
      application.currentStep === 'LOAN_FORM_COMPLETED' ||
      application.status === 'LOAN_FORM_COMPLETED' ||
      application.loanFormCompleted === true ||
      legacyObject.loanFormCompleted === true ||
      readLegacyValue('loanFormCompleted') === 'true' ||
      Boolean(amount && tenor && account);

    return {
      fullName,
      purpose,
      purposeOther,
      amount,
      tenor,
      monthly,
      total,
      account,
      completed
    };
  };

  const data = readProjectData();
  const routeGuard = byId('routeGuard');
  const dashboardApp = byId('dashboardApp');
  const session = window.NovaStorage?.getSession?.();
  const identity = window.NovaStorage?.getIdentity?.();
  const application = window.NovaStorage?.getApplication?.() || {};
  const hasIdentity = Boolean(identity?.fullName && /^\d{16}$/.test(identity?.nik || ''));
  const hasLoan = Boolean(data.amount > 0 && data.tenor > 0);

  if (!session) {
    window.location.replace(LOGIN_ROUTE);
    return;
  }

  if (!hasIdentity) {
    window.location.replace('./form-nik.html');
    return;
  }

  if (!hasLoan) {
    window.location.replace(FORM_ROUTE);
    return;
  }

  if (!application.resultAvailable && application.currentStep !== 'RESULT_AVAILABLE') {
    window.location.replace('./ringkasan-pengajuan.html');
    return;
  }

  if (routeGuard) routeGuard.hidden = true;
  if (dashboardApp) dashboardApp.hidden = false;

  // Normalisasi data lama ke struktur aplikasi utama agar halaman berikutnya
  // selalu membaca sumber data yang sama.
  if (application.currentStep === 'DOCUMENTS_COMPLETED' || !application.loanFormCompleted) {
    window.NovaStorage?.setApplication?.({
      currentStep: 'LOAN_FORM_COMPLETED',
      status: 'LOAN_FORM_COMPLETED',
      loanFormCompleted: true,
      limit: data.amount,
      disbursementAccount: data.account,
      bankAccount: data.account
    });
  }

  const displayPurpose = data.purpose === 'Kebutuhan Lainnya'
    ? (data.purposeOther || data.purpose)
    : (data.purpose || 'Kebutuhan pinjaman');

  const totalPayment = data.total || Math.round(data.amount * 1.12);
  const monthlyPayment = data.monthly || (data.tenor ? Math.ceil(totalPayment / data.tenor) : 0);
  const usedAmount = Math.min(data.amount, Math.max(0, monthlyPayment));
  const availableAmount = Math.max(0, data.amount - usedAmount);
  const usagePercent = data.amount
    ? Math.min(100, Math.round((usedAmount / data.amount) * 100))
    : 0;

  const initials = getInitials(data.fullName);
  setText('welcomeName', data.fullName);
  setText('profileName', data.fullName);
  setText('profileAvatar', initials);

  setText('limitAmount', currency(data.amount));
  setText('usedAmount', currency(usedAmount));
  setText('availableAmount', currency(availableAmount));
  setText('usagePercent', `${usagePercent}%`);

  const progress = byId('limitProgress');
  if (progress) progress.style.width = `${usagePercent}%`;

  setText('totalPayment', currency(totalPayment));
  setText('principalCaption', `Dari ${currency(data.amount)}`);
  setText('remainingPayment', currency(totalPayment));
  setText('remainingCaption', '100% dari total');
  setText('monthlyPayment', currency(monthlyPayment));
  setText('tenorCaption', `Tenor ${data.tenor || '-'} bulan`);

  const accountInput = byId('dashboardAccountInput');
  const accountMessage = byId('dashboardAccountMessage');
  const accountBadge = byId('accountValidityBadge');
  const transferButton = byId('transferButton');

  const normalizeAccount = value => String(value || '').replace(/\D/g, '').slice(0, 11);
  const isValidAccount = value => /^\d{11}$/.test(value);

  const persistAccount = account => {
    const legacyObject = readJson(LEGACY_KEY);
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      ...legacyObject,
      disbursementAccount: account
    }));
    localStorage.setItem('disbursementAccount', account);

    window.NovaStorage?.setApplication?.({
      disbursementAccount: account,
      bankAccount: account
    });
  };

  const renderAccountState = value => {
    const account = normalizeAccount(value);
    const valid = isValidAccount(account);
    const masked = maskAccount(account);

    if (accountInput && accountInput.value !== account) accountInput.value = account;
    setText('maskedAccount', masked);
    setText('modalAccount', masked);
    setText('modalAmount', currency(data.amount));

    if (accountBadge) {
      accountBadge.textContent = valid ? '✓ Format 11 digit' : 'Belum valid';
      accountBadge.classList.toggle('is-valid', valid);
    }

    if (accountMessage) {
      accountMessage.textContent = valid
        ? 'Nomor rekening KB Bank siap digunakan untuk proses berikutnya.'
        : 'Nomor rekening harus terdiri dari tepat 11 digit angka.';
      accountMessage.classList.toggle('is-success', valid);
      accountMessage.classList.toggle('is-error', account.length > 0 && !valid);
    }

    if (transferButton) transferButton.disabled = !valid;
    return valid;
  };

  const initialAccount = normalizeAccount(data.account);
  renderAccountState(initialAccount);

  accountInput?.addEventListener('input', event => {
    const normalized = normalizeAccount(event.target.value);
    event.target.value = normalized;
    renderAccountState(normalized);
    if (isValidAccount(normalized)) persistAccount(normalized);
  });

  accountInput?.addEventListener('blur', event => {
    const normalized = normalizeAccount(event.target.value);
    if (!isValidAccount(normalized) && normalized.length > 0) {
      accountMessage?.classList.add('is-error');
    }
  });

  const today = new Date();
  const nextDue = addMonths(
    new Date(today.getFullYear(), today.getMonth(), 5),
    today.getDate() > 5 ? 1 : 0
  );
  setText('nextDueDate', dateLabel(nextDue));
  setText('daysUntilDue', `${Math.max(0, Math.ceil((nextDue - today) / 86400000))} hari lagi`);
  setText('dateApplication', dateLabel(today));
  setText('dateDocuments', dateLabel(today));
  setText('dateVerification', dateLabel(addMonths(today, 0)));
  setText('dateApproval', dateLabel(addMonths(today, 0)));

  const scheduleBody = byId('scheduleBody');
  if (scheduleBody) {
    scheduleBody.replaceChildren();
    const displayedRows = Math.min(data.tenor || 6, 6);
    const totalInterest = Math.max(0, totalPayment - data.amount);
    const monthlyInterest = displayedRows ? Math.round(totalInterest / (data.tenor || displayedRows)) : 0;
    let remainingPrincipal = data.amount;

    for (let index = 1; index <= displayedRows; index += 1) {
      const principal = index === displayedRows
        ? remainingPrincipal
        : Math.min(remainingPrincipal, Math.max(0, monthlyPayment - monthlyInterest));

      remainingPrincipal = Math.max(0, remainingPrincipal - principal);

      const row = document.createElement('tr');
      [
        index,
        dateLabel(addMonths(nextDue, index - 1)),
        currency(monthlyPayment),
        currency(principal),
        currency(monthlyInterest),
        currency(remainingPrincipal)
      ].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      });

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'schedule-status';
      badge.textContent = 'Akan Datang';
      statusCell.append(badge);
      row.append(statusCell);
      scheduleBody.append(row);
    }
  }

  // Drawer mobile: satu listener per elemen.
  const sidebar = byId('sidebar');
  const backdrop = byId('drawerBackdrop');
  const menuButton = byId('menuButton');

  const setDrawerOpen = open => {
    sidebar?.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    menuButton?.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('drawer-open', open);
  };

  const closeDrawer = () => setDrawerOpen(false);

  menuButton?.addEventListener('click', () => {
    const willOpen = !sidebar?.classList.contains('is-open');
    setDrawerOpen(willOpen);
  });

  backdrop?.addEventListener('click', closeDrawer);
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });


  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar?.classList.contains('is-open')) {
      closeDrawer();
      menuButton?.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && sidebar?.classList.contains('is-open')) closeDrawer();
  }, { passive: true });

  // Toast.
  let toastTimer = 0;
  const showToast = message => {
    const toast = byId('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  };

  document.querySelectorAll('[data-toast]').forEach(button => {
    button.addEventListener('click', () => showToast(button.dataset.toast || ''));
  });

  const DASHBOARD_SESSION_LIMIT_MS = 60 * 1000;
  let dashboardSessionTimer = 0;

  const endDashboardSession = () => {
    window.clearTimeout(dashboardSessionTimer);
    sessionStorage.setItem('kbDashboardReauth', '1');
    window.NovaStorage?.clearSession?.();
    window.location.replace(LOGIN_ROUTE);
  };

  // Batas sesi khusus dashboard: 1 menit sejak halaman dashboard berhasil dibuka.
  // Data pengajuan tetap tersimpan; hanya sesi login yang diakhiri.
  dashboardSessionTimer = window.setTimeout(endDashboardSession, DASHBOARD_SESSION_LIMIT_MS);

  byId('logoutButton')?.addEventListener('click', () => {
    endDashboardSession();
  });

  // Modal status rekening — prototipe UI; tidak menjalankan transaksi nyata.
  const modal = byId('transferModal');
  const loadingLayer = byId('transferLoading');
  const loadingText = byId('transferLoadingText');
  const modalCloseButton = byId('modalCloseButton');
  const modalCancelButton = byId('modalCancelButton');
  const modalContinueButton = byId('modalContinueButton');
  let lastFocused = null;
  let transferBusy = false;
  let loadingTimerOne = 0;
  let loadingTimerTwo = 0;

  const resetLoadingTimers = () => {
    window.clearTimeout(loadingTimerOne);
    window.clearTimeout(loadingTimerTwo);
  };

  const closeModal = () => {
    if (!modal || transferBusy) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  const showDormantModal = () => {
    if (!modal) return;
    if (loadingLayer) loadingLayer.hidden = true;
    modal.hidden = false;
    modalCloseButton?.focus();
  };

  // Tombol card Dormant membuka notifikasi aktivasi rekening.
  document.getElementById('dormantStatusButton')?.addEventListener('click', () => {
    showDormantModal();
  });

  const beginAccountCheck = () => {
    if (!accountInput || !isValidAccount(accountInput.value)) {
      accountInput?.focus();
      showToast('Masukkan nomor rekening KB Bank yang valid, tepat 11 digit.');
      return;
    }

    lastFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    if (loadingLayer) loadingLayer.hidden = false;
    if (loadingText) loadingText.textContent = 'Memvalidasi nomor rekening tujuan…';

    resetLoadingTimers();
    loadingTimerOne = window.setTimeout(() => {
      if (loadingText) loadingText.textContent = 'Memeriksa status layanan rekening…';
    }, 700);
    loadingTimerTwo = window.setTimeout(showDormantModal, 1650);
  };

  transferButton?.addEventListener('click', beginAccountCheck);
  modalCloseButton?.addEventListener('click', closeModal);
  modalCancelButton?.addEventListener('click', closeModal);
  modal?.querySelector('[data-close-modal]')?.addEventListener('click', closeModal);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (loadingLayer && !loadingLayer.hidden) {
        resetLoadingTimers();
        loadingLayer.hidden = true;
        document.body.style.overflow = '';
        lastFocused?.focus();
      } else if (modal && !modal.hidden) {
        closeModal();
      }
    }
  });

  modalContinueButton?.addEventListener('click', async () => {
    if (transferBusy) return;
    transferBusy = true;
    modalContinueButton.disabled = true;
    modalContinueButton.innerHTML = '<span aria-hidden="true">🔒</span> Menyiapkan Informasi…';

    await new Promise(resolve => window.setTimeout(resolve, 750));

    showToast('Simulasi UI: aktivasi rekening dan transaksi nyata tidak dijalankan.');
    modalContinueButton.innerHTML = '<span aria-hidden="true">🔒</span> Lanjutkan Aktivasi';
    modalContinueButton.disabled = false;
    transferBusy = false;
  });


  // Stage 2: notification center and profile UI.
  // UI-only enhancement: reads existing NovaStorage data without adding or changing storage keys.
  const notificationPanel = byId('notificationPanel');
  const notificationButton = byId('notificationButton');
  const openNotificationsSide = byId('openNotificationsSide');
  const closeNotificationsButton = byId('closeNotifications');
  const markNotificationsRead = byId('markNotificationsRead');
  const notificationCount = byId('notificationCount');

  const setNotificationOpen = open => {
    if (!notificationPanel) return;
    notificationPanel.hidden = !open;
    notificationButton?.setAttribute('aria-expanded', String(open));
    openNotificationsSide?.setAttribute('aria-expanded', String(open));
    if (open) {
      closeDrawer();
      closeNotificationsButton?.focus();
    }
  };

  const toggleNotifications = event => {
    event?.stopPropagation?.();
    setNotificationOpen(Boolean(notificationPanel?.hidden));
  };

  notificationButton?.addEventListener('click', toggleNotifications);
  openNotificationsSide?.addEventListener('click', toggleNotifications);
  closeNotificationsButton?.addEventListener('click', () => setNotificationOpen(false));
  markNotificationsRead?.addEventListener('click', () => {
    notificationPanel?.classList.add('is-read');
    if (notificationCount) notificationCount.hidden = true;
    markNotificationsRead.textContent = 'Semua Notifikasi Telah Dibaca';
    markNotificationsRead.disabled = true;
    showToast('Semua notifikasi ditandai telah dibaca.');
  });

  document.addEventListener('click', event => {
    if (!notificationPanel || notificationPanel.hidden) return;
    if (notificationPanel.contains(event.target) || notificationButton?.contains(event.target)) return;
    setNotificationOpen(false);
  });

  const profileModal = byId('profileModal');
  const profileButton = byId('profileButton');
  const openProfileSide = byId('openProfileSide');
  const profileModalClose = byId('profileModalClose');
  const profileModalDone = byId('profileModalDone');
  let profileLastFocused = null;

  const openProfile = () => {
    if (!profileModal) return;
    profileLastFocused = document.activeElement;
    setNotificationOpen(false);
    closeDrawer();

    const sessionLabel = session?.email || session?.username || session?.identity || '-';
    const identityNik = identity?.nik || '';
    const statusLabel = application?.resultAvailable ? 'Pengajuan Diproses' : 'Dalam Tahapan Pengajuan';

    setText('profileModalAvatar', initials);
    setText('profileModalName', data.fullName || '-');
    setText('profileModalNik', window.NovaStorage?.maskNik?.(identityNik) || 'NIK belum tersedia');
    setText('profileModalEmail', sessionLabel);
    setText('profileModalStatus', statusLabel);
    setText('profileModalLoan', currency(data.amount));

    profileModal.hidden = false;
    document.body.style.overflow = 'hidden';
    profileModalClose?.focus();
  };

  const closeProfile = () => {
    if (!profileModal) return;
    profileModal.hidden = true;
    document.body.style.overflow = '';
    profileLastFocused?.focus?.();
  };

  profileButton?.addEventListener('click', openProfile);
  openProfileSide?.addEventListener('click', openProfile);
  profileModalClose?.addEventListener('click', closeProfile);
  profileModalDone?.addEventListener('click', closeProfile);
  profileModal?.querySelector('[data-close-profile]')?.addEventListener('click', closeProfile);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (profileModal && !profileModal.hidden) {
      closeProfile();
    } else if (notificationPanel && !notificationPanel.hidden) {
      setNotificationOpen(false);
      notificationButton?.focus();
    }
  });
})();
