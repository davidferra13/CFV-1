import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPrivateHostname, shouldRegisterServiceWorker } from '@/lib/pwa/runtime'

describe('pwa runtime gating', () => {
  it('treats local and private hosts as ineligible for service worker registration', () => {
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.1.20',
      '10.0.0.12',
      '172.16.10.2',
      '172.31.255.1',
      '::1',
      'kitchen.local',
    ]

    for (const hostname of blockedHosts) {
      assert.equal(isPrivateHostname(hostname), true, `${hostname} should be blocked`)
    }
  })

  it('allows only secure production origins', () => {
    assert.equal(
      shouldRegisterServiceWorker({
        hostname: 'app.cheflowhq.com',
        protocol: 'https:',
        nodeEnv: 'production',
      }),
      true
    )

    assert.equal(
      shouldRegisterServiceWorker({
        hostname: 'beta.cheflowhq.com',
        protocol: 'https:',
        nodeEnv: 'production',
      }),
      true
    )

    assert.equal(
      shouldRegisterServiceWorker({
        hostname: 'app.cheflowhq.com',
        protocol: 'http:',
        nodeEnv: 'production',
      }),
      false
    )

    assert.equal(
      shouldRegisterServiceWorker({
        hostname: 'localhost',
        protocol: 'https:',
        nodeEnv: 'production',
      }),
      false
    )

    assert.equal(
      shouldRegisterServiceWorker({
        hostname: 'app.cheflowhq.com',
        protocol: 'https:',
        nodeEnv: 'development',
      }),
      false
    )
  })
})
