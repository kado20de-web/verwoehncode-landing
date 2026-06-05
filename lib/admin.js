// ── Admin-Authentifizierung (signiertes Cookie, kein externes Paket) ──

const crypto = require('crypto');

const SECRET = process.env.ADMIN_SECRET || process.env.DOWNLOAD_SECRET || 'dev-admin-secret-change-me';
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const COOKIE = 'wf_admin';
const TTL_MS = 12 * 3600 * 1000;

function sign(exp) {
  return crypto.createHmac('sha256', SECRET).update('admin.' + exp).digest('hex');
}

function makeToken() {
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(exp)}`;
}

function validToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  const expected = sign(exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function checkPassword(pw) {
  if (!PASSWORD) return false;
  const a = Buffer.from(String(pw));
  const b = Buffer.from(PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isAuthed(req) {
  return validToken(parseCookies(req.headers.cookie)[COOKIE]);
}

function setCookie(res, secure) {
  const token = makeToken();
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${TTL_MS / 1000}; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

module.exports = { isAuthed, setCookie, clearCookie, checkPassword, PASSWORD_SET: !!PASSWORD };
