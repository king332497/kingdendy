const { crypto, COOKIE, CSRF_COOKIE, SESSION_TTL, sign, requireAdmin, verifyPassword, setSecurityHeaders } = require('./_admin-common');

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    const session = requireAdmin(req, res); if (!session) return;
    return res.status(200).json({ok:true, admin:{name:'Administrator'}});
  }
  if (req.method === 'POST') {
    const password = String(req.body?.password || '');
    if (!verifyPassword(password)) return res.status(401).json({ok:false,error:'LOGIN_INVALID'});
    const now = Math.floor(Date.now()/1000);
    const token = sign({role:'admin',iat:now,exp:now+SESSION_TTL});
    const csrf = crypto.randomBytes(24).toString('base64url');
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL}${secure}`,
      `${CSRF_COOKIE}=${encodeURIComponent(csrf)}; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL}${secure}`
    ]);
    return res.status(200).json({ok:true, csrf});
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`, `${CSRF_COOKIE}=; Path=/; SameSite=Strict; Max-Age=0`]);
    return res.status(200).json({ok:true});
  }
  res.setHeader('Allow','GET, POST, DELETE'); return res.status(405).end();
};
