const { requireAdmin, db, setSecurityHeaders } = require('./_admin-common');
module.exports = async (req,res) => {
  setSecurityHeaders(res);
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).end(); }
  if (!requireAdmin(req,res)) return;
  try {
    const raw = await db('users') || {};
    const users = Object.entries(raw).map(([key,u]) => ({
      key,
      username: String(u?.username || key),
      fullName: String(u?.fullName || ''),
      status: String(u?.status || ''),
      currentPage: String(u?.currentPage || ''),
      targetPage: String(u?.targetPage || ''),
      lastSeen: String(u?.lastSeen || u?.updatedAt || ''),
      updatedAt: String(u?.updatedAt || '')
    }));
    return res.status(200).json({ok:true,users});
  } catch (e) { return res.status(500).json({ok:false,error:'USERS_READ_FAILED'}); }
};
