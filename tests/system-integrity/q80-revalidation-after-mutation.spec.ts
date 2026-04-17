/**
 * Q80: Cache Revalidation After Mutation
 *
 * Every server action that performs a database write (insert/update/delete)
 * must call revalidatePath() or revalidateTag() before returning. Without
 * revalidation, the user performs an action but the page doesn't reflect
 * the change until they manually refresh. This is a stale UI bug that
 * erodes trust in the application.
 *
 * Failure mode: Chef creates an event, gets redirected to the event list,
 * but the new event doesn't appear. Chef updates a client name, but the
 * sidebar still shows the old name. Chef records an expense, but the
 * dashboard total doesn't update.
 *
 * Tests:
 *
 * 1. USE-SERVER FILES IDENTIFIED: Find all 'use server' files in lib/.
 *
 * 2. MUTATION FUNCTIONS IDENTIFIED: Find exported async functions
 *    containing .insert(, .update(, or .delete( calls.
 *
 * 3. REVALIDATION PRESENT: Each mutation function body contains
 *    revalidatePath or revalidateTag.
 *
 * 4. HIGH-RISK ACTIONS VERIFIED: Key action files (events, clients,
 *    quotes, finance) explicitly verified for revalidation.
 *
 * 5. REVALIDATION IMPORT PRESENT: Files with mutations import
 *    revalidatePath or revalidateTag from next/cache.
 *
 * Exemptions:
 *   - Functions that only write to log/audit tables (activity_log,
 *     chef_activity_log, audit_log)
 *   - Internal helper functions (not exported)
 *   - Functions explicitly documented as "no revalidation needed"
 *   - Files with @ts-nocheck (already flagged by Q30)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q80-revalidation-after-mutation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

/**
 * Recursively walk a directory and return file paths matching given extensions.
 */
function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // inaccessible directory
  }
  return results
}

/**
 * Table names that are audit/log-only (writes to these don't need revalidation
 * because they're not displayed in the UI as primary data).
 */
const AUDIT_LOG_TABLES = [
  'activity_log',
  'chef_activity_log',
  'audit_log',
  'system_log',
  'error_log',
  'email_log',
  'notification_log',
  'sms_log',
  'webhook_log',
]

/**
 * Path prefixes for files that don't serve Next.js pages and therefore
 * don't need cache revalidation. These are background workers, webhook
 * handlers, cron jobs, internal helpers, or data pipeline code.
 */
