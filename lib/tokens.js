// ── Signierte Download-Links ──
// Zeitlich begrenzte, HMAC-signierte Links — niemand kann /ebooks/datei.pdf erraten.

const crypto = require('crypto');

const SECRET = process.env.DOWNLOAD_SECRET || 'dev-insecure-secret-please-change';
const TTL_HOURS = Number(process.env.DOWNLOAD_TTL_HOURS || 168);

function sign(file, exp) {
  return crypto.createHmac('sha256', SECRET).update(`${file}.${exp}`).digest('hex');
}

function createLink(baseUrl, file) {
  const exp = Date.now() + TTL_HOURS * 3600 * 1000;
  const sig = sign(file, exp);
  const params = new URLSearchParams({ f: file, exp: String(exp), sig });
  return `${baseUrl}/download?${params.toString()}`;
}

function verify(file, exp, sig) {
  if (!file || !exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const expected = sign(file, Number(exp));
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { createLink, verify };
