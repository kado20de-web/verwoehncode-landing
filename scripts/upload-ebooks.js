// Lädt die echten E-Book-PDFs aus ebooks/ privat zu Cloudinary hoch.
// Nutzung:  node scripts/upload-ebooks.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const ebooks = require('../lib/ebooks');
const { products } = require('../lib/products');

if (!ebooks.CONFIGURED) {
  console.error('✗ Cloudinary ist nicht konfiguriert (CLOUDINARY_* in .env).');
  process.exit(1);
}

const files = [...new Set(Object.values(products).flatMap((p) => p.files))];

(async () => {
  for (const f of files) {
    const local = path.join(__dirname, '..', 'ebooks', f);
    if (!fs.existsSync(local)) { console.warn(`⚠  fehlt lokal: ${f} — bitte echtes PDF nach ebooks/ kopieren.`); continue; }
    const size = fs.statSync(local).size;
    if (size < 5000) { console.warn(`⚠  ${f} ist nur ${size} B (Platzhalter?) — übersprungen. Echtes PDF einlegen.`); continue; }
    process.stdout.write(`Lade ${f} … `);
    try {
      const r = await ebooks.uploadEbook(local, f);
      console.log(`✓ ${r.public_id}  (${Math.round(r.bytes / 1024)} KB, ${r.type})`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }
  console.log('Fertig. Die Auslieferung läuft jetzt (live) über Cloudinary.');
})();
