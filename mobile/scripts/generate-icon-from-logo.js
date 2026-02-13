/**
 * Generates app icon and splash assets from UI_Design/Application Logo.jpeg.
 * Run: node scripts/generate-icon-from-logo.js
 * Requires: npm install --save-dev sharp
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const LOGO_SOURCE = path.join(ROOT, "..", "UI_Design", "Application Logo.jpeg");

async function main() {
  if (!fs.existsSync(LOGO_SOURCE)) {
    console.warn("Logo not found at UI_Design/Application Logo.jpeg. Using assets/logo.jpeg if present.");
  }
  const src = fs.existsSync(LOGO_SOURCE) ? LOGO_SOURCE : path.join(ASSETS, "logo.jpeg");
  if (!fs.existsSync(src)) {
    console.error("No logo source found. Place Application Logo.jpeg in UI_Design or logo.jpeg in assets.");
    process.exit(1);
  }
  if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

  const size1024 = 1024;
  const splashWidth = 1284;
  const splashHeight = 2778;

  const pipeline = sharp(src);

  await pipeline
    .clone()
    .resize(size1024, size1024)
    .png()
    .toFile(path.join(ASSETS, "icon.png"));
  console.log("Created assets/icon.png (1024x1024)");

  await sharp(src)
    .resize(size1024, size1024)
    .png()
    .toFile(path.join(ASSETS, "adaptive-icon.png"));
  console.log("Created assets/adaptive-icon.png (1024x1024)");

  await sharp(src)
    .resize(splashWidth, splashHeight, { fit: "contain", background: { r: 242, g: 246, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(ASSETS, "splash-icon.png"));
  console.log("Created assets/splash-icon.png (1284x2778, #f2f6ff background)");

  await sharp(src)
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS, "favicon.png"));
  console.log("Created assets/favicon.png (48x48)");

  console.log("Done. Rebuild the app to use the new icon and splash.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
