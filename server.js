require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const Stripe = require('stripe');

const { products, fileTitles } = require('./lib/products');
const { createLink, verify } = require('./lib/tokens');
const { sendDownloadEmail, sendReviewEmail } = require('./lib/email');
const store = require('./lib/store');
const admin = require('./lib/admin');
const ai = require('./lib/ai');
const media = require('./lib/media');
const ebooks = require('./lib/ebooks');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

const ALLOWED_FILES = new Set(Object.values(products).flatMap((p) => p.files));

function linksFor(product) {
  return product.files.map((f) => ({ file: f, title: fileTitles[f] || f, url: createLink(BASE_URL, f) }));
}

/* 1) STRIPE WEBHOOK (Raw-Body, vor express.json) */
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).send('Stripe nicht konfiguriert.');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signaturprüfung fehlgeschlagen:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const product = products[session.metadata?.product];
    const email = session.customer_details?.email || session.customer_email;
    if (product && email) {
      try {
        await sendDownloadEmail({ to: email, productName: product.name, links: linksFor(product) });
        console.log(`[webhook] Download-E-Mail an ${email} (${product.name})`);
      } catch (e) {
        console.error('[webhook] E-Mail-Versand fehlgeschlagen:', e);
      }
    }
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* 2) CHECKOUT */
app.post('/api/checkout', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Zahlung ist noch nicht konfiguriert.' });
  const product = products[req.body.product];
  if (!product) return res.status(400).json({ error: 'Unbekanntes Produkt.' });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'de',
      line_items: [{
        quantity: 1,
        price_data: { currency: 'eur', unit_amount: product.amount, product_data: { name: product.name } },
      }],
      metadata: { product: req.body.product },
      custom_text: {
        submit: {
          message: 'Mit dem Kauf erhältst du sofortigen Zugang zum digitalen Download. Du stimmst ausdrücklich zu, dass die Ausführung sofort beginnt, und bestätigst, dass dein Widerrufsrecht damit erlischt. Es gelten unsere AGB.',
        },
      },
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/?canceled=1#paare`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('[checkout]', e.message);
    res.status(500).json({ error: 'Checkout konnte nicht erstellt werden.', detail: e.message });
  }
});

/* 3) BESTELLUNG (für Erfolgsseite) */
app.get('/api/order', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nicht konfiguriert.' });
  const id = req.query.session_id;
  if (!id) return res.status(400).json({ error: 'session_id fehlt.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Zahlung noch nicht abgeschlossen.' });
    const product = products[session.metadata?.product];
    if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden.' });
    res.json({ email: session.customer_details?.email || null, productName: product.name, links: linksFor(product) });
  } catch (e) {
    console.error('[order]', e.message);
    res.status(500).json({ error: 'Bestellung konnte nicht geladen werden.' });
  }
});

/* 4) DOWNLOAD */
app.get('/download', (req, res) => {
  const { f, exp, sig } = req.query;
  if (!ALLOWED_FILES.has(f)) return res.status(404).send('Datei nicht gefunden.');
  if (!verify(f, exp, sig)) return res.status(403).send('Download-Link ungültig oder abgelaufen.');

  // 1) Lokale Datei vorhanden (Entwicklung) → direkt ausliefern
  const filePath = path.join(__dirname, 'ebooks', f);
  if (fs.existsSync(filePath)) return res.download(filePath, f);

  // 2) Sonst (Produktion/Render) → signierten, ablaufenden Cloudinary-Link
  if (ebooks.CONFIGURED) {
    try {
      return res.redirect(ebooks.signedDownloadUrl(f));
    } catch (e) {
      console.error('[download] Cloudinary-Link fehlgeschlagen:', e.message);
    }
  }
  return res.status(404).send('Datei ist noch nicht hinterlegt. Bitte kontaktiere uns.');
});

