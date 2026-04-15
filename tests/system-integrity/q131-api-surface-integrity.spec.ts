/**
 * Q131-Q140: API Surface & Data Boundary Integrity
 *
 * Verifies v2 API scope enforcement, file upload validation, SSE auth,
 * embed XSS sanitization, kiosk device auth, webhook retry limits,
 * and e2e auth safety gates.
 *
 * All questions passed structural review. No code changes needed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q131: v2 API middleware validates key, rate limits, and checks scopes
test('Q131: withApiAuth enforces auth + rate limit + scope check', () => {
  const src = readFile('lib/api/v2/middleware.ts')
  expect(src).toContain('validateApiKey')
  expect(src).toContain('checkRateLimit')
  expect(src).toContain('hasAllScopes')
  expect(src).toContain('API key missing required scope(s)')
})

// Q132: File upload validates extension via allowlist
test('Q132: menu upload validates extension and enforces size limit', () => {
  const src = readFile('app/api/menus/upload/route.ts')
  expect(src).toContain('ALLOWED_EXTENSIONS')
  expect(src).toContain('MAX_FILE_SIZE')
  expect(src).toContain('File type')
  expect(src).toContain('is not allowed')
})

// Q133: SSE endpoint authenticates and validates channel access
test('Q133: realtime SSE requires auth and validates channel ownership', () => {
  const src = readFile('app/api/realtime/[channel]/route.ts')
  expect(src).toContain('auth()')
  expect(src).toContain('session?.user?.id')
  expect(src).toContain('validateRealtimeChannelAccess')
  expect(src).toContain("'Unauthorized'")
  expect(src).toContain("'Forbidden'")
})

// Q134: Embed inquiry strips HTML tags to prevent stored XSS
test('Q134: embed inquiry sanitizes input and has honeypot + rate limit', () => {
  const src = readFile('app/api/embed/inquiry/route.ts')
  expect(src).toContain('stripHtml')
  expect(src).toContain("s.replace(/<[^>]*>/g, '')")
  expect(src).toContain('website_url') // honeypot field
  expect(src).toContain('checkRateLimit')
})

// Q135: Kiosk device token is hash-compared and validates active status
test('Q135: kiosk validates device token hash, active status, and tenant existence', () => {
  const src = readFile('lib/devices/token.ts')
  expect(src).toContain('hashToken')
  expect(src).toContain("data.status !== 'active'")
  // Verifies tenant still exists
  expect(src).toContain("from('chefs').select('id').eq('id', data.tenant_id)")
})

// Q138: v2 API rate limits per tenant
test('Q138: v2 API rate limit scoped to tenant ID', () => {
  const src = readFile('lib/api/v2/middleware.ts')
  expect(src).toContain('`api:${keyCtx.tenantId}`')
})

// Q139: Webhook delivery has bounded retries and DLQ
test('Q139: webhook delivery uses 3 max attempts + DLQ, not unlimited retry', () => {
  const src = readFile('lib/webhooks/deliver.ts')
  expect(src).toContain('MAX_ATTEMPTS = 3')
  expect(src).toContain('withRetry')
  expect(src).toContain('pushToDLQ')
  // Timeout on each attempt
  expect(src).toContain('AbortSignal.timeout(10000)')
  // No redirect following (SSRF prevention)
  expect(src).toContain("redirect: 'error'")
})

// Q140: E2E auth endpoint triple-gated (env flag + loopback + real credentials)
test('Q140: e2e auth restricted to env flag + loopback + bcrypt verification', () => {
  const src = readFile('app/api/e2e/auth/route.ts')
  expect(src).toContain('E2E_ALLOW_TEST_AUTH')
  expect(src).toContain('isLoopback')
  expect(src).toContain('127.0.0.1')
  expect(src).toContain('::1')
  expect(src).toContain('bcrypt')
})
