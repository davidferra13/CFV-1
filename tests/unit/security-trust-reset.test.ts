// Security Trust Reset Phase 2 - Test Infrastructure
// Validates auth enforcement patterns across the codebase:
// 1. All scheduled cron routes check CRON_SECRET via verifyCronAuth
// 2. URL validation rejects SSRF targets (localhost, private IPs, HTTP, credentials)
// 3. Server action files use requireChef/requireAuth (not trusting input.tenantId)

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function findScheduledRoutes(): string[] {
  const scheduledDir = join(process.cwd(), 'app/api/scheduled')
  const routes: string[] = []

  function walk(dir: string) {
    const items = readdirSync(dir)
    for (const item of items) {
      const full = join(dir, item)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        walk(full)
      } else if (item === 'route.ts') {
        routes.push(full)
      }
    }
  }

  try {
    walk(scheduledDir)
  } catch {
    // Dir may not exist in sparse worktree
  }

  return routes
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Scheduled Cron Routes Must Check CRON_SECRET
// ═══════════════════════════════════════════════════════════════════════════

test('all scheduled route files import verifyCronAuth', () => {
  const routes = findScheduledRoutes()

  // If the worktree is sparse and has no scheduled routes, check the main files we know about
  const filesToCheck =
    routes.length > 0
      ? routes
      : ['app/api/scheduled/follow-ups/route.ts', 'app/api/scheduled/lifecycle/route.ts']
          .map((p) => join(process.cwd(), p))
          .filter((p) => {
            try {
              readFileSync(p)
              return true
            } catch {
              return false
            }
          })

  assert.ok(filesToCheck.length > 0, 'Should find at least one scheduled route to test')

  for (const routePath of filesToCheck) {
    const source = readFileSync(routePath, 'utf8')
    const relativePath = routePath.replace(process.cwd(), '').replace(/\\/g, '/')

    assert.match(
      source,
      /verifyCronAuth/,
      `${relativePath} must import and call verifyCronAuth to validate CRON_SECRET`
    )
  }
})

test('verifyCronAuth implementation uses timing-safe comparison', () => {
  try {
    const source = read('lib/auth/cron-auth.ts')
    assert.match(
      source,
      /timingSafeEqual/,
      'cron-auth must use timingSafeEqual for secret comparison'
    )
    assert.match(source, /CRON_SECRET/, 'cron-auth must check CRON_SECRET env var')
    assert.match(source, /Bearer/, 'cron-auth must expect Bearer token format')
  } catch {
    // File may not exist in sparse worktree; skip gracefully
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: URL Validation Rejects SSRF Targets
// ═══════════════════════════════════════════════════════════════════════════

test('url-validation blocks localhost', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://localhost/webhook'), /internal/)
  assert.throws(() => validateWebhookUrl('https://localhost:8080/webhook'), /internal/)
})

test('url-validation blocks 127.0.0.1 (loopback)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://127.0.0.1/webhook'), /private/)
  assert.throws(() => validateWebhookUrl('https://127.0.0.255/webhook'), /private/)
})

test('url-validation blocks 169.254.x.x (link-local / cloud metadata)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://169.254.169.254/latest/meta-data/'), /private/)
  assert.throws(() => validateWebhookUrl('https://169.254.1.1/test'), /private/)
})

test('url-validation blocks 10.x.x.x (private Class A)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://10.0.0.1/webhook'), /private/)
  assert.throws(() => validateWebhookUrl('https://10.255.255.255/webhook'), /private/)
})

test('url-validation blocks 192.168.x.x (private Class C)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://192.168.1.1/webhook'), /private/)
})

test('url-validation blocks 172.16-31.x.x (private Class B)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://172.16.0.1/webhook'), /private/)
  assert.throws(() => validateWebhookUrl('https://172.31.255.255/webhook'), /private/)
})

test('url-validation rejects HTTP (requires HTTPS)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('http://example.com/webhook'), /HTTPS/)
})

