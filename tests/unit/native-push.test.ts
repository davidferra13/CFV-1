import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Test the native push module in a non-native environment
describe('native push', () => {
  it('isNativePlatform returns false outside Capacitor', async () => {
    const { isNativePlatform } = await import('../../lib/mobile/native-push')
    assert.equal(isNativePlatform(), false)
  })

  it('registerNativePush is a no-op outside Capacitor', async () => {
    const { registerNativePush } = await import('../../lib/mobile/native-push')
    // Should resolve without error (early return because not native)
    await registerNativePush(() => {})
  })

  it('exports the expected public API', async () => {
    const mod = await import('../../lib/mobile/native-push')
    assert.equal(typeof mod.isNativePlatform, 'function')
    assert.equal(typeof mod.registerNativePush, 'function')
  })
})
