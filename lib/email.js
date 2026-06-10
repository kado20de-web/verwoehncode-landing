// ── E-Mail-Versand via Resend ──

const { Resend } = require('resend');
const { fileTitles } = require('./products');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.FROM_EMAIL || 'wirflirten <onboarding@resend.dev>';

const GOLD = '#e8a045';

function renderEmail(productName, links) {
  const buttons = links.map((l) => {
    const title = fileTitles[l.file] || l.file;
    return `
      <tr>
        <td style="padding:8px 0;">
          <a href="${l.url}" style="display:block;background:linear-gradient(135deg,#e8a045,#c97d20);color:#000;font-weight:bold;text-decoration:none;padding:16px 24px;border-radius:8px;text-align:center;font-size:16px;">
            📖 ${title} herunterladen
          </a>
        </td>
      </tr>`;
  }).join('');

  return `
  <div style="background:#0d0d0d;padding:32px 16px;font-family:Georgia,serif;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #222;">
      <tr><td style="background:linear-gradient(135deg,#1a0a00,#2d1200);padding:32px;text-align:center;border-bottom:3px solid ${GOLD};">
        <div style="font-size:24px;font-weight:bold;color:#fff;">wir<span style="color:${GOLD};">flirten</span></div>
      </td></tr>
      <tr><td style="padding:32px;color:#cccccc;font-size:16px;line-height:1.7;">
        <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">Danke für deinen Kauf! 💞</h1>
        <p style="margin:0 0 8px;">Dein Download für <strong style="color:#fff;">${productName}</strong> ist bereit. Klick einfach auf den Button:</p>
        <table role="presentation" width="100%" style="margin:20px 0;">${buttons}</table>
        <p style="font-size:13px;color:#888;margin:16px 0 0;">Die Links sind aus Sicherheitsgründen zeitlich begrenzt gültig. Lade die Dateien am besten gleich herunter und speichere sie. Brauchst du sie später erneut, antworte einfach auf diese E-Mail.</p>
      </td></tr>
      <tr><td style="background:#0a0a0a;padding:20px;text-align:center;color:#555;font-size:12px;">
        © 2026 wirflirten · Alle Rechte vorbehalten
      </td></tr>
    </table>
  </div>`;
}

async function sendDownloadEmail({ to, productName, links }) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY fehlt — E-Mail wird übersprungen. Empfänger:', to);
    return { skipped: true };
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Dein Download — ${productName}`,
    html: renderEmail(productName, links),
  });
}

function renderReviewEmail(productName, formUrl) {
  return `
  <div style="background:#0d0d0d;padding:32px 16px;font-family:Georgia,serif;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #222;">
      <tr><td style="background:linear-gradient(135deg,#1a0a00,#2d1200);padding:32px;text-align:center;border-bottom:3px solid ${GOLD};">
        <div style="font-size:24px;font-weight:bold;color:#fff;">wir<span style="color:${GOLD};">flirten</span></div>
      </td></tr>
      <tr><td style="padding:32px;color:#cccccc;font-size:16px;line-height:1.7;">
        <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">Na, wie war’s? 💬</h1>
        <p style="margin:0 0 14px;">Vor zwei Wochen hast du dir <strong style="color:#fff;">${productName}</strong> geholt. Wir hoffen, es hat bei euch schon den ein oder anderen schönen Moment gebracht.</p>
        <p style="margin:0 0 20px;">Wir würden uns riesig über deine <strong style="color:#fff;">ehrliche Bewertung</strong> freuen — sie hilft uns, besser zu werden, und anderen Paaren bei der Entscheidung. Dauert keine 2 Minuten.</p>
        <div style="text-align:center;font-size:26px;letter-spacing:4px;color:${GOLD};margin:6px 0 22px;">★ ★ ★ ★ ★</div>
        <table role="presentation" width="100%"><tr><td style="padding:4px 0;">
          <a href="${formUrl}" style="display:block;background:linear-gradient(135deg,#e8a045,#c97d20);color:#000;font-weight:bold;text-decoration:none;padding:16px 24px;border-radius:8px;text-align:center;font-size:16px;">
            ⭐ Jetzt Bewertung abgeben
          </a>
        </td></tr></table>
        <p style="font-size:13px;color:#888;margin:18px 0 0;">Danke, dass du dir die Zeit nimmst — wir lesen wirklich jede Rückmeldung. ❤️</p>
      </td></tr>
      <tr><td style="background:#0a0a0a;padding:20px;text-align:center;color:#555;font-size:12px;">
        © 2026 wirflirten · Alle Rechte vorbehalten
      </td></tr>
    </table>
  </div>`;
}

async function sendReviewEmail({ to, productName, formUrl }) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY fehlt — Review-Mail übersprungen. Empfänger:', to);
    return { skipped: true };
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Wie gefällt dir ${productName}? ⭐`,
    html: renderReviewEmail(productName, formUrl),
  });
}

module.exports = { sendDownloadEmail, sendReviewEmail };
