/**
 * Generates the PWA icon set from one SVG.
 *
 *   node scripts/make-icons.mjs
 *
 * Uses `sharp`, which is already present as a Next.js dependency — no extra
 * install, and no binary checked into the repo that nobody can regenerate.
 *
 * The mark is the ReRead wordmark's "R" in brand gold on the deep forest
 * green, matching the app's own dark surface so the installed icon looks like
 * the app it opens.
 */
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "icons");
const GREEN = "#0F2A1E";
const GOLD = "#F0C24B";

/**
 * `padding` leaves a safe margin for Android's maskable circle crop, which
 * eats roughly 10% off every edge. The non-maskable icons use less padding so
 * the mark isn't lost in white space on iOS.
 */
function svg(size, { maskable = false } = {}) {
  const radius = maskable ? 0 : size * 0.22;
  const fontSize = maskable ? size * 0.44 : size * 0.56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${GREEN}"/>
  <text
    x="50%" y="50%"
    dy="0.34em"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-style="italic"
    font-weight="500"
    font-size="${fontSize}"
    fill="${GOLD}"
  >R</text>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-192.png", size: 192, maskable: true },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180 },
];

fs.mkdirSync(OUT, { recursive: true });

for (const target of targets) {
  const buffer = Buffer.from(svg(target.size, { maskable: target.maskable }));
  await sharp(buffer).png().toFile(path.join(OUT, target.file));
  console.log(`  ${target.file}  ${target.size}x${target.size}`);
}

// A 32px favicon for browser tabs that ignore the manifest.
await sharp(Buffer.from(svg(64)))
  .resize(32, 32)
  .png()
  .toFile(path.join(process.cwd(), "public", "favicon-32.png"));
console.log("  favicon-32.png  32x32");

console.log("\nIcons written to public/icons/\n");
