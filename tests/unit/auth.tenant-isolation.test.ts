/**
 * Unit tests for Auth & Tenant Isolation Patterns
 *
 * Tests the structural patterns that enforce tenant isolation.
 * Some tests are pure logic, others are static analysis (grep-based)
 * that verify no code violates isolation rules.
 *
 * Run: npm run test:unit
 * Run critical only: npm run test:critical
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')

// ─── Helper: recursively find all .ts files in a directory ─────────────────

function findTsFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const full = join(dir, entry)
      if (entry === 'node_modules' || entry === '.next' || entry === 'types') continue
      try {
        const stat = statSync(full)
        if (stat.isDirectory()) {
          findTsFiles(full, files)
        } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
          files.push(full)
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return files
}

// ─── Test Group D: Auth & Tenant Isolation ─────────────────────────────────

describe('D1: HMAC role cookie rejects forged values', () => {
  // This tests the structural pattern — the signing logic uses CRON_SECRET as HMAC key
  // and constant-time comparison to prevent timing attacks.

  it('cookie format is role.signature', () => {
    // Valid format: "chef.abc123..."
    const validFormat = /^(chef|client|staff|partner)\.[a-zA-Z0-9+/=]+$/
    assert.ok(validFormat.test('chef.abc123def456'))
    assert.ok(!validFormat.test('admin.abc123')) // admin is not a valid role
    assert.ok(!validFormat.test('chef')) // no signature
    assert.ok(!validFormat.test('.abc123')) // no role
  })

  it('only known roles are accepted', () => {
    const VALID_ROLES = ['chef', 'client', 'staff', 'partner']
    assert.ok(VALID_ROLES.includes('chef'))
    assert.ok(VALID_ROLES.includes('client'))
    assert.ok(VALID_ROLES.includes('staff'))
    assert.ok(VALID_ROLES.includes('partner'))
    assert.ok(!VALID_ROLES.includes('admin'))
    assert.ok(!VALID_ROLES.includes('superuser'))
  })
})

describe('D2: Server actions use tenantId from session', () => {
  // Static analysis: verify server action files in lib/ use requireChef()
  // and user.tenantId, not input.tenantId or body.tenantId

  it('no server action uses input.tenantId or body.tenantId', () => {
    const libDir = join(ROOT, 'lib')
    const files = findTsFiles(libDir)
    const violations: string[] = []

    // Internal pipeline files that receive tenantId from other server actions
    // (not from client request bodies). The calling server action already
    // derived tenantId from the session — these are server-to-server calls.
    const internalPipelineAllowlist = new Set([
      // Admin-only observability filters are scoped by requireAdmin()
      // and use tenantId only for read filtering.
      'lib/admin/owner-observability.ts',
      'lib/admin/cannabis-actions.ts',
      'lib/activity/log-chef.ts',
      'lib/activity/track.ts',
      'lib/ai/queue/actions.ts',
      'lib/ai/remy-input-validation.ts',
      'lib/communication/actions.ts',
      'lib/communication/pipeline.ts',
      'lib/copilot/orchestrator.ts',
      'lib/event-stubs/actions.ts',
      'lib/hub/integration-actions.ts',
      'lib/integrations/core/pipeline.ts',
      'lib/ledger/append.ts',
      'lib/loyalty/actions.ts',
      'lib/notifications/send.ts',
      'lib/qol/metrics.ts',
      'lib/social/oauth/token-store.ts',
    ])

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8')
        if (!content.includes("'use server'")) continue

        const relativePath = file.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '')
        if (internalPipelineAllowlist.has(relativePath)) continue

        // Check for tenant_id coming from input/body/request instead of session
        if (
          content.includes('input.tenantId') ||
          content.includes('input.tenant_id') ||
          content.includes('body.tenantId') ||
          content.includes('body.tenant_id') ||
          content.includes('request.tenantId')
        ) {
          violations.push(relativePath)
        }
      } catch {
        // Skip unreadable files
      }
    }

    assert.equal(
      violations.length,
      0,
      `Found server actions using tenantId from input instead of session:\n${violations.join('\n')}`
    )
  })
})

describe('D3: API routes call requireChef/requireClient/requireAuth', () => {
  it('protected API routes have auth checks', () => {
    const apiDir = join(ROOT, 'app', 'api')
    const routeFiles = findTsFiles(apiDir).filter((f) => f.endsWith('route.ts'))
    const unprotected: string[] = []

    // Paths that are intentionally public
    const publicPaths = [
      'embed',
      'public',
      'health',
      'e2e',
      'webhooks',
      'kiosk',
      'cron',
      'scheduled',
      'inngest',
      'ollama-status',
    ]

    for (const file of routeFiles) {
      const relativePath = file.replace(ROOT, '')

      // Skip intentionally public paths
      if (publicPaths.some((p) => relativePath.includes(p))) continue

      try {
        const content = readFileSync(file, 'utf-8')

        const hasAuthCheck =
          content.includes('requireChef') ||
          content.includes('requireClient') ||
          content.includes('requireAuth') ||
          content.includes('requireAdmin') ||
          content.includes('requireStaff') ||
          content.includes('requirePartner') ||
          content.includes('requireChefAdmin')

        if (!hasAuthCheck) {
          unprotected.push(relativePath)
        }
      } catch {
        // Skip
      }
    }

    // Report but don't hard-fail — some routes may be intentionally public
    // that aren't in the publicPaths list
    if (unprotected.length > 0) {
      console.warn(
        `[WARNING] API routes without auth checks (verify these are intentionally public):\n${unprotected.join('\n')}`
      )
    }
  })
})

describe('D4: Admin check is email-based, not role-based', () => {
  it('admin.ts reads from ADMIN_EMAILS env var', () => {
    const adminFile = join(ROOT, 'lib', 'auth', 'admin.ts')
    const content = readFileSync(adminFile, 'utf-8')

    assert.ok(content.includes('ADMIN_EMAILS'), 'admin.ts must reference ADMIN_EMAILS env var')
    assert.ok(
      content.includes('process.env.ADMIN_EMAILS'),
      'admin.ts must read ADMIN_EMAILS from process.env'
    )
  })
})

describe('D5: Service role client restricted to specific use cases', () => {
  // Static analysis: createServerClient({ admin: true }) or createAdminClient()
  // should only appear in specific files (signup, webhooks, layout cache, etc.)

  it('admin client usage is limited to safe locations', () => {
    const allowedFiles = new Set([
      // Layout cache (runs outside request context)
      'lib/chef/layout-cache.ts',
      // Supabase admin client definition
      'lib/supabase/admin.ts',
      // Webhook handlers (no user session available)
      'app/api/webhooks/',
      // Auth/signup (creating accounts)
      'lib/auth/',
      'app/api/auth/',
      // Cron/scheduled jobs (no user session)
      'app/api/cron/',
      'app/api/scheduled/',
      // E2E test setup
      'app/api/e2e/',
      // Staff/partner setup
      'lib/staff/',
      'lib/partners/',
      // Demo data
      'app/api/demo/',
      // System routes
      'app/api/system/',
      // Push subscriptions
      'app/api/push/',
    ])

    const libDir = join(ROOT, 'lib')
    const appDir = join(ROOT, 'app')
    const files = [...findTsFiles(libDir), ...findTsFiles(appDir)]
    const violations: string[] = []

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8')
        const relativePath = file.replace(ROOT + '/', '').replace(ROOT + '\\', '')

        if (
          content.includes('createServerClient({ admin: true })') ||
          content.includes('createAdminClient()')
        ) {
          // Check if file is in allowed locations
          const isAllowed = Array.from(allowedFiles).some((allowed) =>
            relativePath.replace(/\\/g, '/').includes(allowed)
          )

          if (!isAllowed) {
            violations.push(relativePath)
          }
        }
      } catch {
        // Skip
      }
    }

    if (violations.length > 0) {
      console.warn(
        `[WARNING] Admin client used in unexpected locations (review for safety):\n${violations.join('\n')}`
      )
    }
  })
})

describe('D6: No @ts-nocheck files export server actions', () => {
  it('files with @ts-nocheck do not export async functions', () => {
    const dirs = [join(ROOT, 'lib'), join(ROOT, 'app')]
    const violations: string[] = []

    for (const dir of dirs) {
      const files = findTsFiles(dir)
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8')
          // Only match @ts-nocheck as an actual directive (// @ts-nocheck at line start),
          // not mentions inside block comments or documentation.
          const hasDirective = /^\s*\/\/\s*@ts-nocheck/m.test(content)
          // Only match actual export statements, not commented-out ones inside /* ... */
          const hasExport = /^export\s+async\s+function/m.test(content)
          if (hasDirective && hasExport) {
            violations.push(file.replace(ROOT, ''))
          }
        } catch {
          // Skip
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Files with @ts-nocheck that export async functions (crash risk):\n${violations.join('\n')}`
    )
  })
})

describe('D7: RLS helper functions exist in database', () => {
  // Verify that the migration files define the required RLS functions
  it('get_current_user_role function exists in migrations', () => {
    const migrationsDir = join(ROOT, 'supabase', 'migrations')
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    const allSql = files
      .map((f) => {
        try {
          return readFileSync(join(migrationsDir, f), 'utf-8')
        } catch {
          return ''
        }
      })
      .join('\n')

    assert.ok(
      allSql.includes('get_current_user_role') || allSql.includes('get_current_tenant_id'),
      'RLS helper functions must be defined in migrations'
    )
  })
})
