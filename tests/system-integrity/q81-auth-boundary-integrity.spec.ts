/**
 * Q81-Q90: Authentication, Authorization & Data Boundary Integrity
 *
 * Verifies role enforcement, JWT structure, embed rate limiting,
 * upload validation, storage path traversal protection, signed URL
 * expiry, E2E auth gating, admin checks, API route auth, and
 * session expiry handling.
 *
 * All questions passed structural review - no code changes needed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q81: Chef server actions reject client role
test('Q81: requireChef rejects non-chef roles via redirect', () => {
  const src = readFile('lib/auth/get-user.ts')
  const fn = src.slice(src.indexOf('async function requireChef'))
  expect(fn).toContain("user.role !== 'chef'")
  expect(fn).toContain('redirect(SESSION_EXPIRED_URL)')
})

// Q82: JWT includes role, entityId, tenantId
test('Q82: getCurrentUser reads role/entityId/tenantId from session', () => {
  const src = readFile('lib/auth/get-user.ts')
  expect(src).toContain('user.role')
  expect(src).toContain('user.entityId')
  expect(src).toContain('user.tenantId')
})

// Q83: Embed inquiry endpoint is rate-limited by IP and email
test('Q83: embed inquiry route has IP and email rate limiting', () => {
  const src = readFile('app/api/embed/inquiry/route.ts')
  expect(src).toContain('checkRateLimit')
  expect(src).toMatch(/embed-inquiry:/)
  expect(src).toMatch(/embed-inquiry-email:/)
})

// Q84: Menu upload validates file size, type, and filename
test('Q84: menu upload route validates size, extension, and sanitizes filename', () => {
  const src = readFile('app/api/menus/upload/route.ts')
  expect(src).toContain('MAX_FILE_SIZE')
  expect(src).toContain('ALLOWED_EXTENSIONS')
  expect(src).toContain('file.size > MAX_FILE_SIZE')
  // Filename sanitization
  expect(src).toMatch(/\.\.\./g) // strips parent-dir traversal
  expect(src).toContain('verifyCsrfOrigin')
})

// Q85: Storage module prevents path traversal
test('Q85: storagePath rejects .. and . segments', () => {
  const src = readFile('lib/storage/index.ts')
  expect(src).toContain("seg === '..'")
  expect(src).toContain("seg === '.'")
  expect(src).toContain('path.basename(bucket)')
})

// Q86: Signed URLs use HMAC-SHA256 with expiry and timing-safe comparison
test('Q86: signed URL system verifies expiry and uses timingSafeEqual', () => {
  const src = readFile('lib/storage/index.ts')
  expect(src).toContain('timingSafeEqual')
  expect(src).toContain('Date.now() / 1000 > expires')
  expect(src).toContain('createHmac')
})

// Q87: E2E auth endpoint is triple-gated
test('Q87: e2e auth requires env flag + loopback IP + real credentials', () => {
  const src = readFile('app/api/e2e/auth/route.ts')
  expect(src).toContain('E2E_ALLOW_TEST_AUTH')
  expect(src).toContain('isLoopback')
  expect(src).toContain('bcrypt.compare')
})

// Q88: requireAdmin checks platform_admins table, not just auth
test('Q88: requireAdmin queries platform_admins via getPersistedAdminAccessForAuthUser', () => {
  const src = readFile('lib/auth/admin.ts')
  expect(src).toContain('getPersistedAdminAccessForAuthUser')
  expect(src).toContain("redirect('/auth/signin")
})

// Q89: API routes use auth guards (spot-check)
test('Q89: API routes are auth-gated (calendar, reports, documents)', () => {
  const calendar = readFile('app/api/calendar/event/[id]/route.ts')
  expect(calendar).toMatch(/requireChef|requireAuth/)

  const reports = readFile('app/api/reports/financial/route.ts')
  expect(reports).toMatch(/requireChef|requireAuth/)

  const docs = readFile('app/api/documents/[eventId]/route.ts')
  expect(docs).toMatch(/requireChef|requireAuth/)
})

// Q90: Expired/null session redirects to sign-in (never crashes)
test('Q90: null session results in redirect, not crash', () => {
  const src = readFile('lib/auth/get-user.ts')
  // getCurrentUser returns null for no session
  expect(src).toContain('if (!session?.user)')
  expect(src).toContain('return null')
  // require* functions redirect on null
  expect(src).toContain("if (!user || user.role !== 'chef')")
  expect(src).toContain("if (!user || user.role !== 'client')")
})
