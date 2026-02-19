/**
 * generate-icons.ts
 * One-time script to produce PWA icon PNGs from logo.png.
 * Run with: npx tsx scripts/generate-icons.ts
 */
import sharp from 'sharp'
import path from 'path'

const publicDir = path.join(process.cwd(), 'public')
const source = path.join(publicDir, 'logo.png')

const icons = [
  { output: 'apple-touch-icon.png', size: 180 },
  { output: 'icon-192.png', size: 192 },
  { output: 'icon-512.png', size: 512 },
  { output: 'icon-maskable-192.png', size: 192 },
  { output: 'icon-maskable-512.png', size: 512 },
]

async function generate() {
  for (const { output, size } of icons) {
    const dest = path.join(publicDir, output)
    await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 17, g: 24, b: 39, alpha: 1 } })
      .png()
      .toFile(dest)
    console.log(`✓ Generated ${output} (${size}×${size})`)
  }
  console.log('\nDone. All PWA icons generated.')
}

generate().catch((err) => {
  console.error('Icon generation failed:', err)
  process.exit(1)
})
