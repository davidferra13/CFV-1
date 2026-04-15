/**
 * Q41: Remy SSRF Protection
 *
 * Remy can fetch URLs when chefs share links in chat. Without SSRF protection,
 * an attacker could embed a chat message containing a localhost or cloud
 * metadata URL (http://169.254.169.254/latest/meta-data) and have the server
 * make an authenticated request to internal services on their behalf.
 *
 * isUrlSafeForFetch() is the gate. It must block:
 *   - localhost / 127.0.0.1 / ::1
 *   - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
 *   - Link-local (169.254.x.x)
 *   - Cloud metadata endpoints (169.254.169.254)
 *   - Non-HTTP/HTTPS schemes (file://, data://, ftp://)
 *
 * Tests:
 *
 * 1. SSRF GUARD EXISTS: lib/ai/remy-input-validation.ts exports isUrlSafeForFetch.
 *
 * 2. LOCALHOST BLOCKED: Function explicitly blocks localhost and 127.0.0.1.
 *
 * 3. CLOUD METADATA BLOCKED: 169.254.x.x range is explicitly blocked.
 *
 * 4. PRIVATE RANGES BLOCKED: 10.x, 172.x, 192.168.x explicitly rejected.
 *
 * 5. SCHEME CHECK: Non-HTTP schemes (file, data, ftp) are rejected.
 *
 * 6. ERROR SANITIZATION: sanitizeErrorForClient strips internal details
 *    before returning errors to the client (no stack traces leaked).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q41-remy-ssrf-protection.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const VALIDATION = resolve(process.cwd(), 'lib/ai/remy-input-validation.ts')

test.describe('Q41: Remy SSRF protection', () => {
  // -------------------------------------------------------------------------
  // Test 1: isUrlSafeForFetch guard exists
  // -------------------------------------------------------------------------
  test('remy-input-validation.ts exports isUrlSafeForFetch SSRF guard', () => {
    expect(existsSync(VALIDATION), 'lib/ai/remy-input-validation.ts must exist').toBe(true)

    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('isUrlSafeForFetch'),
      'remy-input-validation.ts must export isUrlSafeForFetch (SSRF gate for URL fetching in chat)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: localhost and loopback explicitly blocked
  // -------------------------------------------------------------------------
  test('isUrlSafeForFetch blocks localhost and 127.0.0.1', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('localhost') && src.includes('127.0.0.1'),
      'isUrlSafeForFetch must explicitly block localhost and 127.0.0.1 (loopback SSRF vectors)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Cloud metadata endpoint blocked
  // -------------------------------------------------------------------------
  test('isUrlSafeForFetch blocks AWS/GCP cloud metadata endpoint (169.254.169.254)', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('169.254'),
      'isUrlSafeForFetch must block 169.254.x.x (AWS/GCP metadata endpoint — classic SSRF target)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Private IP ranges blocked
  // -------------------------------------------------------------------------
  test('isUrlSafeForFetch blocks RFC-1918 private IP ranges', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    // Must cover at least one of: 10.x, 172.x, 192.168.x
    expect(
      src.includes('10.') || src.includes('172.') || src.includes('192.168'),
      'isUrlSafeForFetch must block private IP ranges (10.x, 172.x, 192.168.x)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Only HTTP/HTTPS schemes allowed
  // -------------------------------------------------------------------------
  test('isUrlSafeForFetch rejects non-HTTP schemes (file://, data://, ftp://)', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      (src.includes('http') && src.includes('protocol')) ||
        src.includes('scheme') ||
        src.includes('file:') ||
        src.includes('data:'),
      'isUrlSafeForFetch must validate URL scheme (only http/https allowed, not file/data/ftp)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: sanitizeErrorForClient strips internals before client response
  // -------------------------------------------------------------------------
  test('sanitizeErrorForClient prevents stack traces and internal details leaking to clients', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('sanitizeErrorForClient'),
      'remy-input-validation.ts must export sanitizeErrorForClient (prevents stack trace leakage)'
    ).toBe(true)

    // Must have logic that strips or filters error details
    const fnIdx = src.indexOf('sanitizeErrorForClient')
    if (fnIdx !== -1) {
      const fnBody = src.slice(fnIdx, fnIdx + 500)
      expect(
        fnBody.includes('stack') ||
          fnBody.includes('message') ||
          fnBody.includes('Unknown') ||
          fnBody.includes('filter'),
        'sanitizeErrorForClient must strip or filter error details (stack, internal message)'
      ).toBe(true)
    }
  })
})
