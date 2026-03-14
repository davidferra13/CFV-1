import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { NATIVE_APP_SCHEME, toNativeAppPath } from '@/lib/mobile/app-links'

describe('mobile app link parsing', () => {
  it('maps production https links into in-app paths', () => {
    assert.equal(
      toNativeAppPath('https://app.cheflowhq.com/receipts?capture=1#preview'),
      '/receipts?capture=1#preview'
    )
  })

  it('maps the custom scheme into in-app paths', () => {
    assert.equal(
      toNativeAppPath(`${NATIVE_APP_SCHEME}://receipts?capture=1`),
      '/receipts?capture=1'
    )
    assert.equal(
      toNativeAppPath(`${NATIVE_APP_SCHEME}://events/abc123/receipts`),
      '/events/abc123/receipts'
    )
  })

  it('rejects unrelated domains and malformed urls', () => {
    assert.equal(toNativeAppPath('https://example.com/receipts'), null)
    assert.equal(toNativeAppPath('not a url'), null)
  })
})
