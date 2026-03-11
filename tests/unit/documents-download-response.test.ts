import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { buildBusinessDocumentDownloadResponse } from '../../lib/documents/download-response.ts'

async function buildPngBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 320,
      height: 220,
      channels: 3,
      background: { r: 248, g: 245, b: 238 },
    },
  })
    .png()
    .toBuffer()
}

test('buildBusinessDocumentDownloadResponse returns the original asset by default', async () => {
  const source = await buildPngBuffer()
  const response = await buildBusinessDocumentDownloadResponse({
    searchParams: new URLSearchParams(),
    record: {
      title: 'Kitchen Scan',
      originalFilename: 'kitchen-scan.png',
      mimeType: 'image/png',
    },
    fileBlob: new Blob([source], { type: 'image/png' }),
  })

  const returned = Buffer.from(await response.arrayBuffer())

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Type'), 'image/png')
  assert.equal(response.headers.get('X-ChefFlow-Document-Variant'), 'original')
  assert.equal(response.headers.get('X-ChefFlow-Source-Preserved'), 'true')
  assert.deepEqual(returned, source)
})

test('buildBusinessDocumentDownloadResponse returns an enhanced preview for supported image docs', async () => {
  const source = await buildPngBuffer()
  const response = await buildBusinessDocumentDownloadResponse({
    searchParams: new URLSearchParams('variant=enhanced'),
    record: {
      title: 'Kitchen Scan',
      originalFilename: 'kitchen-scan.png',
      mimeType: 'image/png',
    },
    fileBlob: new Blob([source], { type: 'image/png' }),
  })

  const returned = Buffer.from(await response.arrayBuffer())
  const sourceMeta = await sharp(source).metadata()
  const returnedMeta = await sharp(returned).metadata()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Type'), 'image/png')
  assert.equal(response.headers.get('X-ChefFlow-Document-Variant'), 'enhanced')
  assert.equal(response.headers.get('X-ChefFlow-Enhancement-Mode'), 'deterministic-upscale')
  assert.equal(response.headers.get('X-ChefFlow-Source-Preserved'), 'true')
  assert.match(
    response.headers.get('Content-Disposition') ?? '',
    /filename="kitchen-scan-enhanced\.png"/
  )
  assert.notDeepEqual(returned, source)
  assert.ok((returnedMeta.width ?? 0) >= (sourceMeta.width ?? 0))
  assert.ok((returnedMeta.height ?? 0) >= (sourceMeta.height ?? 0))
})

test('buildBusinessDocumentDownloadResponse falls back to original for unsupported enhanced requests', async () => {
  const source = Buffer.from('plain text document')
  const response = await buildBusinessDocumentDownloadResponse({
    searchParams: new URLSearchParams('variant=enhanced'),
    record: {
      title: 'Ops Note',
      originalFilename: 'ops-note.txt',
      mimeType: 'text/plain',
    },
    fileBlob: new Blob([source], { type: 'text/plain' }),
  })

  const returned = Buffer.from(await response.arrayBuffer())

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Type'), 'text/plain')
  assert.equal(response.headers.get('X-ChefFlow-Document-Variant'), 'original')
  assert.equal(response.headers.get('X-ChefFlow-Source-Preserved'), 'true')
  assert.deepEqual(returned, source)
})
