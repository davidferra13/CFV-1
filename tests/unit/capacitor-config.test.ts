import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CAPACITOR_SERVER_URL,
  buildCapacitorNavigationHosts,
  resolveCapacitorServerUrl,
  shouldUseCapacitorCleartext,
} from '@/lib/mobile/capacitor-config'

describe('capacitor config helpers', () => {
  it('falls back to the production app host when NEXT_PUBLIC_APP_URL is local-only', () => {
    assert.equal(
      resolveCapacitorServerUrl({
        NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
      } as NodeJS.ProcessEnv),
      DEFAULT_CAPACITOR_SERVER_URL
    )
  })

  it('uses an explicit Capacitor server override for device testing', () => {
    assert.equal(
      resolveCapacitorServerUrl({
        CAPACITOR_SERVER_URL: 'http://192.168.1.77:3100',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
      } as NodeJS.ProcessEnv),
      'http://192.168.1.77:3100'
    )
  })

  it('keeps public production hosts and computes navigation settings from them', () => {
    const serverUrl = resolveCapacitorServerUrl({
      NEXT_PUBLIC_APP_URL: 'https://beta.cheflowhq.com',
    } as NodeJS.ProcessEnv)

    assert.equal(serverUrl, 'https://beta.cheflowhq.com')
    assert.equal(shouldUseCapacitorCleartext(serverUrl), false)
    assert.deepEqual(buildCapacitorNavigationHosts(serverUrl), [
      'beta.cheflowhq.com',
      'app.cheflowhq.com',
      'cheflowhq.com',
    ])
  })
})
