const crypto = require('crypto');

const DB_URL = (process.env.FIREBASE_DATABASE_URL || 'https://kingdendy-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, '');
const COOKIE = 'kb_admin_session';
const CSRF_COOKIE = 'kb_admin_csrf';
const SESSION_TTL = 60 * 60 * 8;

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('='); return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))];
  }));
}
function b64url(input) { return Buffer.from(input).toString('base64url'); }
function sign(payload) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET belum dikonfigurasi (minimal 32 karakter).');
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) return null;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
function requireAdmin(req, res) {
  const session = verify(parseCookies(req)[COOKIE]);
  if (!session) { res.status(401).json({ ok:false, error:'UNAUTHORIZED' }); return null; }
  return session;
}
function requireCsrf(req, res) {
  const cookies = parseCookies(req);
  const header = String(req.headers['x-csrf-token'] || '');
  if (!header || !cookies[CSRF_COOKIE] || header !== cookies[CSRF_COOKIE]) {
    res.status(403).json({ ok:false, error:'CSRF_INVALID' }); return false;
  }
  const origin = String(req.headers.origin || '');
  const host = String(req.headers.host || '');
  if (origin && !origin.endsWith(`://${host}`)) { res.status(403).json({ok:false,error:'ORIGIN_INVALID'}); return false; }
  return true;
}
function verifyPassword(password) {
  const stored = process.env.ADMIN_PASSWORD_HASH || '';
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const actual = crypto.scryptSync(String(password || ''), Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
async function db(path, options={}) {
  const auth = process.env.FIREBASE_DATABASE_SECRET;
  const suffix = auth ? `?auth=${encodeURIComponent(auth)}` : '';
  const response = await fetch(`${DB_URL}/${path.replace(/^\//,'')}.json${suffix}`, {
    ...options,
    headers: { 'content-type':'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`Firebase ${response.status}`);
  return response.json();
}
function setSecurityHeaders(res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
}
module.exports = { crypto, COOKIE, CSRF_COOKIE, SESSION_TTL, sign, requireAdmin, requireCsrf, verifyPassword, db, setSecurityHeaders };
