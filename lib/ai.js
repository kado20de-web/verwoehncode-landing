// ── KI-Content-Generierung über die Claude-API (Anthropic) ──
// Nutzt das in Node eingebaute fetch — keine zusätzliche Abhängigkeit.

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';
const KEY = process.env.ANTHROPIC_API_KEY || '';

const THEMES = {
  daten: 'Klassisches Daten — Menschen im echten Leben kennenlernen, erste Dates, offline flirten, Mut zum Ansprechen',
  online: 'Online-Dating — Dating-Apps, Profil optimieren, erste Nachrichten, vom Match zum echten Date',
  paare: 'Für Paare — Beziehung pflegen, Romantik im Alltag, Nähe, Leidenschaft, gemeinsame Rituale',
};

const PLATFORMS = {
  instagram: 'Instagram (Reel oder Karussell; emotionaler, nahbarer Ton; starker Hook in den ersten 2 Sekunden)',
  tiktok: 'TikTok (kurzes Video; sehr schneller Hook; trendiger, lockerer Ton; klare Untertitel)',
  youtube: 'YouTube Shorts (vertikal; klarer Mehrwert; starker, neugierig machender Titel)',
};

const SYSTEM = `Du bist erfahrener Social-Media-Redakteur für die deutsche Marke "wirflirten".
Die Marke steht für: echte Verbindung, Beziehungen die wachsen, Leichtigkeit bewahren — warm, ehrlich, für alle (Singles wie Paare), niemals anzüglich oder reißerisch.
Du erstellst Content-Pakete, die zu den Richtlinien von Instagram, TikTok und YouTube passen (keine expliziten/sexuellen Inhalte, jugendfrei, respektvoll).
Antworte AUSSCHLIESSLICH mit gültigem JSON in genau dieser Struktur (keine Erklärungen, kein Markdown):
{
  "title": "kurzer interner Titel",
  "hook": "erster Satz / Aufmacher (max 1 Satz)",
  "caption": "fertige Caption inkl. Zeilenumbrüchen, ohne Hashtags",
  "hashtags": ["#tag1", "#tag2", "..."],
  "imagePrompt": "detaillierter Bild-Prompt auf Englisch für ein Bild-KI-Tool",
  "videoScript": [
    { "scene": 1, "onScreen": "eingeblendeter Text", "voiceover": "gesprochener Text", "visual": "Bildbeschreibung" }
  ],
  "cta": "Handlungsaufforderung (z. B. Link in Bio)"
}`;

function parseJson(text) {
  let t = (text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start > -1 && end > -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function generateDraft({ theme, platform, type }) {
  if (!KEY) throw new Error('ANTHROPIC_API_KEY ist nicht gesetzt (.env).');

  const t = THEMES[theme] || theme;
  const p = PLATFORMS[platform] || platform;
  const user = `Thema: ${t}
Plattform: ${p}
Gewünschtes Format: ${type}
Erstelle ein vollständiges, sofort nutzbares Content-Paket. Schreibe Caption und Texte auf Deutsch.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude-API-Fehler ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  try {
    return parseJson(text);
  } catch (e) {
    throw new Error('Antwort der KI konnte nicht als JSON gelesen werden.');
  }
}

module.exports = { generateDraft, THEMES, PLATFORMS };
