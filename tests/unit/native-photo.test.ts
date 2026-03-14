import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNativeReceiptFileName,
  isNativePhotoCancellation,
  resolveNativePhotoFormat,
} from '@/lib/mobile/native-photo'

describe('native photo helpers', () => {
  it('prefers a real mime type when one is available', () => {
    assert.deepEqual(resolveNativePhotoFormat('jpeg', 'image/heic'), {
      extension: 'heic',
      mimeType: 'image/heic',
    })
  })

  it('falls back to the reported camera format when the blob has no useful mime type', () => {
    assert.deepEqual(resolveNativePhotoFormat('webp', ''), {
      extension: 'webp',
      mimeType: 'image/webp',
    })
  })

  it('defaults unknown images to jpeg for upload compatibility', () => {
    assert.deepEqual(resolveNativePhotoFormat('raw', 'application/octet-stream'), {
      extension: 'jpg',
      mimeType: 'image/jpeg',
    })
  })

  it('builds stable receipt file names', () => {
    assert.equal(
      buildNativeReceiptFileName('jpg', new Date('2026-03-10T12:34:56.789Z')),
      'receipt-20260310T123456Z.jpg'
    )
  })

  it('detects user-initiated picker cancellation without swallowing unrelated failures', () => {
    assert.equal(isNativePhotoCancellation(new Error('User cancelled photo selection')), true)
    assert.equal(isNativePhotoCancellation(new Error('Permission denied by system policy')), false)
  })
})