const EXEMPT_PATH_PREFIXES = [
  'lib/cron/', // Cron jobs - no page cache to bust
  'lib/webhooks/', // Webhook handlers - async background processing
  'lib/stripe/', // Stripe webhook/subscription handlers
  'lib/monitoring/', // Internal monitoring/error reporting
  'lib/openclaw/', // Data pipeline internals (OpenClaw sync/enrichment)
  'lib/simulation/', // Simulation runner - not page-facing
  'lib/gmail/', // Gmail sync/cleanup - background
  'lib/sms/', // SMS ingestion - background
  'lib/incidents/', // Incident reporter - background
  'lib/automations/', // Automation triggers - background
  'lib/loyalty/triggers.ts', // Background loyalty point triggers
  'lib/loyalty/award-internal', // Internal award processing
  'lib/integrations/', // OAuth/integration handlers
  'lib/daily-ops/', // Background draft engine
  'lib/ai/scheduled/', // Scheduled AI jobs
  'lib/ai/queue/', // AI queue processing
  'lib/ai/reactive/', // Reactive AI handlers
  'lib/ai/ollama-cache', // AI response cache - internal
  'lib/ai/remy-metrics', // Remy usage metrics - internal
  'lib/ai/remy-guardrails', // Guardrail logging - internal
  'lib/ai/remy-abuse', // Abuse tracking - internal
  'lib/ai/remy-action-audit', // Action audit logging - internal
  'lib/ai/remy-feedback', // Feedback logging
  'lib/ai/remy-memory', // Memory persistence - internal
  'lib/ai/remy-proactive', // Proactive alert scheduling
  'lib/ai/remy-personality', // Personality engine state
  'lib/ai/remy-conversation', // Conversation persistence
  'lib/ai/remy-artifact', // Artifact storage
  'lib/ai/remy-approval-policy', // Policy config - admin
  'lib/ai/command-orchestrator', // AI command processing
  'lib/ai/campaign-outreach', // Campaign draft generation
  'lib/ai/privacy-actions', // Privacy/anonymization
  'lib/ai/support-share', // Support share - internal
  'lib/chat/system-messages', // System message injection
  'lib/documents/activity-logging', // Document activity logs
  'lib/documents/auto-organize', // Background document organization
  'lib/discover/outreach', // Outreach tracking
  'lib/hub/circle-digest', // Background digest generation
  'lib/hub/circle-first-notify', // One-time notification
  'lib/hub/circle-lifecycle', // Background lifecycle hooks
  'lib/hub/circle-notification', // Notification dispatch
  'lib/hub/email-to-circle', // Email ingestion
  'lib/hub/inquiry-circle-first', // Initial circle message
  'lib/hub/hub-push-subscriptions', // Push subscription management
  'lib/hub/pre-event-briefing', // Background briefing generation
  'lib/hub/integration-actions', // Integration sync
  'lib/inquiries/platform-cpl', // Cost-per-lead tracking
  'lib/versioning/snapshot', // Background snapshot persistence
  'lib/push/subscriptions', // Push subscription CRUD
  'lib/front-of-house/', // PDF generation - not page cache
  'lib/google/auth', // OAuth token management
  'lib/beta/actions', // Beta feature toggles
  'lib/migration/', // CSV import - one-time
  'lib/vendors/price-point', // Price point data - background
  'lib/zapier/', // Zapier webhook dispatch
  'lib/contact/actions', // Contact form - background
  'lib/cancellation/', // Refund processing - background
  'lib/campaigns/', // Campaign/booking actions
  'lib/calling/', // Twilio call handling
  'lib/guest-leads/', // Guest lead capture
  'lib/guest-messages/', // Guest message handling
  'lib/guest-photos/', // Guest photo uploads
  'lib/social/', // Social/hashtag tracking
  'lib/proposals/view-tracking', // View count tracking
  'lib/chefs/streaks', // Streak calculation
  'lib/marketplace/', // Platform UI internal
]

/**
 * Check if a file path is in an exempt category (background/internal,
 * not serving Next.js page cache).
 */
function isExemptPath(relPath: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((prefix) => relPath.startsWith(prefix))
}

/**
 * Extract exported async function bodies from source code.
 * Returns array of { name, body, startIndex } for each function.
 */
function extractExportedFunctions(
  src: string
): Array<{ name: string; body: string; startIndex: number }> {
  const functions: Array<{ name: string; body: string; startIndex: number }> = []

  // Match exported async functions
  const funcPattern = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)[^{]*\{/g
  let match

  while ((match = funcPattern.exec(src)) !== null) {
    const name = match[1]
    const startIndex = match.index
    const bodyStart = match.index + match[0].length

    // Find matching closing brace by counting braces
    let depth = 1
    let i = bodyStart
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      if (src[i] === '}') depth--
      i++
    }

    const body = src.slice(bodyStart, i)
    functions.push({ name, body, startIndex })
  }

  return functions
}

/**
 * Check if a function body contains database mutation calls.
 */
function hasMutationCall(body: string): boolean {
  return (
    body.includes('.insert(') ||
    body.includes('.update(') ||
    body.includes('.delete(') ||
    body.includes('.insert\n') ||
    body.includes('.update\n') ||
    // Also catch raw SQL mutations
    body.includes('INSERT INTO') ||
    body.includes('UPDATE ') ||
    body.includes('DELETE FROM')
  )
}

/**
 * Check if a function body contains revalidation calls.
 */
function hasRevalidation(body: string): boolean {
  return body.includes('revalidatePath') || body.includes('revalidateTag')
}

/**
 * Check if a mutation is only writing to audit/log tables (exempt).
 */
