// ── Einfacher, dateibasierter Event-Speicher (NDJSON, append-only) ──

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'events.ndjson');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function append(event) {
  ensure();
  fs.appendFile(FILE, JSON.stringify(event) + '\n', (err) => {
    if (err) console.error('[store] append fehlgeschlagen:', err.message);
  });
}

function readAll() {
  ensure();
  if (!fs.existsSync(FILE)) return [];
  return fs
    .readFileSync(FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

module.exports = { append, readAll };
