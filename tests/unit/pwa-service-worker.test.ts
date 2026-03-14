import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('pwa service worker regressions', () => {
  it('ships a persistent service worker instead of the self-destruct cleanup worker', () => {
    const serviceWorker = read('public/sw.js')

    assert.ok(
      serviceWorker.includes("self.addEventListener('fetch'"),
      'service worker must handle fetch events for offline support'
    )
    assert.ok(
      serviceWorker.includes("self.addEventListener('push'"),
      'service worker must handle push notifications'
    )
    assert.ok(
      serviceWorker.includes("self.addEventListener('pushsubscriptionchange'"),
      'service worker must handle push subscription rotation'
    )
    assert.ok(
      serviceWorker.includes("self.addEventListener('message'"),
      'service worker must support skip-waiting updates'
    )
    assert.ok(
      !serviceWorker.includes('registration.unregister'),
      'service worker must not unregister itself on activate'
    )
  })

  it('serves the branded offline fallback and standalone manifest metadata', () => {
    const serviceWorker = read('public/sw.js')
    const manifest = read('public/manifest.json')
    const layout = read('app/layout.tsx')

    assert.ok(serviceWorker.includes("const OFFLINE_URL = '/offline.html'"))
    assert.ok(manifest.includes('"display": "standalone"'))
    assert.ok(manifest.includes('"start_url": "/dashboard"'))
    assert.ok(layout.includes("manifest: '/manifest.json'"))
    assert.ok(layout.includes('appleWebApp'))
  })
})
