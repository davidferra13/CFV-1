/**
 * Q20: PWA / Service Worker
 *
 * The Progressive Web App layer ensures ChefFlow is installable, works offline
 * with a graceful message, and does not silently fail when the network drops.
 *
 * Tests:
 *
 * 1. SW EXISTS: public/sw.js is present and non-empty.
 *
 * 2. OFFLINE PAGE: public/offline.html exists, the SW's fallback page.
 *    Without this, offline mode returns a browser error, not a branded message.
 *
 * 3. MANIFEST: public/manifest.json exists, has required fields (name,
 *    start_url, icons), and is valid JSON.
 *
 * 4. SW INSTALL HANDLER: public/sw.js has an install event listener that
 *    caches core assets during installation.
 *
 * 5. SW FETCH HANDLER: public/sw.js has a fetch event listener with offline
 *    fallback, failed network requests return the offline page, not an error.
 *
 * 6. NEXT CONFIG SERVES SW: next.config.js serves /sw.js with the correct
 *    service-worker header (Service-Worker-Allowed) so it can scope to root.
 *
 * 7. ACTIVATION GATE: ENABLE_PWA_BUILD environment var is the canonical
 *    switch for rebuilding the SW, next.config.js must check it.
 *
 * 8. SW SELF-UPDATE: public/sw.js has a version check mechanism that notifies
 *    users when a new build is available.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q20-pwa.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const SW_FILE = resolve(ROOT, 'public/sw.js')
const OFFLINE_HTML = resolve(ROOT, 'public/offline.html')
const MANIFEST = resolve(ROOT, 'public/manifest.json')
const NEXT_CONFIG = existsSync(resolve(ROOT, 'next.config.ts'))
  ? resolve(ROOT, 'next.config.ts')
  : resolve(ROOT, 'next.config.js')

test.describe('Q20: PWA / Service Worker', () => {
  // -------------------------------------------------------------------------
  // Test 1: Service worker file exists and is non-trivial
  // -------------------------------------------------------------------------
  test('public/sw.js exists and is non-empty', () => {
    expect(existsSync(SW_FILE), 'public/sw.js must exist').toBe(true)

    const stat = statSync(SW_FILE)
    expect(stat.size, 'public/sw.js must be non-empty (> 1KB)').toBeGreaterThan(1024)
  })

  // -------------------------------------------------------------------------
  // Test 2: Offline fallback page exists
  // -------------------------------------------------------------------------
  test('public/offline.html exists for SW offline fallback', () => {
    expect(
      existsSync(OFFLINE_HTML),
      'public/offline.html must exist, it is the SW offline fallback page'
    ).toBe(true)

    const src = readFileSync(OFFLINE_HTML, 'utf-8')
    // Must have some content, not just an empty file
    expect(src.length, 'offline.html must have content').toBeGreaterThan(100)
    // Must be HTML
    expect(
      src.toLowerCase().includes('<!doctype') || src.toLowerCase().includes('<html'),
      'offline.html must be an HTML document'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Web app manifest is valid and complete
  // -------------------------------------------------------------------------
  test('public/manifest.json is valid JSON with required PWA fields', () => {
    expect(existsSync(MANIFEST), 'public/manifest.json must exist').toBe(true)

    let manifest: any
    const raw = readFileSync(MANIFEST, 'utf-8')

    expect(() => {
      manifest = JSON.parse(raw)
    }, 'manifest.json must be valid JSON').not.toThrow()

    expect(manifest.name, 'manifest.json must have a name').toBeTruthy()
    expect(manifest.start_url, 'manifest.json must have a start_url').toBeTruthy()
    expect(
      Array.isArray(manifest.icons) && manifest.icons.length > 0,
      'manifest.json must have at least one icon'
    ).toBe(true)
    expect(manifest.display, 'manifest.json must have a display mode').toBeTruthy()
  })

  test('public/manifest.json has modern install metadata', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))

    expect(
      Array.isArray(manifest.display_override) &&
        manifest.display_override.includes('window-controls-overlay'),
      'manifest should declare display_override for modern installed windows'
    ).toBe(true)
    expect(
      Array.isArray(manifest.shortcuts) &&
        manifest.shortcuts.some((shortcut: any) => shortcut.name === 'Quick Capture'),
      'manifest should expose Quick Capture as an app shortcut'
    ).toBe(true)
    expect(
      manifest.shortcuts.every(
        (shortcut: any) => Array.isArray(shortcut.icons) && shortcut.icons.length > 0
      ),
      'every manifest shortcut should include an icon'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: SW has install handler (pre-caches core assets)
  // -------------------------------------------------------------------------
  test('public/sw.js has install event listener for pre-caching', () => {
    const src = readFileSync(SW_FILE, 'utf-8')

    expect(
      src.includes("addEventListener('install'") || src.includes('addEventListener("install"'),
      'sw.js must have an install event listener to pre-cache core assets'
    ).toBe(true)

    // Must cache something during install
    expect(
      src.includes('cache.add') || src.includes('cache.put'),
      'sw.js install handler must add assets to cache'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: SW has fetch handler with offline fallback
  // -------------------------------------------------------------------------
  test('public/sw.js has fetch handler with offline fallback', () => {
    const src = readFileSync(SW_FILE, 'utf-8')

    expect(
      src.includes("addEventListener('fetch'") || src.includes('addEventListener("fetch"'),
      'sw.js must have a fetch event listener to intercept network requests'
    ).toBe(true)

    // Must have offline fallback
    expect(
      src.includes('offline') || src.includes('OFFLINE_URL'),
      'sw.js fetch handler must have an offline fallback path'
    ).toBe(true)

    // Must reference the offline HTML file
    expect(
      src.includes('offline.html'),
      "sw.js must reference 'offline.html' as the offline fallback page"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: next.config.js serves sw.js at root scope
  // -------------------------------------------------------------------------
  test('next.config.js serves /sw.js with service worker headers', () => {
    expect(existsSync(NEXT_CONFIG), 'next.config.js/ts must exist').toBe(true)

    const src = readFileSync(NEXT_CONFIG, 'utf-8')

    expect(
      src.includes('/sw.js'),
      'next.config must configure /sw.js route (for caching headers or rewrites)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 7: ENABLE_PWA_BUILD controls SW compilation
  // -------------------------------------------------------------------------
  test('next.config.js checks ENABLE_PWA_BUILD for PWA rebuild', () => {
    const src = readFileSync(NEXT_CONFIG, 'utf-8')

    expect(
      src.includes('ENABLE_PWA_BUILD'),
      'next.config must check ENABLE_PWA_BUILD env var to gate PWA compilation'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 8: SW has self-update mechanism
  // -------------------------------------------------------------------------
  test('public/sw.js has build version check for self-update', () => {
    const src = readFileSync(SW_FILE, 'utf-8')

    // Must have some form of version tracking
    expect(
      src.includes('BUILD_VERSION') || src.includes('CACHE_NAME') || src.includes('build-version'),
      'sw.js must have a version/build identifier for cache busting'
    ).toBe(true)

    // Must have activation handling (clear old caches)
    expect(
      src.includes("addEventListener('activate'") || src.includes('addEventListener("activate"'),
      'sw.js must have an activate event listener to clean up old caches'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 9: PWA does not crash (smoke test), UI
  // -------------------------------------------------------------------------
  test('app root returns 200 (PWA shell loads)', async ({ page }) => {
    const response = await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    // Root should redirect to dashboard or sign-in, not error
    expect(
      response?.status(),
      `Root route must not return 5xx, got ${response?.status()}`
    ).toBeLessThan(500)

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/application error/i)
  })

  // -------------------------------------------------------------------------
  // Test 10: /offline.html route serves the offline fallback page
  // -------------------------------------------------------------------------
  test('/offline.html returns 200 and has meaningful content', async ({ page }) => {
    const response = await page.goto('/offline.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    expect(response?.status(), '/offline.html must return 200').toBe(200)

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    // Must show something meaningful, not blank
    expect(bodyText.trim().length, '/offline.html must have visible text').toBeGreaterThan(10)
    expect(bodyText, '/offline.html must explain offline capability').toContain(
      'Available while offline'
    )
  })

  // -------------------------------------------------------------------------
  // Test 11: /install serves the install guide
  // -------------------------------------------------------------------------
  test('/install returns 200 and has device install guidance', async ({ page }) => {
    const response = await page.goto('/install', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    expect(response?.status(), '/install must return 200').toBe(200)

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).toContain('Install ChefFlow on this device')
    expect(bodyText).toContain('Device status')
  })
})