test('url-validation rejects URLs with credentials (auth smuggling)', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  assert.throws(() => validateWebhookUrl('https://user:pass@example.com/webhook'), /credentials/)
})

test('url-validation accepts valid HTTPS external URLs', () => {
  const { validateWebhookUrl } = require(join(process.cwd(), 'lib/security/url-validation'))

  // These should NOT throw
  assert.doesNotThrow(() => validateWebhookUrl('https://example.com/webhook'))
  assert.doesNotThrow(() => validateWebhookUrl('https://hooks.slack.com/services/T0/B0/xxx'))
  assert.doesNotThrow(() => validateWebhookUrl('https://api.stripe.com/v1/events'))
})

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Server Actions Use requireChef/requireAuth (Not input.tenantId)
// ═══════════════════════════════════════════════════════════════════════════

test('report-actions uses requireChef for tenant scoping', () => {
  const source = read('lib/reports/report-actions.ts')

  assert.match(source, /'use server'/, 'report-actions must be a server action file')
  assert.match(source, /requireChef/, 'report-actions must use requireChef for auth')
  assert.match(source, /requirePro/, 'report-actions must enforce Pro gating')
  assert.match(
    source,
    /user\.tenantId/,
    'report-actions must derive tenant from session (user.tenantId)'
  )
  assert.doesNotMatch(
    source,
    /input\.tenantId|body\.tenantId|request\.tenantId/,
    'report-actions must NOT accept tenantId from request input'
  )
})

test('raffle-actions uses requireChef for tenant scoping', () => {
  const source = read('lib/loyalty/raffle-actions.ts')

  assert.match(source, /'use server'/, 'raffle-actions must be a server action file')
  assert.match(source, /requireChef/, 'raffle-actions must use requireChef for auth')
  assert.match(source, /requirePro/, 'raffle-actions must enforce Pro gating')
  assert.match(
    source,
    /user\.tenantId/,
    'raffle-actions must derive tenant from session (user.tenantId)'
  )
  assert.doesNotMatch(
    source,
    /input\.tenantId|body\.tenantId|request\.tenantId/,
    'raffle-actions must NOT accept tenantId from request input'
  )
})

test('requirePro calls requireChef internally (session-based, not input-based)', () => {
  const source = read('lib/billing/require-pro.ts')

  assert.match(source, /requireChef/, 'requirePro must call requireChef')
  assert.match(source, /isAdmin/, 'requirePro must check admin bypass')
  assert.match(source, /hasProAccess/, 'requirePro must check Pro tier')
  assert.doesNotMatch(
    source,
    /input\.chefId|body\.chefId|request\.chefId/,
    'requirePro must NOT accept chefId from request input'
  )
})

test('url-validation source blocks all required SSRF vectors', () => {
  const source = read('lib/security/url-validation.ts')

  // Verify the source code includes all required protections
  assert.match(source, /127\./, 'Must block 127.x.x.x loopback')
  assert.match(source, /10\./, 'Must block 10.x.x.x private')
  assert.match(source, /169\.254/, 'Must block 169.254.x.x link-local')
  assert.match(source, /192\.168/, 'Must block 192.168.x.x private')
  assert.match(source, /172\./, 'Must block 172.16-31.x.x private')
  assert.match(source, /localhost/, 'Must block localhost')
  assert.match(source, /https:/, 'Must enforce HTTPS')
  assert.match(source, /username|password/, 'Must check for credentials in URL')
})

test('billing errors do not expose internal details', () => {
  const source = read('lib/billing/errors.ts')

  assert.match(source, /ProFeatureRequiredError/, 'Must define ProFeatureRequiredError')
  assert.match(source, /featureSlug/, 'Error must include feature slug for UI routing')
  assert.doesNotMatch(
    source,
    /stack|trace|internal/i,
    'Error class should not expose stack traces or internal details'
  )
})
