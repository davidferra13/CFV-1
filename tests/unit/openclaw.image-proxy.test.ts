import test from 'node:test'
import assert from 'node:assert/strict'
import { toOpenClawImageProxyUrl } from '@/lib/openclaw/image-proxy'

test('returns null for empty image input', () => {
  assert.equal(toOpenClawImageProxyUrl(null), null)
  assert.equal(toOpenClawImageProxyUrl(undefined), null)
  assert.equal(toOpenClawImageProxyUrl('   '), null)
})

test('leaves same-origin and inline image sources untouched', () => {
  assert.equal(toOpenClawImageProxyUrl('/images/item.png'), '/images/item.png')
  assert.equal(
    toOpenClawImageProxyUrl('data:image/png;base64,abc123'),
    'data:image/png;base64,abc123'
  )
  assert.equal(
    toOpenClawImageProxyUrl('blob:https://example.com/abc'),
    'blob:https://example.com/abc'
  )
})

test('proxies absolute remote image URLs through the app route', () => {
  const raw = 'https://www.instacart.com/image-server/200x200/foo.jpg'
  assert.equal(toOpenClawImageProxyUrl(raw), `/api/openclaw/image?url=${encodeURIComponent(raw)}`)
})

test('does not double-proxy existing openclaw proxy URLs', () => {
  const proxied = '/api/openclaw/image?url=https%3A%2F%2Fcdn.example.com%2Fitem.jpg'
  assert.equal(toOpenClawImageProxyUrl(proxied), proxied)
})
