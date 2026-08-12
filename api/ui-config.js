const { db } = require('./_admin-common');
const { normalizeStoredUiConfig } = require('./_ui-config');

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  try {
    const raw = await db('siteConfig/ui') || {};
    const stored = normalizeStoredUiConfig(raw);
    return res.status(200).json({
      ok: true,
      theme: { enabled: stored.themeEnabled, config: stored.themeEnabled ? stored.theme : null },
      dormant: { enabled: stored.dormantEnabled, config: stored.dormantEnabled ? stored.dormant : null }
    });
  } catch {
    // Fail closed for appearance overrides: if config cannot be read, do not
    // alter the current public website at all.
    return res.status(200).json({
      ok: true,
      theme: { enabled: false, config: null },
      dormant: { enabled: false, config: null }
    });
  }
};
