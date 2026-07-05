// Rendert 2 inhaltsstarke Leseprobe-Seiten je Buch aus den PDFs in ebooks/
// nach assets/preview/<key>-N.png.  Nutzung:  node scripts/generate-previews.js
const fs = require('fs');
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');

const OUT = path.join(__dirname, '..', 'assets', 'preview');
fs.mkdirSync(OUT, { recursive: true });

// Pro Buch bewusst gewählte Inhaltsseiten (PDF-Seitenzahl, 1-basiert) —
// echte Ideen/Techniken/Übungen, kein Titel/Inhaltsverzeichnis.
const books = {
  ideen: { file: '101-romantische-ideen', pages: [7, 14] },
  massage: { file: 'massagetechniken-fuer-paare', pages: [20, 24] },
  musterpaar: { file: 'so-werdet-ihr-ein-musterpaar', pages: [9, 18] },
};

(async () => {
  for (const [key, { file, pages: pageNums }] of Object.entries(books)) {
    const src = path.join(__dirname, '..', 'ebooks', file + '.pdf');
    if (!fs.existsSync(src)) { console.warn('⚠ fehlt:', file); continue; }
    const pages = await pdfToPng(src, { pagesToProcess: pageNums, viewportScale: 1.6 });
    pages.forEach((p, i) => fs.writeFileSync(path.join(OUT, `${key}-${i + 1}.png`), p.content));
    console.log(`✓ ${key}: Seiten ${pageNums.join(', ')} als Leseprobe`);
  }
  console.log('Fertig.');
})();
