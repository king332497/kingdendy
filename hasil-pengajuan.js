(() => {
  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireResult()) return;

  const app = NovaStorage.getApplication();
  const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);

  document.getElementById('resultTitle').textContent = app.result.title;
  document.getElementById('resultMessage').textContent = app.result.message;
  document.getElementById('applicationId').textContent = app.applicationId;
  document.getElementById('status').textContent = app.result.status === 'APPROVED_DEMO' ? 'Disetujui — Data Demonstrasi' : app.result.status;
  document.getElementById('amount').textContent = rupiah(app.result.approvedAmount);
  document.getElementById('tenor').textContent = app.loan.tenor + ' Bulan';

  document.getElementById('dashboardButton').addEventListener('click', () => location.replace('dashboard-pinjaman.html'));
  document.getElementById('backButton').style.visibility = 'hidden';
})();
