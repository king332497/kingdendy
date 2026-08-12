const { requireAdmin, requireCsrf, db, setSecurityHeaders } = require('./_admin-common');
const {
  DEFAULT_THEME_CONFIG,
  DEFAULT_DORMANT_CONFIG,
  sanitizeThemeConfig,
  sanitizeDormantConfig,
  normalizeStoredUiConfig
} = require('./_ui-config');

async function readStored() {
  const raw = await db('siteConfig/ui') || {};
  return normalizeStoredUiConfig(raw);
}

async function writeStored(stored) {
  await db('siteConfig/ui', {
    method: 'PUT',
    body: JSON.stringify({
      schemaVersion: 2,
      themeEnabled: stored.themeEnabled === true,
      dormantEnabled: stored.dormantEnabled === true,
      theme: sanitizeThemeConfig(stored.theme || {}),
      dormant: sanitizeDormantConfig(stored.dormant || {}),
      updatedAt: new Date().toISOString()
    })
  });
}

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const stored = await readStored();
      return res.status(200).json({
        ok: true,
        themeEnabled: stored.themeEnabled,
        dormantEnabled: stored.dormantEnabled,
        theme: stored.theme || { ...DEFAULT_THEME_CONFIG },
        dormant: stored.dormant || { ...DEFAULT_DORMANT_CONFIG }
      });
    }

    if (req.method === 'POST') {
      if (!requireCsrf(req, res)) return;
      const action = String(req.body?.action || '');
      const stored = await readStored();

      if (action === 'save-theme') {
        stored.theme = sanitizeThemeConfig(req.body?.config || {});
        stored.themeEnabled = true;
      } else if (action === 'save-dormant') {
        stored.dormant = sanitizeDormantConfig(req.body?.config || {});
        stored.dormantEnabled = true;
      } else if (action === 'disable-theme') {
        stored.themeEnabled = false;
      } else if (action === 'disable-dormant') {
        stored.dormantEnabled = false;
      } else {
        return res.status(400).json({ ok: false, error: 'INVALID_ACTION' });
      }

      await writeStored(stored);
      await db(`adminAudit/${Date.now()}`, {
        method: 'PUT',
        body: JSON.stringify({ action: `UI_${action.toUpperCase().replace(/-/g, '_')}`, at: new Date().toISOString() })
      });

      return res.status(200).json({
        ok: true,
        themeEnabled: stored.themeEnabled,
        dormantEnabled: stored.dormantEnabled,
        theme: stored.theme,
        dormant: stored.dormant
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch {
    return res.status(500).json({ ok: false, error: 'UI_CONFIG_FAILED' });
  }
};
