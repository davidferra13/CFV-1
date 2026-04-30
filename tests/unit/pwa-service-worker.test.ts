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
    assert.ok(manifest.includes('"start_url": "/"'))
    assert.ok(layout.includes("manifest: '/manifest.json'"))
    assert.ok(layout.includes('appleWebApp'))
  })

  it('ships professional install metadata and visible install surfaces', () => {
    const manifest = JSON.parse(read('public/manifest.json')) as {
      display_override?: string[]
      shortcuts?: Array<{ name: string; icons?: unknown[]; url?: string }>
    }
    const routePolicy = read('lib/auth/route-policy.ts')
    const installPage = read('app/(bare)/install/page.tsx')
    const installGuide = read('components/pwa/install-guide-client.tsx')
    const deviceStatus = read('components/pwa/device-status-panel.tsx')
    const settingsPage = read('app/(chef)/settings/page.tsx')

    assert.ok(
      manifest.display_override?.includes('window-controls-overlay'),
      'manifest should declare a modern display override chain'
    )
    assert.ok(
      manifest.shortcuts?.some((shortcut) => shortcut.name === 'Quick Capture' && shortcut.icons),
      'manifest should expose app shortcuts with icons'
    )
    assert.ok(routePolicy.includes("'/install'"), '/install must be public')
    assert.ok(installPage.includes('InstallGuideClient'), '/install must render the install guide')
    assert.ok(
      installGuide.includes('QRCode.toDataURL'),
      'install page must create a mobile QR code'
    )
    assert.ok(
      deviceStatus.includes('Service worker') && deviceStatus.includes('Offline queue'),
      'device status panel must expose PWA health'
    )
    assert.ok(
      deviceStatus.includes('Copy diagnostics') && deviceStatus.includes('Refresh status'),
      'device status panel must expose copyable diagnostics and manual status refresh'
    )
    assert.ok(
      deviceStatus.includes('/manifest.json') && deviceStatus.includes('Manifest'),
      'device status panel must verify manifest availability'
    )
    assert.ok(
      settingsPage.includes('title="Device App"'),
      'settings must expose the device app install surface'
    )
  })

  it('fails safe when the build version was not stamped into the service worker', () => {
    const serviceWorker = read('public/sw.js')

    assert.ok(
      serviceWorker.includes(
        "const IS_BUILD_VERSION_STAMPED = BUILD_VERSION !== '__BUILD_VERSION__'"
      ),
      'service worker must detect whether its build version was stamped'
    )
    assert.ok(
      serviceWorker.includes(
        'if (!IS_BUILD_VERSION_STAMPED && isNextStaticAssetPath(url.pathname)) {'
      ),
      'unstamped service worker must bypass Next.js runtime chunk caching'
    )
    assert.ok(
      serviceWorker.includes('return IS_BUILD_VERSION_STAMPED'),
      'Next.js runtime assets must only be cacheable when the worker is build-versioned'
    )
  })

  it('stamps the runtime service worker during build and start flows', () => {
    const buildScript = read('scripts/run-next-build.mjs')
    const startScript = read('scripts/run-next-prod.mjs')
    const stampHelper = read('scripts/stamp-service-worker.mjs')

    assert.ok(
      stampHelper.includes('export async function stampServiceWorker'),
      'service worker build-id stamping helper must exist'
    )
    assert.ok(
      buildScript.includes('stampServiceWorker'),
      'production build flow must stamp the service worker with the BUILD_ID'
    )
    assert.ok(
      startScript.includes('stampServiceWorker'),
      'production start flow must verify or repair the stamped service worker before serving traffic'
    )
  })
})
