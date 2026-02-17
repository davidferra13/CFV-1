/**
 * Generate PWA icons from SVG template.
 * Run: node scripts/generate-pwa-icons.js
 *
 * Creates 192px and 512px icons (regular + maskable) in public/
 * Maskable icons have extra padding so the logo isn't clipped on Android.
 */

const fs = require('fs');
const path = require('path');

// Regular icon SVG (logo fills the frame)
function regularSvg(size) {
  const fontSize = Math.round(size * 0.4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#111827"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${fontSize}"
    fill="#ffffff" letter-spacing="-0.02em">CF</text>
</svg>`;
}

// Maskable icon SVG (safe zone = inner 80%, so add padding)
function maskableSvg(size) {
  const fontSize = Math.round(size * 0.32);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#111827"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${fontSize}"
    fill="#ffffff" letter-spacing="-0.02em">CF</text>
</svg>`;
}

const publicDir = path.join(__dirname, '..', 'public');

const icons = [
  { name: 'icon-192.png', svg: regularSvg(192), size: 192 },
  { name: 'icon-512.png', svg: regularSvg(512), size: 512 },
  { name: 'icon-maskable-192.png', svg: maskableSvg(192), size: 192 },
  { name: 'icon-maskable-512.png', svg: maskableSvg(512), size: 512 },
];

// Write SVGs first (they work as PWA icons in modern browsers,
// and we can convert to PNG later with a real image tool)
for (const icon of icons) {
  // Write SVG versions for now
  const svgName = icon.name.replace('.png', '.svg');
  fs.writeFileSync(path.join(publicDir, svgName), icon.svg);
  console.log(`Created ${svgName}`);
}

console.log('\nSVG icons created! For production PNG conversion, use:');
console.log('  npx sharp-cli -i public/icon-192.svg -o public/icon-192.png');
console.log('  npx sharp-cli -i public/icon-512.svg -o public/icon-512.png');
console.log('  (etc.)');
console.log('\nFor now, updating manifest to use SVG icons...');

// Update manifest to use SVG since we don't have sharp installed
const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.icons = [
  { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
  { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
  { src: '/icon-maskable-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
  { src: '/icon-maskable-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated manifest.json to reference SVG icons.');
