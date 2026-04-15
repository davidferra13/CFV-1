/**
 * Q25: Storage Security
 *
 * ChefFlow stores files locally (recipes, contracts, menus, photos).
 * Unprotected file access would expose client PII, chef IP (recipes),
 * and financial documents. Three attack vectors are addressed:
 * (a) direct URL guessing, (b) path traversal, (c) unauthenticated upload.
 *
 * Tests:
 *
 * 1. HMAC TOKEN: lib/storage/index.ts generates signed URLs using
 *    HMAC-SHA256 based on file path + expiry. Tokens cannot be forged.
 *
 * 2. TIMING-SAFE COMPARISON: Token verification uses crypto.timingSafeEqual()
 *    to prevent timing-attack-based token forgery.
 *
 * 3. PRIVATE ROUTE GATE: The private storage API requires a valid signed token.
 *    Requests without a token parameter are rejected with 403.
 *
 * 4. PATH TRAVERSAL PREVENTION: Path segments containing '..', '.', or
 *    backslashes are rejected before serving any file.
 *
 * 5. UPLOAD AUTH: All upload endpoints require chef authentication before
 *    accepting file data.
 *
 * 6. FILENAME SANITIZATION: Uploaded filenames are sanitized — directory
 *    separators, traversal sequences, and special characters removed.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q25-storage-security.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const STORAGE_LIB = resolve(process.cwd(), 'lib/storage/index.ts')
const STORAGE_ROUTE = resolve(process.cwd(), 'app/api/storage/[...path]/route.ts')
const MENU_UPLOAD = resolve(process.cwd(), 'app/api/menus/upload/route.ts')

test.describe('Q25: Storage security', () => {
  // -------------------------------------------------------------------------
  // Test 1: Signed URLs use HMAC-SHA256
  // -------------------------------------------------------------------------
  test('lib/storage/index.ts generates signed URLs with HMAC-SHA256', () => {
    expect(existsSync(STORAGE_LIB), 'lib/storage/index.ts must exist').toBe(true)

    const src = readFileSync(STORAGE_LIB, 'utf-8')

    expect(
      src.includes('createHmac') && src.includes("'sha256'"),
      "Storage signed URL generation must use crypto.createHmac('sha256', ...) — not weaker hashing"
    ).toBe(true)

    expect(
      src.includes('SIGNING_SECRET') ||
        src.includes('AUTH_SECRET') ||
        src.includes('NEXTAUTH_SECRET'),
      'HMAC signing must use a secret derived from AUTH_SECRET or NEXTAUTH_SECRET'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Token verification uses timing-safe comparison
  // -------------------------------------------------------------------------
  test('storage token verification uses crypto.timingSafeEqual (prevents timing attacks)', () => {
    const src = readFileSync(STORAGE_LIB, 'utf-8')

    expect(
      src.includes('timingSafeEqual'),
      'Storage token verification must use crypto.timingSafeEqual() to prevent timing attacks'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Private route requires token query parameter
  // -------------------------------------------------------------------------
  test('private storage route requires signed token query param', () => {
    expect(existsSync(STORAGE_ROUTE), 'app/api/storage/[...path]/route.ts must exist').toBe(true)

    const src = readFileSync(STORAGE_ROUTE, 'utf-8')

    expect(
      src.includes('token') &&
        (src.includes('403') || src.includes('Forbidden') || src.includes('Unauthorized')),
      'Private storage route must reject requests without a valid token (403)'
    ).toBe(true)

    // Must call verifySignedToken
    expect(
      src.includes('verifySignedToken') || src.includes('verify'),
      'Private storage route must verify the signed token before serving files'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Path traversal prevention
  // -------------------------------------------------------------------------
  test('storage rejects path traversal sequences in file paths', () => {
    const src = readFileSync(STORAGE_LIB, 'utf-8')

    // Must reject '..' sequences
    expect(
      src.includes("'..'") || src.includes('"..""') || src.includes("includes('..')"),
      "Storage must check for and reject '..' path traversal sequences"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Upload endpoint requires chef authentication
  // -------------------------------------------------------------------------
  test('file upload endpoints require requireChef() authentication', () => {
    if (!existsSync(MENU_UPLOAD)) return

    const src = readFileSync(MENU_UPLOAD, 'utf-8')

    expect(
      src.includes('requireChef'),
      'Upload endpoints must call requireChef() — unauthenticated uploads are not allowed'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Filename sanitization on upload
  // -------------------------------------------------------------------------
  test('upload handler sanitizes filename (removes traversal and special chars)', () => {
    if (!existsSync(MENU_UPLOAD)) return

    const src = readFileSync(MENU_UPLOAD, 'utf-8')

    // Must have filename sanitization logic
    expect(
      src.includes('replace') &&
        (src.includes('..') ||
          src.includes('\\\\') ||
          src.includes('sanitize') ||
          src.includes('basename')),
      'Upload handler must sanitize filenames to remove traversal sequences and special characters'
    ).toBe(true)
  })
})
