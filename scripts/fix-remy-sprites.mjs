/**
 * Fix broken Remy sprite images.
 *
 * Problem 1: Walk sprite sheet has overlapping character art between cells.
 *            Fix: extract cells, mask out adjacent character pixels using
 *            the gap between characters, then trim.
 * Problem 2: 8 images are full 2080x2048 canvases - trim to content.
 *
 * Run: node scripts/fix-remy-sprites.mjs
 */
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REMY_DIR = path.join(__dirname, '..', 'public', 'images', 'remy')

// ─── Walk Frame Extraction ───────────────────────────────────────────────────
// Source: sprites/remy-body-walk.png (2100x420, 5 cols x 1 row, 420x420 cells)
//
// Each cell has the main character + adjacent character overflow.
// Gap columns (0 opaque pixels) found by scanning:
//   Cell 1: gap at x=323..362 → main is LEFT (x < 323)
//   Cell 2: gap at x=268..306 → main is LEFT (x < 268)
//   Cell 3: gap at x=187..222 → main is RIGHT (x > 222)
//   Cell 4: gap at x=113..140 → main is RIGHT (x > 140)
//   Cell 5: gap at x=75..90  → main is RIGHT (x > 90)

const WALK_CELLS = [
  { mainSide: 'left',  gapStart: 323, gapEnd: 362 },
  { mainSide: 'left',  gapStart: 268, gapEnd: 306 },
  { mainSide: 'right', gapStart: 187, gapEnd: 222 },
  { mainSide: 'right', gapStart: 113, gapEnd: 140 },
  { mainSide: 'right', gapStart: 75,  gapEnd: 90  },
]

async function fixWalkFrames() {
  const src = path.join(REMY_DIR, 'sprites', 'remy-body-walk.png')
  console.log('Fixing walk frames from:', src)

  const cellSize = 420

  for (let i = 0; i < 5; i++) {
    const name = `remy-walk-${i + 1}.png`
    const cell = WALK_CELLS[i]

    // Step 1: extract the 420x420 cell
    const cellBuf = await sharp(src)
      .extract({ left: i * cellSize, top: 0, width: cellSize, height: cellSize })
      .png()
      .toBuffer()

    // Step 2: zero out pixels on the "wrong" side of the gap
    const { data, info } = await sharp(cellBuf)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const channels = info.channels
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * channels
        if (cell.mainSide === 'left' && x >= cell.gapStart) {
          // Zero out everything from gap onwards (adjacent character)
          data[idx + 3] = 0 // set alpha to 0
        } else if (cell.mainSide === 'right' && x <= cell.gapEnd) {
          // Zero out everything up to gap (adjacent character)
          data[idx + 3] = 0
        }
      }
    }

    // Step 3: rebuild image from modified raw data
    const maskedBuf = await sharp(data, {
      raw: { width: info.width, height: info.height, channels },
    })
      .png()
      .toBuffer()

    // Step 4: trim transparent edges
    const trimmedBuf = await sharp(maskedBuf).trim().png().toBuffer()

    const meta = await sharp(trimmedBuf).metadata()
    console.log(`  ${name}: ${meta.width}x${meta.height}`)

    fs.writeFileSync(path.join(REMY_DIR, name), trimmedBuf)
  }
}

// ─── Oversized Image Trimming ────────────────────────────────────────────────

const OVERSIZED_FILES = [
  'remy-idle.png',
  'remy-giddy-surprise.png',
  'remy-hat.png',
  'remy-reassurance.png',
  'remy-sleeping.png',
  'remy-eyes-closed.png',
  'remy-happy-eyes-closed.png',
  'remy-happy-sleeping.png',
]

async function fixOversizedImages() {
  for (const file of OVERSIZED_FILES) {
    const filePath = path.join(REMY_DIR, file)
    const meta = await sharp(filePath).metadata()

    if (meta.width < 800 && meta.height < 800) {
      console.log(`  ${file}: ${meta.width}x${meta.height} - already OK, skipping`)
      continue
    }

    console.log(`  ${file}: ${meta.width}x${meta.height} → trimming...`)

    const trimmedBuf = await sharp(filePath).trim().png().toBuffer()
    const newMeta = await sharp(trimmedBuf).metadata()
    console.log(`    → ${newMeta.width}x${newMeta.height}`)

    fs.writeFileSync(filePath, trimmedBuf)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Fixing Remy Sprite Images ===\n')

  console.log('--- Walk Frames ---')
  await fixWalkFrames()

  console.log('\n--- Oversized Images ---')
  await fixOversizedImages()

  console.log('\nDone!')
}

main().catch(err => {
  console.error('FAILED:', err)
  process.exit(1)
})
