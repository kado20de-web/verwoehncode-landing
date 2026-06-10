// Erzeugt Platzhalter-Cover (assets/covers) und Leseproben-Seiten (assets/preview)
// als SVG. Später einfach durch echte Cover/PDF-Exporte ersetzen.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COVERS = path.join(ROOT, 'assets', 'covers');
const PREVIEW = path.join(ROOT, 'assets', 'preview');
fs.mkdirSync(COVERS, { recursive: true });
fs.mkdirSync(PREVIEW, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function coverSvg(emoji, titleLines, sub) {
  const W = 500, H = 700;
  let y = 420, t = '';
  for (const l of titleLines) { t += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="bold" fill="#ffffff">${esc(l)}</text>`; y += 50; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1a0a00"/><stop offset="0.5" stop-color="#2d1200"/><stop offset="1" stop-color="#140800"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="0" y="0" width="${W}" height="8" fill="#e8a045"/>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#e8a045"/>
  <text x="${W / 2}" y="78" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#e8a045" letter-spacing="3">WIRFLIRTEN · FÜR PAARE</text>
  <text x="${W / 2}" y="270" text-anchor="middle" font-size="150">${emoji}</text>
  ${t}
  <line x1="${W / 2 - 50}" y1="${y + 4}" x2="${W / 2 + 50}" y2="${y + 4}" stroke="#e8a045" stroke-width="3"/>
  <text x="${W / 2}" y="${y + 46}" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#cccccc" font-style="italic">${esc(sub)}</text>
  <text x="${W / 2}" y="${H - 36}" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#e8a045" letter-spacing="5">E-BOOK</text>
</svg>`;
}

function pageSvg(bookTitle, chapter, lines, pageNo) {
  const W = 595, H = 842;
  let body = '', y = 215;
  for (const ln of lines) { if (ln) body += `<text x="70" y="${y}" font-family="Georgia, serif" font-size="17" fill="#3a3a3a">${esc(ln)}</text>`; y += 30; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#faf6ef"/>
  <rect x="7" y="7" width="${W - 14}" height="${H - 14}" fill="none" stroke="#e7ddcb" stroke-width="2"/>
  <text x="70" y="62" font-family="Georgia, serif" font-size="12" fill="#b08a3e" letter-spacing="2">${esc(bookTitle.toUpperCase())}</text>
  <text x="${W - 70}" y="62" text-anchor="end" font-family="Georgia, serif" font-size="12" fill="#b08a3e" letter-spacing="2">LESEPROBE</text>
  <line x1="70" y1="80" x2="${W - 70}" y2="80" stroke="#e7ddcb" stroke-width="1"/>
  <text x="70" y="140" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#1a1a1a">${esc(chapter)}</text>
  <text x="${W / 2}" y="480" text-anchor="middle" font-family="Georgia, serif" font-size="92" fill="#e8a045" opacity="0.07" transform="rotate(-28 ${W / 2} 480)">LESEPROBE</text>
  ${body}
  <text x="${W / 2}" y="${H - 50}" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#b3a589">— ${pageNo} —</text>
  <text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#c9bda6" letter-spacing="2">wirflirten</text>
</svg>`;
}

const covers = {
  ideen: ['💝', ['101 romantische', 'Ideen'], 'Für mehr Romantik im Alltag'],
  massage: ['💆', ['Massagetechniken', 'für Paare'], 'Berührung, die verbindet'],
  musterpaar: ['💍', ['So werdet ihr', 'ein Musterpaar'], 'Gewohnheiten glücklicher Paare'],
};

const pages = {
  ideen: {
    title: '101 romantische Ideen',
    p: [
      ['Kapitel 1 · Kleine Gesten, große Wirkung', [
        'Romantik ist keine Frage des Geldes oder der Zeit.',
        'Es sind die kleinen, ehrlichen Gesten, die im',
        'Gedächtnis bleiben und eine Beziehung tragen.',
        '',
        'Idee 1 — Die handgeschriebene Notiz',
        'Versteck morgens einen kurzen Zettel in der',
        'Jackentasche deines Partners. Drei Sätze genügen:',
        'Schreib, wofür du heute dankbar bist.',
        '',
        'Idee 2 — Der Lieblingssong am Morgen',
        'Weckt den Tag mit dem Lied, zu dem ihr euch',
        'kennengelernt habt. Eine kleine Reise zum Anfang.',
      ]],
      ['Idee 23 · Das Mini-Date zu Hause', [
        'Ihr braucht keinen Babysitter und keine Reservierung,',
        'um euch wie frisch verliebt zu fühlen.',
        '',
        'So geht’s:',
        '1. Legt die Handys in ein anderes Zimmer.',
        '2. Deckt den Tisch hübsch — auch unter der Woche.',
        '3. Stellt euch eine Frage, die ihr nie gestellt habt.',
        '',
        'Tipp: Stellt euch vor, es wäre euer erstes Date.',
        'Wie würdet ihr einander zuhören? Genau so.',
      ]],
    ],
  },
  massage: {
    title: 'Massagetechniken für Paare',
    p: [
      ['Kapitel 2 · Die Grundlagen der Berührung', [
        'Eine gute Massage beginnt nicht mit den Händen,',
        'sondern mit der richtigen Atmosphäre.',
        '',
        'Die drei Säulen:',
        '•  Wärme — der Raum sollte angenehm warm sein.',
        '•  Ruhe — leise Musik, gedämpftes Licht.',
        '•  Zeit — plant mindestens 20 Minuten ein.',
        '',
        'Verwende ein hochwertiges Öl und wärme es',
        'zwischen deinen Handflächen an, bevor du beginnst.',
      ]],
      ['Technik 3 · Die sanfte Nackenmassage', [
        'Der Nacken speichert den Stress des ganzen Tages.',
        'Schon wenige Minuten lösen spürbar Spannung.',
        '',
        'Schritt für Schritt:',
        '1. Lege beide Daumen neben die Wirbelsäule.',
        '2. Kreise langsam nach außen, ohne Druck auf Knochen.',
        '3. Steigere den Druck nur nach Rückmeldung.',
        '',
        'Frag zwischendurch: „Ist das angenehm so?“',
        'Kommunikation ist die wichtigste Technik überhaupt.',
      ]],
    ],
  },
  musterpaar: {
    title: 'So werdet ihr ein Musterpaar',
    p: [
      ['Kapitel 1 · Was glückliche Paare anders machen', [
        'Glückliche Paare haben nicht weniger Probleme.',
        'Sie gehen nur anders damit um.',
        '',
        'Die Forschung zeigt: Entscheidend ist das Verhältnis',
        'von positiven zu negativen Momenten — etwa 5 zu 1.',
        '',
        'Das heißt: Für jede Kritik braucht es fünf kleine',
        'Zeichen der Wertschätzung, um die Balance zu halten.',
        'Die gute Nachricht — die meisten davon kosten',
        'nichts außer ein wenig Aufmerksamkeit.',
      ]],
      ['Die 5 Säulen einer starken Beziehung', [
        '1. Zuhören, um zu verstehen — nicht um zu antworten.',
        '2. Wertschätzung täglich aussprechen.',
        '3. Konflikte fair austragen, ohne Vorwürfe.',
        '4. Gemeinsame Rituale bewusst pflegen.',
        '5. Sich Freiraum lassen und Vertrauen schenken.',
        '',
        'In den nächsten Kapiteln machen wir jede Säule',
        'konkret — mit Übungen, die ihr heute starten könnt.',
      ]],
    ],
  },
};

for (const [key, [emoji, title, sub]] of Object.entries(covers)) {
  fs.writeFileSync(path.join(COVERS, key + '.svg'), coverSvg(emoji, title, sub));
}
for (const [key, data] of Object.entries(pages)) {
  data.p.forEach(([chapter, lines], i) => {
    fs.writeFileSync(path.join(PREVIEW, `${key}-${i + 1}.svg`), pageSvg(data.title, chapter, lines, i + 1));
  });
}
console.log('✓ Cover & Leseproben erzeugt in assets/covers und assets/preview');