/* 5) TRACKING */
const TRACK_TYPES = new Set(['pageview', 'click']);
app.post('/api/track', (req, res) => {
  const { t, product, path: p, s } = req.body || {};
  if (!TRACK_TYPES.has(t)) return res.status(204).end();
  const ev = { t, ts: Date.now() };
  if (typeof s === 'string') ev.s = s.slice(0, 40);
  if (product && products[product]) ev.product = product;
  if (typeof p === 'string') ev.p = p.slice(0, 120);
  store.append(ev);
  res.status(204).end();
});

/* 6) ADMIN */
const SOCIAL_FILE = path.join(__dirname, 'data', 'social.json');
const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'youtube'];
function readSocial() { try { return JSON.parse(fs.readFileSync(SOCIAL_FILE, 'utf8')); } catch { return {}; } }
function writeSocial(obj) { fs.mkdirSync(path.dirname(SOCIAL_FILE), { recursive: true }); fs.writeFileSync(SOCIAL_FILE, JSON.stringify(obj, null, 2)); }

const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');
function readContent() { try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); } catch { return []; } }
function writeContent(arr) { fs.mkdirSync(path.dirname(CONTENT_FILE), { recursive: true }); fs.writeFileSync(CONTENT_FILE, JSON.stringify(arr, null, 2)); }

const VALID_THEMES = ['daten', 'online', 'paare'];
const VALID_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook'];
const VALID_TYPES = ['reel', 'short', 'bild', 'karussell', 'post'];

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/admin/login', (req, res) => {
  if (!admin.PASSWORD_SET) return res.status(500).json({ error: 'ADMIN_PASSWORD ist nicht gesetzt (.env).' });
  if (!admin.checkPassword(req.body?.password)) return res.status(401).json({ error: 'Falsches Passwort.' });
  admin.setCookie(res, BASE_URL.startsWith('https'));
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => { admin.clearCookie(res); res.json({ ok: true }); });

function requireAdmin(req, res, next) {
  if (!admin.isAuthed(req)) return res.status(401).json({ error: 'Nicht angemeldet.' });
  next();
}

app.get('/api/admin/socials', requireAdmin, (req, res) => res.json(readSocial()));
app.post('/api/admin/socials', requireAdmin, (req, res) => {
  const cur = readSocial();
  SOCIAL_KEYS.forEach((k) => { if (typeof req.body?.[k] === 'string') cur[k] = req.body[k].trim().slice(0, 200); });
  writeSocial(cur);
  res.json(cur);
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const range = ['7d', '30d', 'all'].includes(req.query.range) ? req.query.range : '30d';
    const days = range === '7d' ? 7 : range === 'all' ? 3650 : 30;
    const since = Date.now() - days * 86400000;

    const events = store.readAll().filter((e) => e.ts >= since);
    const pageviews = events.filter((e) => e.t === 'pageview');
    const clicks = events.filter((e) => e.t === 'click');
    const sessions = new Set(pageviews.map((e) => e.s).filter(Boolean)).size;
    const clicksByProduct = {};
    clicks.forEach((c) => { if (c.product) clicksByProduct[c.product] = (clicksByProduct[c.product] || 0) + 1; });

    let salesConfigured = !!stripe;
    let paid = [];
    if (stripe) {
      try {
        paid = (await stripe.checkout.sessions.list({ created: { gte: Math.floor(since / 1000) }, limit: 100 }).autoPagingToArray({ limit: 1000 }))
          .filter((s) => s.payment_status === 'paid');
      } catch (e) { console.error('[admin] Stripe-Abfrage fehlgeschlagen:', e.message); salesConfigured = false; }
    }

    const salesByProduct = {};
    let revenue = 0;
    paid.forEach((s) => {
      revenue += s.amount_total || 0;
      const pid = s.metadata?.product;
      if (pid) { salesByProduct[pid] = salesByProduct[pid] || { count: 0, revenue: 0 }; salesByProduct[pid].count++; salesByProduct[pid].revenue += s.amount_total || 0; }
    });

    const recent = paid.map((s) => ({
      ts: s.created * 1000,
      name: products[s.metadata?.product]?.name || s.metadata?.product || '—',
      amount: s.amount_total || 0,
      email: s.customer_details?.email || null,
    })).sort((a, b) => b.ts - a.ts).slice(0, 12);

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const timeseries = [];
    for (let i = 13; i >= 0; i--) {
      const ds = start.getTime() - i * 86400000;
      const de = ds + 86400000;
      timeseries.push({
        label: new Date(ds).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        views: pageviews.filter((e) => e.ts >= ds && e.ts < de).length,
        orders: paid.filter((s) => s.created * 1000 >= ds && s.created * 1000 < de).length,
      });
    }

    const productRows = Object.keys(products).map((id) => ({
      id, name: products[id].name,
      clicks: clicksByProduct[id] || 0,
      sales: salesByProduct[id]?.count || 0,
      revenue: salesByProduct[id]?.revenue || 0,
    }));

    res.json({
      range, salesConfigured,
      kpis: { pageviews: pageviews.length, sessions, clicks: clicks.length, orders: paid.length, revenue, conversion: sessions ? (paid.length / sessions) * 100 : 0 },
      productRows, recent, timeseries,
    });
  } catch (e) {
    console.error('[admin/stats]', e);
    res.status(500).json({ error: 'Statistik konnte nicht geladen werden.' });
  }
});