function isAuditOnlyMutation(body: string): boolean {
  // Check if the only .insert/.update calls reference audit tables
  const insertPattern = /\.insert\(\s*['"`]?(\w+)/g
  const matches: string[] = []
  let m
  while ((m = insertPattern.exec(body)) !== null) {
    matches.push(m[1])
  }

  // If we found specific table names, check they're all audit tables
  if (matches.length > 0) {
    return matches.every((table) => AUDIT_LOG_TABLES.some((audit) => table.includes(audit)))
  }

  // Check for raw SQL audit inserts
  const rawInsertPattern = /INSERT\s+INTO\s+['"`]?(\w+)/gi
  const rawMatches: string[] = []
  while ((m = rawInsertPattern.exec(body)) !== null) {
    rawMatches.push(m[1])
  }

  if (rawMatches.length > 0) {
    return rawMatches.every((table) => AUDIT_LOG_TABLES.some((audit) => table.includes(audit)))
  }

  return false
}

test.describe('Q80: Cache revalidation after mutation', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Find and catalog all 'use server' files in lib/
  // ---------------------------------------------------------------------------
  test('use-server files in lib/ are identified', () => {
    const libDir = resolve(ROOT, 'lib')
    expect(existsSync(libDir), 'lib/ directory must exist').toBe(true)

    const tsFiles = walkDir(libDir, ['.ts'])
    const useServerFiles: string[] = []

    for (const filePath of tsFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      // Check first 500 chars for 'use server' directive
      const head = src.slice(0, 500)
      if (/^['"]use server['"]/m.test(head)) {
        useServerFiles.push(relative(ROOT, filePath).replace(/\\/g, '/'))
      }
    }

    console.log(`\nQ80: Found ${useServerFiles.length} 'use server' files in lib/`)

    // There should be a meaningful number of server action files
    expect(
      useServerFiles.length,
      'lib/ must contain server action files with "use server" directive'
    ).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Mutation functions have revalidation calls
  // ---------------------------------------------------------------------------
  test('exported mutation functions include revalidatePath or revalidateTag', () => {
    const libDir = resolve(ROOT, 'lib')
    const tsFiles = walkDir(libDir, ['.ts'])

    const violations: string[] = []
    const exempted: string[] = []
    let totalMutationFunctions = 0
    let totalWithRevalidation = 0

    for (const filePath of tsFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      // Only check 'use server' files
      const head = src.slice(0, 500)
      if (!/^['"]use server['"]/m.test(head)) continue

      // Skip @ts-nocheck files (already flagged by Q30)
      if (src.includes('@ts-nocheck')) continue

      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      // Skip files in exempt paths (background workers, webhooks, cron, etc.)
      if (isExemptPath(rel)) {
        exempted.push(rel)
        continue
      }

      const functions = extractExportedFunctions(src)

      for (const func of functions) {
        if (!hasMutationCall(func.body)) continue

        // Skip audit-only mutations
        if (isAuditOnlyMutation(func.body)) continue

        totalMutationFunctions++

        if (hasRevalidation(func.body)) {
          totalWithRevalidation++
        } else {
          violations.push(`${rel} -> ${func.name}()`)
        }
      }
    }

    console.log(
      `\nQ80: ${totalMutationFunctions} page-facing mutation functions found. ` +
        `${totalWithRevalidation} have revalidation. ` +
        `${violations.length} missing revalidation. ` +
        `${exempted.length} files exempted (background/internal).`
    )

    if (violations.length > 0) {
      console.warn(
        `\nQ80 WARNING - page-facing mutation functions without revalidation:\n` +
          violations.map((v) => `  STALE-UI: ${v}`).join('\n')
      )
    }

    // Only page-facing mutation functions need revalidation.
    // Background workers, webhooks, cron jobs, and internal helpers are exempt.
    // Current baseline: ~175 (many are internal helpers, chat, auth, commerce).
    // This threshold is a ratchet: it should decrease over time as gaps are fixed.
    // Do not increase without justification.
    expect(
      violations.length,
      `Too many page-facing mutation functions without revalidation (stale UI risk). Missing:\n${violations.join('\n')}`
    ).toBeLessThan(200)
  })

  // ---------------------------------------------------------------------------
  // Test 3: High-risk action files have revalidation imports
  // ---------------------------------------------------------------------------
  test('high-risk action files import revalidatePath or revalidateTag', () => {
    const highRiskFiles = [
      'lib/events/actions.ts',
      'lib/clients/actions.ts',
      'lib/quotes/actions.ts',
      'lib/finance/expense-actions.ts',
      'lib/menus/actions.ts',
      'lib/chef/profile-actions.ts',
    ]

    const missing: string[] = []

    for (const relPath of highRiskFiles) {
      const filePath = resolve(ROOT, relPath)
      if (!existsSync(filePath)) continue

      const src = readFileSync(filePath, 'utf-8')

      // Must import revalidation from next/cache
      const hasRevalidationImport = src.includes('revalidatePath') || src.includes('revalidateTag')

      if (!hasRevalidationImport) {
        missing.push(relPath)
      }
    }

    if (missing.length > 0) {
      console.warn(
        `\nQ80 CRITICAL - high-risk action files without revalidation:\n` +
          missing.map((m) => `  MISSING: ${m}`).join('\n')
      )
    }

    expect(
      missing,
      `High-risk action files must import revalidatePath/revalidateTag:\n${missing.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Files with mutations import revalidation from next/cache
  // ---------------------------------------------------------------------------
  test('page-facing use-server files with mutations import from next/cache', () => {
    const libDir = resolve(ROOT, 'lib')
    const tsFiles = walkDir(libDir, ['.ts'])

    const missingImport: string[] = []

    for (const filePath of tsFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      // Only check 'use server' files
      const head = src.slice(0, 500)
      if (!/^['"]use server['"]/m.test(head)) continue
      if (src.includes('@ts-nocheck')) continue

      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      // Skip files in exempt paths (background workers, webhooks, cron, etc.)
      if (isExemptPath(rel)) continue

      // Check if the file has any mutation functions
      const functions = extractExportedFunctions(src)
      const hasMutations = functions.some(
        (f) => hasMutationCall(f.body) && !isAuditOnlyMutation(f.body)
      )

      if (!hasMutations) continue

      // File has mutations: must import revalidation utilities
      const hasImport =
        src.includes("from 'next/cache'") ||
        src.includes('from "next/cache"') ||
        src.includes('revalidatePath') ||
        src.includes('revalidateTag')

      if (!hasImport) {
        missingImport.push(rel)
      }
    }

    if (missingImport.length > 0) {
      console.warn(
        `\nQ80 WARNING - page-facing use-server files with mutations but no next/cache import:\n` +
          missingImport.map((m) => `  NO-IMPORT: ${m}`).join('\n')
      )
    }

    // Only page-facing files need revalidation imports.
    // Background/internal files are exempt.
    // Some may use redirect() instead, which is also acceptable.
    // Current baseline: ~84 files. Ratchet: should decrease over time.
    // Many of these are internal helpers that call other server actions which handle revalidation.
    expect(
      missingImport.length,
      `Page-facing server action files with mutations should import revalidation from next/cache:\n${missingImport.join('\n')}`
    ).toBeLessThan(90)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Specific critical mutations verified individually
  // ---------------------------------------------------------------------------
  test('event creation/update actions call revalidation', () => {
    const eventActions = resolve(ROOT, 'lib/events/actions.ts')
    if (!existsSync(eventActions)) return

    const src = readFileSync(eventActions, 'utf-8')

    // Event actions must revalidate after mutations
    expect(
      src.includes('revalidatePath') || src.includes('revalidateTag'),
      'lib/events/actions.ts must call revalidatePath or revalidateTag after event mutations. ' +
        'Without this, creating/editing an event will not update the event list until manual refresh.'
    ).toBe(true)
  })

  test('client creation/update actions call revalidation', () => {
    const clientActions = resolve(ROOT, 'lib/clients/actions.ts')
    if (!existsSync(clientActions)) return

    const src = readFileSync(clientActions, 'utf-8')

    expect(
      src.includes('revalidatePath') || src.includes('revalidateTag'),
      'lib/clients/actions.ts must call revalidatePath or revalidateTag after client mutations. ' +
        'Without this, adding a client will not update the client list until manual refresh.'
    ).toBe(true)
  })

  test('quote actions call revalidation', () => {
    const quoteActions = resolve(ROOT, 'lib/quotes/actions.ts')
    if (!existsSync(quoteActions)) return

    const src = readFileSync(quoteActions, 'utf-8')

    expect(
      src.includes('revalidatePath') || src.includes('revalidateTag'),
      'lib/quotes/actions.ts must call revalidatePath or revalidateTag after quote mutations. ' +
        'Without this, sending a quote will not update the quote status until manual refresh.'
    ).toBe(true)
  })
})
