// ── Medien-Generierung (fal.ai) + Hosting (Cloudinary) ──

const crypto = require('crypto');

const FAL_KEY = process.env.FAL_KEY || '';
const FAL_IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell';
const FAL_VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || 'fal-ai/ltx-video';

const CLD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLD_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function falGenerate(model, input) {
  if (!FAL_KEY) throw new Error('FAL_KEY ist nicht gesetzt (.env).');

  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  const sub = await submit.json();

  const maxTries = 120;
  for (let i = 0; i < maxTries; i++) {
    await sleep(2500);
    const st = await fetch(sub.status_url, { headers: { Authorization: `Key ${FAL_KEY}` } });
    const sj = await st.json();
    if (sj.status === 'COMPLETED') break;
    if (sj.status === 'FAILED' || sj.error) throw new Error('fal-Generierung fehlgeschlagen.');
    if (i === maxTries - 1) throw new Error('fal-Generierung: Zeitüberschreitung.');
  }

  const res = await fetch(sub.response_url, { headers: { Authorization: `Key ${FAL_KEY}` } });
  if (!res.ok) throw new Error(`fal result ${res.status}`);
  return res.json();
}

async function generateImage(prompt) {
  const out = await falGenerate(FAL_IMAGE_MODEL, { prompt, image_size: 'portrait_16_9' });
  const url = out.images?.[0]?.url || out.image?.url;
  if (!url) throw new Error('Keine Bild-URL von fal.ai erhalten.');
  return { type: 'image', url };
}

async function generateVideo(prompt) {
  const out = await falGenerate(FAL_VIDEO_MODEL, { prompt });
  const url = out.video?.url || out.videos?.[0]?.url;
  if (!url) throw new Error('Keine Video-URL von fal.ai erhalten.');
  return { type: 'video', url };
}

function cloudinaryConfigured() {
  return !!(CLD_NAME && CLD_KEY && CLD_SECRET);
}

async function uploadToCloudinary(remoteUrl, resourceType) {
  if (!cloudinaryConfigured()) return remoteUrl;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'wirflirten';
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + CLD_SECRET).digest('hex');

  const form = new URLSearchParams();
  form.set('file', remoteUrl);
  form.set('folder', folder);
  form.set('timestamp', String(timestamp));
  form.set('api_key', CLD_KEY);
  form.set('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return j.secure_url;
}

async function generateMedia({ type, imagePrompt, videoPrompt }) {
  const isVideo = ['reel', 'short'].includes(type);
  const gen = isVideo ? await generateVideo(videoPrompt || imagePrompt) : await generateImage(imagePrompt);
  const hosted = await uploadToCloudinary(gen.url, gen.type);
  return { type: gen.type, sourceUrl: gen.url, url: hosted, hosted: cloudinaryConfigured() };
}

module.exports = { generateMedia, cloudinaryConfigured };
