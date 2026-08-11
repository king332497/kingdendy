const { requireAdmin, requireCsrf, db, setSecurityHeaders } = require('./_admin-common');
const SAFE = new Set(['','form-nik.html','upload-dokumen.html','form-pinjaman.html','ringkasan-pengajuan.html','proses-pengajuan.html','hasil-pengajuan.html','dashboard-pinjaman.html']);
module.exports = async (req,res) => {
  setSecurityHeaders(res);
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).end(); }
  const admin = requireAdmin(req,res); if (!admin || !requireCsrf(req,res)) return;
  const userKey = String(req.body?.userKey || '');
  const targetPage = String(req.body?.targetPage || '');
  if (!userKey || /[.#$\[\]]/.test(userKey) || !SAFE.has(targetPage)) return res.status(400).json({ok:false,error:'INVALID_TARGET'});
  try {
    await db(`users/${userKey}/targetPage`, {method:'PUT',body:JSON.stringify(targetPage || null)});
    await db(`adminAudit/${Date.now()}`, {method:'PUT',body:JSON.stringify({action:'SET_TARGET',userKey,targetPage:targetPage||null,at:new Date().toISOString()})});
    return res.status(200).json({ok:true});
  } catch { return res.status(500).json({ok:false,error:'TARGET_WRITE_FAILED'}); }
};
