import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCapacitorNavigationHosts,
  resolveCapacitorServerUrl,
  shouldUseCapacitorCleartext,
} from '@/lib/mobile/capacitor-config'

describe('capacitor config helpers', () => {
  it('falls back to localhost:3100 when CAPACITOR_SERVER_URL is not set', () => {
    const original = process.env.CAPACITOR_SERVER_URL
    delete process.env.CAPACITOR_SERVER_URL

    assert.equal(resolveCapacitorServerUrl(), 'http://localhost:3100')

    // Restore
    if (original !== undefined) process.env.CAPACITOR_SERVER_URL = original
  })

  it('uses CAPACITOR_SERVER_URL when set', () => {
    const original = process.env.CAPACITOR_SERVER_URL
    process.env.CAPACITOR_SERVER_URL = 'http://192.168.1.77:3100'

    assert.equal(resolveCapacitorServerUrl(), 'http://192.168.1.77:3100')

    // Restore
    if (original !== undefined) {
      process.env.CAPACITOR_SERVER_URL = original
    } else {
      delete process.env.CAPACITOR_SERVER_URL
    }
  })

  it('detects cleartext for http URLs', () => {
    assert.equal(shouldUseCapacitorCleartext('http://localhost:3100'), true)
    assert.equal(shouldUseCapacitorCleartext('https://app.cheflowhq.com'), false)
  })

  it('builds navigation hosts from a valid URL', () => {
    assert.deepEqual(buildCapacitorNavigationHosts('https://beta.cheflowhq.com'), [
      'beta.cheflowhq.com',
      '*.cheflowhq.com',
    ])
  })

  it('returns fallback hosts for an invalid URL', () => {
    assert.deepEqual(buildCapacitorNavigationHosts('not-a-url'), ['localhost', '*.cheflowhq.com'])
  })
})
