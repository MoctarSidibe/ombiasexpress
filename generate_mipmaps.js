/**
 * generate_mipmaps.js — Regenerates Android mipmap WebP files from adaptive-icon-fg.png
 * Run: node generate_mipmaps.js
 */
const sharp = require('sharp');
const path  = require('path');

const SRC_FG   = path.join(__dirname, 'mobile/assets/adaptive-icon-fg.png');
const SRC_ICON = path.join(__dirname, 'mobile/assets/icon.png');
const MIPMAP   = path.join(__dirname, 'mobile/android/app/src/main/res');

// Android mipmap sizes (foreground = 108dp scaled, launcher = 48dp scaled)
const SIZES = [
  { dir: 'mipmap-mdpi',    launcher: 48,  foreground: 108, round: 48  },
  { dir: 'mipmap-hdpi',    launcher: 72,  foreground: 162, round: 72  },
  { dir: 'mipmap-xhdpi',   launcher: 96,  foreground: 216, round: 96  },
  { dir: 'mipmap-xxhdpi',  launcher: 144, foreground: 324, round: 144 },
  { dir: 'mipmap-xxxhdpi', launcher: 192, foreground: 432, round: 192 },
];

async function run() {
  for (const size of SIZES) {
    const dir = path.join(MIPMAP, size.dir);

    // ic_launcher_foreground.webp (adaptive icon foreground)
    await sharp(SRC_FG)
      .resize(size.foreground, size.foreground, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(path.join(dir, 'ic_launcher_foreground.webp'));

    // ic_launcher.webp (standard launcher icon)
    await sharp(SRC_ICON)
      .resize(size.launcher, size.launcher, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 90 })
      .toFile(path.join(dir, 'ic_launcher.webp'));

    // ic_launcher_round.webp (round launcher icon)
    await sharp(SRC_ICON)
      .resize(size.launcher, size.launcher, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 90 })
      .toFile(path.join(dir, 'ic_launcher_round.webp'));

    console.log(`✅ ${size.dir} done`);
  }
  console.log('\nAll mipmap files regenerated. Now commit and push to trigger Jenkins build.');
}

run().catch(err => {
  console.error('Error:', err.message);
  console.error('Install sharp first: npm install sharp --prefix .');
});
