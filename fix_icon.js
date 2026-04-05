/**
 * fix_icon.js — Adds proper padding to adaptive-icon-fg.png
 * Android safe zone = center 66% of image (17% padding each side)
 * Run: node fix_icon.js
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SRC  = path.join(__dirname, 'mobile/assets/adaptive-icon-fg.png');
const DEST = path.join(__dirname, 'mobile/assets/adaptive-icon-fg.png');
const BACKUP = path.join(__dirname, 'mobile/assets/adaptive-icon-fg.original.png');

const CANVAS = 1024;
// Logo at 90% — fills the icon nicely on dark background
const LOGO_SIZE = Math.round(CANVAS * 0.90);
const PADDING   = Math.round((CANVAS - LOGO_SIZE) / 2);

async function run() {
  // Backup original
  fs.copyFileSync(SRC, BACKUP);
  console.log(`Backed up original to: adaptive-icon-fg.original.png`);

  // Resize logo to fit safe zone, place on transparent canvas with padding
  await sharp(SRC)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top:    PADDING,
      bottom: PADDING,
      left:   PADDING,
      right:  PADDING,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(DEST + '.tmp');

  fs.renameSync(DEST + '.tmp', DEST);
  console.log(`Done! New adaptive-icon-fg.png: ${CANVAS}x${CANVAS} with logo at center 66%`);
  console.log(`Now regenerate the mipmap files with: node generate_mipmaps.js`);
}

run().catch(err => {
  console.error('Error:', err.message);
  console.error('Install sharp first: npm install sharp --prefix .');
});
