import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

test('conversion relay denies missing admin context before processing event data', async () => {
  const react = createRequire(import.meta.url)('react')
  const originalCache = react.cache
  // Next supplies React cache in its server runtime; use an uncached adapter in Node.
  react.cache ??= (callback: unknown) => callback
  try {
    const { POST } = await import('../../app/api/tracking/meta-capi/route')
    const request = new NextRequest('http://localhost/api/tracking/meta-capi', { method: 'POST' })
    let bodyRead = false
    request.json = async () => {
      bodyRead = true
      throw new Error('Unauthorized body must not be read')
    }
    const response = await POST(request)
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: 'Forbidden' })
    assert.equal(bodyRead, false)
  } finally {
    if (originalCache === undefined) delete react.cache
    else react.cache = originalCache
  }
})
