import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {
  buildDeterministicEnhancedDocumentImage,
  canDeterministicallyEnhanceDocumentImage,
} from '../../lib/documents/image-enhancement.ts'

test('canDeterministicallyEnhanceDocumentImage only allows raster document images', () => {
  assert.equal(canDeterministicallyEnhanceDocumentImage('image/png'), true)
  assert.equal(canDeterministicallyEnhanceDocumentImage('image/jpeg'), true)
  assert.equal(canDeterministicallyEnhanceDocumentImage('application/pdf'), false)
  assert.equal(canDeterministicallyEnhanceDocumentImage(null), false)
})

test('buildDeterministicEnhancedDocumentImage upscales smaller scans without changing source class', async () => {
  const source = await sharp(
    Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
        <rect width="100%" height="100%" fill="#f6f2e8" />
        <rect x="36" y="34" width="528" height="332" rx="8" fill="#fffdfa" stroke="#1c1917" stroke-width="2" />
        <line x1="72" y1="96" x2="528" y2="96" stroke="#292524" stroke-width="4" />
        <line x1="72" y1="146" x2="468" y2="146" stroke="#57534e" stroke-width="3" />
        <line x1="72" y1="196" x2="506" y2="196" stroke="#57534e" stroke-width="3" />
        <line x1="72" y1="246" x2="444" y2="246" stroke="#57534e" stroke-width="3" />
      </svg>
    `)
  )
    .png()
    .toBuffer()

  const result = await buildDeterministicEnhancedDocumentImage(source)

  assert.equal(result.contentType, 'image/png')
  assert.equal(result.width, 1200)
  assert.equal(result.height, 800)
  assert.equal(result.scaleFactor, 2)
  assert.ok(result.buffer.byteLength > source.byteLength)
})

test('buildDeterministicEnhancedDocumentImage leaves already-large scans at native dimensions', async () => {
  const source = await sharp({
    create: {
      width: 2800,
      height: 1800,
      channels: 3,
      background: { r: 249, g: 247, b: 241 },
    },
  })
    .png()
    .toBuffer()

  const result = await buildDeterministicEnhancedDocumentImage(source)

  assert.equal(result.width, 2800)
  assert.equal(result.height, 1800)
  assert.equal(result.scaleFactor, 1)
})
