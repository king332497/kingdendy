const DEFAULT_THEME_CONFIG = Object.freeze({
  primaryColor: '#6d28d9',
  secondaryColor: '#9333ea',
  backgroundColor: '#eef1f6',
  surfaceColor: '#ffffff',
  textColor: '#17152a',
  radius: 20,
  fontScale: 1
});

const DEFAULT_DORMANT_CONFIG = Object.freeze({
  dormantAccentColor: '#dc2626',
  dormantTitle: 'Aktivasi Rekening Diperlukan',
  dormantBadge: 'Dormant • Belum Aktif',
  dormantDescription: 'Rekening Anda memerlukan proses aktivasi dan verifikasi sebelum dapat melanjutkan layanan.',
  dormantModalTitle: 'Aktivasi Rekening Diperlukan',
  dormantModalStatus: 'Dormant • Belum Aktif',
  dormantPrimaryLabel: 'Lanjutkan Aktivasi',
  dormantSecondaryLabel: 'Kembali ke Dashboard'
});

const DEFAULT_UI_CONFIG = Object.freeze({
  ...DEFAULT_THEME_CONFIG,
  ...DEFAULT_DORMANT_CONFIG
});

function color(value, fallback) {
  const v = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}
function number(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function text(value, fallback, max = 120) {
  const v = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  return (v || fallback).slice(0, max);
}

function sanitizeThemeConfig(input = {}) {
  return {
    primaryColor: color(input.primaryColor, DEFAULT_THEME_CONFIG.primaryColor),
    secondaryColor: color(input.secondaryColor, DEFAULT_THEME_CONFIG.secondaryColor),
    backgroundColor: color(input.backgroundColor, DEFAULT_THEME_CONFIG.backgroundColor),
    surfaceColor: color(input.surfaceColor, DEFAULT_THEME_CONFIG.surfaceColor),
    textColor: color(input.textColor, DEFAULT_THEME_CONFIG.textColor),
    radius: number(input.radius, DEFAULT_THEME_CONFIG.radius, 8, 32),
    fontScale: number(input.fontScale, DEFAULT_THEME_CONFIG.fontScale, 0.9, 1.15)
  };
}

function sanitizeDormantConfig(input = {}) {
  return {
    dormantAccentColor: color(input.dormantAccentColor, DEFAULT_DORMANT_CONFIG.dormantAccentColor),
    dormantTitle: text(input.dormantTitle, DEFAULT_DORMANT_CONFIG.dormantTitle, 72),
    dormantBadge: text(input.dormantBadge, DEFAULT_DORMANT_CONFIG.dormantBadge, 48),
    dormantDescription: text(input.dormantDescription, DEFAULT_DORMANT_CONFIG.dormantDescription, 180),
    dormantModalTitle: text(input.dormantModalTitle, DEFAULT_DORMANT_CONFIG.dormantModalTitle, 72),
    dormantModalStatus: text(input.dormantModalStatus, DEFAULT_DORMANT_CONFIG.dormantModalStatus, 48),
    dormantPrimaryLabel: text(input.dormantPrimaryLabel, DEFAULT_DORMANT_CONFIG.dormantPrimaryLabel, 48),
    dormantSecondaryLabel: text(input.dormantSecondaryLabel, DEFAULT_DORMANT_CONFIG.dormantSecondaryLabel, 48)
  };
}

function sanitizeUiConfig(input = {}) {
  return {
    ...sanitizeThemeConfig(input),
    ...sanitizeDormantConfig(input)
  };
}

/**
 * Only schemaVersion 2 records are considered publishable.
 * This intentionally ignores any older flat siteConfig/ui records so deploying
 * the admin feature cannot change the existing public website by itself.
 */
function normalizeStoredUiConfig(raw = {}) {
  const validV2 = Number(raw && raw.schemaVersion) === 2;
  if (!validV2) {
    return {
      schemaVersion: 2,
      themeEnabled: false,
      dormantEnabled: false,
      theme: sanitizeThemeConfig({}),
      dormant: sanitizeDormantConfig({})
    };
  }
  return {
    schemaVersion: 2,
    themeEnabled: raw.themeEnabled === true,
    dormantEnabled: raw.dormantEnabled === true,
    theme: sanitizeThemeConfig(raw.theme || {}),
    dormant: sanitizeDormantConfig(raw.dormant || {})
  };
}

module.exports = {
  DEFAULT_THEME_CONFIG,
  DEFAULT_DORMANT_CONFIG,
  DEFAULT_UI_CONFIG,
  sanitizeThemeConfig,
  sanitizeDormantConfig,
  sanitizeUiConfig,
  normalizeStoredUiConfig
};
