# wirflirten — Setup

## 1. Installation
```bash
npm install
cp .env.example .env   # dann .env mit echten Werten füllen
npm start
```

## 2. Wichtige .env-Variablen
| Variable | Zweck |
|----------|-------|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Zahlung + Auslieferung |
| `RESEND_API_KEY` / `FROM_EMAIL` | Download-E-Mail |
| `DOWNLOAD_SECRET` | signierte Download-Links (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | Login für `/admin` |
| `ANTHROPIC_API_KEY` | KI-Texte (Content-Studio) |
| `FAL_KEY` | Bild-/Video-Generierung |
| `CLOUDINARY_*` | Medien-Hosting |
| `BASE_URL` | öffentliche URL (live: Domain) |

## 3. E-Books
Die 3 PDFs in `ebooks/` ablegen (Namen siehe `ebooks/README.md`).

## 4. Stripe-Webhook
- Lokal: `stripe listen --forward-to localhost:3000/api/webhook`
- Live: Dashboard → Webhooks → `https://DOMAIN/api/webhook`, Event `checkout.session.completed`

## 5. Deployment (Render)
- Repo mit Render verbinden (Web Service, Node).
- Build: `npm install` · Start: `node server.js`
- Alle `.env`-Werte im Render-Dashboard als Environment Variables setzen (siehe `render.yaml`).
- `BASE_URL` auf die echte Render-/Domain-URL setzen.

## Überblick
- `/` Landingpage · `/admin` Dashboard (Analytics, Accounts, Content-Studio, Kalender)
- Verkauf: Stripe Checkout → success.html + Resend-E-Mail → signierte Downloads
- Content: Claude (Text) → fal.ai (Bild/Video) → Cloudinary (Hosting) → Kalender/Scheduler
