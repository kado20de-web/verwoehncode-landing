// Rendert echte Innenseiten (Leseprobe) aus den PDFs in ebooks/ nach
// assets/preview/<key>-N.png. Nutzung:  node scripts/generate-previews.js
const fs = require('fs');
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');

const OUT = path.join(__dirname, '..', 'assets', 'preview');
fs.mkdirSync(OUT, { recursive: true });

const books = {
  ideen: '101-romantische-ideen',
  massage: 'massagetechniken-fuer-paare',
  musterpaar: 'so-werdet-ihr-ein-musterpaar',
};
const PAGES = [2, 3, 4];

(async () => {
  for (const [key, file] of Object.entries(books)) {
    const src = path.join(__dirname, '..', 'ebooks', file + '.pdf');
    if (!fs.existsSync(src)) { console.warn('⚠ fehlt:', file); continue; }
    const pages = await pdfToPng(src, { pagesToProcess: PAGES, viewportScale: 1.6 });
    pages.forEach((p, i) => fs.writeFileSync(path.join(OUT, `${key}-${i + 1}.png`), p.content));
    console.log(`✓ ${key}: ${pages.length} Leseprobe-Seiten`);
  }
  console.log('Fertig.');
})();