app.get('/api/admin/content', requireAdmin, (req, res) => {
  res.json(readContent().sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/admin/content/generate', requireAdmin, async (req, res) => {
  const { theme, platform, type } = req.body || {};
  if (!VALID_THEMES.includes(theme) || !VALID_PLATFORMS.includes(platform) || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Ungültige Auswahl.' });
  }
  try {
    const content = await ai.generateDraft({ theme, platform, type });
    const item = {
      id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      theme, platform, type, status: 'draft', scheduledAt: null, publishedAt: null, content, createdAt: Date.now(),
    };
    const all = readContent();
    all.push(item);
    writeContent(all);
    res.json(item);
  } catch (e) {
    console.error('[content/generate]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Automatische Verplanung (muss VOR der :id-Route stehen)
const PLAN_SLOTS = {
  instagram: [{ d: 2, h: 11 }, { d: 2, h: 19 }, { d: 4, h: 11 }, { d: 4, h: 19 }],
  tiktok: [{ d: 2, h: 18 }, { d: 4, h: 18 }, { d: 6, h: 11 }],
  youtube: [{ d: 3, h: 15 }, { d: 6, h: 15 }],
  facebook: [{ d: 1, h: 12 }, { d: 5, h: 12 }],
};

app.post('/api/admin/content/autoplan', requireAdmin, (req, res) => {
  const all = readContent();
  const taken = new Set(all.filter((x) => x.scheduledAt).map((x) => x.scheduledAt));
  const now = new Date(); now.setMinutes(0, 0, 0);

  function nextSlots(platform, count) {
    const slots = (PLAN_SLOTS[platform] || PLAN_SLOTS.instagram).slice().sort((a, b) => a.h - b.h);
    const out = [];
    for (let dayOffset = 0; dayOffset < 60 && out.length < count; dayOffset++) {
      const day = new Date(now.getTime() + dayOffset * 86400000);
      for (const s of slots) {
        if (day.getDay() === s.d) {
          const dt = new Date(day); dt.setHours(s.h, 0, 0, 0);
          const ts = dt.getTime();
          if (ts > Date.now() && !taken.has(ts)) { out.push(ts); taken.add(ts); }
        }
      }
    }
    return out;
  }

  const byPlatform = {};
  all.filter((x) => x.status === 'approved' && !x.scheduledAt)
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((it) => { (byPlatform[it.platform] = byPlatform[it.platform] || []).push(it); });

  let planned = 0;
  Object.keys(byPlatform).forEach((pl) => {
    const items = byPlatform[pl];
    const slots = nextSlots(pl, items.length);
    items.forEach((it, i) => { if (slots[i]) { it.scheduledAt = slots[i]; planned++; } });
  });

  writeContent(all);
  res.json({ planned });
});

app.post('/api/admin/content/:id', requireAdmin, (req, res) => {
  const all = readContent();
  const item = all.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Nicht gefunden.' });
  if (['draft', 'approved', 'rejected'].includes(req.body?.status)) item.status = req.body.status;
  if ('scheduledAt' in (req.body || {})) item.scheduledAt = req.body.scheduledAt ? Number(req.body.scheduledAt) : null;
  writeContent(all);
  res.json(item);
});

app.delete('/api/admin/content/:id', requireAdmin, (req, res) => {
  writeContent(readContent().filter((x) => x.id !== req.params.id));
  res.json({ ok: true });
});

function buildVideoPrompt(item) {
  const c = item.content || {};
  const visuals = (c.videoScript || []).map((s) => s.visual).filter(Boolean).join('. ');
  return [c.title, c.hook, visuals].filter(Boolean).join('. ').slice(0, 1000);
}

app.post('/api/admin/content/:id/media', requireAdmin, (req, res) => {
  const all = readContent();
  const item = all.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Nicht gefunden.' });
  item.media = { status: 'processing', startedAt: Date.now() };
  writeContent(all);
  res.json({ ok: true, status: 'processing' });

  (async () => {
    try {
      const result = await media.generateMedia({
        type: item.type,
        imagePrompt: item.content?.imagePrompt || item.content?.title,
        videoPrompt: buildVideoPrompt(item),
      });
      const fresh = readContent();
      const it = fresh.find((x) => x.id === item.id);
      if (it) { it.media = { status: 'ready', ...result, finishedAt: Date.now() }; writeContent(fresh); }
      console.log('[media] fertig:', item.id, result.type);
    } catch (e) {
      const fresh = readContent();
      const it = fresh.find((x) => x.id === item.id);
      if (it) { it.media = { status: 'error', error: e.message }; writeContent(fresh); }
      console.error('[media]', e.message);
    }
  })();
});

/* 6b) BEWERTUNGS-MAILS — 14 Tage nach Kauf (Quelle: Stripe) */
const REVIEW_FORM_URL = process.env.REVIEW_FORM_URL || '';
const REVIEW_CRON_TOKEN = process.env.REVIEW_CRON_TOKEN || '';
const REVIEW_SENT_FILE = path.join(__dirname, 'data', 'review-sent.json');
function readReviewSent() { try { return new Set(JSON.parse(fs.readFileSync(REVIEW_SENT_FILE, 'utf8'))); } catch { return new Set(); } }
function writeReviewSent(set) { fs.mkdirSync(path.dirname(REVIEW_SENT_FILE), { recursive: true }); fs.writeFileSync(REVIEW_SENT_FILE, JSON.stringify([...set])); }

async function runReviewEmails() {
  if (!stripe) return { skipped: 'stripe' };
  if (!REVIEW_FORM_URL) return { skipped: 'REVIEW_FORM_URL' };
  const now = Math.floor(Date.now() / 1000);
  // Fenster: Käufe, die 14–21 Tage zurückliegen (Slack, falls ein Lauf ausfällt)
  const gte = now - 21 * 86400;
  const lte = now - 14 * 86400;
  const sessions = (await stripe.checkout.sessions.list({ created: { gte, lte }, limit: 100 }).autoPagingToArray({ limit: 1000 }))
    .filter((s) => s.payment_status === 'paid');
  const sent = readReviewSent();
  let count = 0;
  for (const s of sessions) {
    if (sent.has(s.id)) continue;
    const email = s.customer_details?.email || s.customer_email;
    if (!email) continue;
    const product = products[s.metadata?.product];
    try {
      await sendReviewEmail({ to: email, productName: product?.name || 'dein E-Book', formUrl: REVIEW_FORM_URL });
      sent.add(s.id);
      count++;
    } catch (e) {
      console.error('[reviews] Mail fehlgeschlagen:', e.message);
    }
  }
  if (count) writeReviewSent(sent);
  return { scanned: sessions.length, sent: count };
}

// Von außen anstoßbar (z. B. täglicher Cron via cron-job.org / GitHub Actions)
app.get('/api/cron/review-emails', async (req, res) => {
  if (!REVIEW_CRON_TOKEN || req.query.token !== REVIEW_CRON_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try { res.json(await runReviewEmails()); }
  catch (e) { console.error('[reviews]', e.message); res.status(500).json({ error: e.message }); }
});

// Interne Sicherung: alle 6 Stunden (läuft, solange der Service wach ist)
setInterval(() => { runReviewEmails().then((r) => { if (r && r.sent) console.log('[reviews] gesendet:', r.sent); }).catch(() => {}); }, 6 * 3600 * 1000);

/* 6c) BEWERTUNGEN ANZEIGEN — aus veröffentlichtem Google-Sheet-CSV */
const REVIEW_SHEET_CSV_URL = process.env.REVIEW_SHEET_CSV_URL || '';
let reviewCache = { data: [], ts: 0 };

function parseCSV(text) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

async function fetchReviews() {
  if (!REVIEW_SHEET_CSV_URL) return [];
  const res = await fetch(REVIEW_SHEET_CSV_URL);
  if (!res.ok) throw new Error('CSV ' + res.status);
  const rows = parseCSV(await res.text());
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.toLowerCase());
  const used = new Set();
  const find = (...keys) => {
    const idx = head.findIndex((h, i) => !used.has(i) && keys.some((k) => h.includes(k)));
    if (idx >= 0) used.add(idx);
    return idx;
  };
  // Reihenfolge wichtig: spezifische Spalten zuerst beanspruchen
  const iRate = find('stern', 'sterne');
  const iCons = find('zeigen', 'website', 'veröffentlich', 'dürfen');
  const iText = find('gefallen', 'am besten');
  const iProd = find('e-book', 'gelesen', 'buch');
  const iName = find('vorname', 'name', 'ort');
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const consent = (iCons >= 0 ? row[iCons] : '').trim().toLowerCase();
    if (!consent.startsWith('ja')) continue;
    const text = (iText >= 0 ? row[iText] : '').trim();
    if (!text) continue;
    const rating = parseInt((iRate >= 0 ? row[iRate] : '5'), 10) || 5;
    if (rating < 4) continue;
    out.push({
      name: (iName >= 0 ? row[iName] : '').trim() || 'Zufriedenes Paar',
      product: (iProd >= 0 ? row[iProd] : '').trim(),
      rating,
      text,
    });
  }
  return out.reverse();
}

app.get('/api/reviews', async (req, res) => {
  try {
    if (Date.now() - reviewCache.ts > 600000) {
      reviewCache = { data: await fetchReviews(), ts: Date.now() };
    }
    res.json({ reviews: reviewCache.data.slice(0, 12) });
  } catch (e) {
    console.error('[reviews-display]', e.message);
    res.json({ reviews: [] });
  }
});

/* 7) SCHEDULER (Cronjob) */
setInterval(() => {
  try {
    const items = readContent();
    const now = Date.now();
    let changed = false;
    for (const it of items) {
      if (it.status === 'approved' && it.scheduledAt && it.scheduledAt <= now && !it.publishedAt) {
        if (!it.publishNote) {
          it.publishNote = 'Fällig — Veröffentlichung wartet auf Plattform-API-Freigabe.';
          changed = true;
          console.log(`[scheduler] fällig zum Posten: ${it.id} (${it.platform})`);
        }
      }
    }
    if (changed) writeContent(items);
  } catch (e) {
    console.error('[scheduler]', e.message);
  }
}, 60000);

/* 404 */
app.use((req, res) => { res.status(404).sendFile(path.join(__dirname, '404.html')); });

app.listen(PORT, () => {
  console.log(`wirflirten läuft auf ${BASE_URL}`);
  if (!stripe) console.warn('⚠  STRIPE_SECRET_KEY fehlt — Käufe sind deaktiviert.');
  if (!process.env.RESEND_API_KEY) console.warn('⚠  RESEND_API_KEY fehlt — E-Mails werden übersprungen.');
});
