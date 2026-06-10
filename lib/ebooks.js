// ── E-Book-Auslieferung über Cloudinary (privat, signierte Links) ──
// Lädt die bezahlten PDFs als PRIVATE Assets hoch und erzeugt zum
// Download zeitlich begrenzte, signierte Links. So liegen die Bücher
// nicht im Git-Repo und sind nicht öffentlich abrufbar.

const cloudinary = require('cloudinary').v2;
const path = require('path');

const CONFIGURED = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const FOLDER = 'wirflirten/ebooks';

// Dateiname (z. B. "101-romantische-ideen.pdf") → public_id ohne Endung
function publicId(filename) {
  return `${FOLDER}/${path.basename(filename, path.extname(filename))}`;
}

// PDF privat hochladen (PDFs laufen bei Cloudinary über den image-Pipeline-Typ)
async function uploadEbook(localPath, filename) {
  return cloudinary.uploader.upload(localPath, {
    resource_type: 'image',
    type: 'private',
    public_id: publicId(filename),
    overwrite: true,
    invalidate: true,
  });
}

// Signierter, ablaufender Download-Link (erzwingt Download des Originals)
function signedDownloadUrl(filename, ttlSeconds = 3600) {
  const expires_at = Math.floor(Date.now() / 1000) + ttlSeconds;
  return cloudinary.utils.private_download_url(publicId(filename), 'pdf', {
    resource_type: 'image',
    expires_at,
  });
}

module.exports = { CONFIGURED, uploadEbook, signedDownloadUrl, publicId };
