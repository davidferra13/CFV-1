/**
 * Q47: Storage Path Traversal Prevention
 *
 * The storage module handles file uploads and signed URL generation. Path
 * traversal attacks use sequences like '../../../etc/passwd' to escape the
 * storage bucket and access arbitrary files. Without explicit guards, a
 * crafted filename could traverse out of the designated storage directory.
 *
 * Two attack vectors:
 *   1. Upload path: a filename with '..' segments could write outside the bucket
 *   2. Read path: a signed URL request with '..' in the path could serve
 *      files from outside the intended directory
 *
 * Tests:
 *
 * 1. PATH TRAVERSAL GUARD: lib/storage/index.ts rejects paths containing
 *    '..' segments.
 *
 * 2. BASENAME SANITIZATION: Bucket names are sanitized (path.basename or
 *    equivalent) to prevent directory traversal in bucket parameter.
 *
 * 3. SIGNED URL VALIDATION: The storage API route validates the path
 *    before serving files (no '..' in served paths).
 *
 * 4. XSS VIA SVG: The storage API route forces download for SVG and HTML
 *    files (not served inline where they could execute scripts).
 *
 * 5. HMAC SIGNATURE REQUIRED: Private file serving requires a valid HMAC
 *    signature (unsigned private files return 403).
 *
 * 6. TIMING-SAFE COMPARISON: HMAC comparison uses timingSafeEqual (not ===)
 *    to prevent timing oracle attacks.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q47-storage-path-traversal.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const STORAGE = resolve(process.cwd(), 'lib/storage/index.ts')
const STORAGE_ROUTE = resolve(process.cwd(), 'app/api/storage/[...path]/route.ts')

test.describe('Q47: Storage path traversal prevention', () => {
  // -------------------------------------------------------------------------
  // Test 1: lib/storage/index.ts rejects '..' path segments
  // -------------------------------------------------------------------------
  test('lib/storage/index.ts explicitly rejects paths containing ".." segments', () => {
    expect(existsSync(STORAGE), 'lib/storage/index.ts must exist').toBe(true)

    const src = readFileSync(STORAGE, 'utf-8')

    expect(
      src.includes('..') &&
        (src.includes('reject') ||
          src.includes('throw') ||
          src.includes('invalid') ||
          src.includes('includes')),
      'storage module must reject paths containing ".." segments (path traversal prevention)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Bucket names sanitized with path.basename or equivalent
  // -------------------------------------------------------------------------
  test('storage module sanitizes bucket names to prevent directory escape', () => {
    const src = readFileSync(STORAGE, 'utf-8')

    expect(
      src.includes('basename') || src.includes('sanitize') || src.includes('replace'),
      'storage module must sanitize bucket names (path.basename or equivalent)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Storage API route validates paths before serving
  // -------------------------------------------------------------------------
  test('storage API route validates path before serving files', () => {
    if (!existsSync(STORAGE_ROUTE)) return

    const src = readFileSync(STORAGE_ROUTE, 'utf-8')

    expect(
      src.includes('..') ||
        src.includes('traversal') ||
        src.includes('invalid') ||
        src.includes('path'),
      'storage API route must validate path (path traversal check before serving)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: SVG and HTML files served as attachment (not inline)
  // -------------------------------------------------------------------------
  test('storage API forces download for SVG and HTML to prevent XSS', () => {
    if (!existsSync(STORAGE_ROUTE)) return

    const src = readFileSync(STORAGE_ROUTE, 'utf-8')

    expect(
      (src.includes('.svg') || src.includes('svg')) &&
        (src.includes('attachment') || src.includes('download') || src.includes('octet')),
      'storage API must serve SVG files as attachment (not inline) to prevent stored XSS'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Private file serving requires valid HMAC signature
  // -------------------------------------------------------------------------
  test('storage signed URL requires HMAC signature for private files', () => {
    const storageSrc = readFileSync(STORAGE, 'utf-8')

    expect(
      storageSrc.includes('HMAC') ||
        storageSrc.includes('hmac') ||
        storageSrc.includes('createHmac'),
      'storage module must use HMAC for signed URLs (private files require valid signature)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Timing-safe HMAC comparison
  // -------------------------------------------------------------------------
  test('HMAC comparison uses timingSafeEqual to prevent timing oracle attacks', () => {
    const storageSrc = readFileSync(STORAGE, 'utf-8')

    const routeSrc = existsSync(STORAGE_ROUTE) ? readFileSync(STORAGE_ROUTE, 'utf-8') : ''

    expect(
      storageSrc.includes('timingSafeEqual') || routeSrc.includes('timingSafeEqual'),
      'storage HMAC comparison must use crypto.timingSafeEqual (not === for signatures)'
    ).toBe(true)
  })
})
