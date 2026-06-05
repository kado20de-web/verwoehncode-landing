// ── Produktkatalog ──
// amount = Preis in Cent (Stripe rechnet in der kleinsten Währungseinheit).
// files  = PDF-Dateinamen im Ordner /ebooks, die nach dem Kauf ausgeliefert werden.

const products = {
  ideen: {
    name: '101 romantische Ideen',
    amount: 1299,
    files: ['101-romantische-ideen.pdf'],
  },
  massage: {
    name: 'Massagetechniken für Paare',
    amount: 1299,
    files: ['massagetechniken-fuer-paare.pdf'],
  },
  musterpaar: {
    name: 'So werdet ihr ein Musterpaar',
    amount: 1299,
    files: ['so-werdet-ihr-ein-musterpaar.pdf'],
  },
  bundle: {
    name: 'Paar-Paket — Alle 3 Ratgeber',
    amount: 2499,
    files: [
      '101-romantische-ideen.pdf',
      'massagetechniken-fuer-paare.pdf',
      'so-werdet-ihr-ein-musterpaar.pdf',
    ],
  },
};

const fileTitles = {
  '101-romantische-ideen.pdf': '101 romantische Ideen',
  'massagetechniken-fuer-paare.pdf': 'Massagetechniken für Paare',
  'so-werdet-ihr-ein-musterpaar.pdf': 'So werdet ihr ein Musterpaar',
};

module.exports = { products, fileTitles };
