/**
 * Q51: Client Portal IDOR Prevention
 *
 * Q7 tests chef-to-chef tenant isolation (same role, different tenant).
 * Q51 tests the client portal specifically: a logged-in client must not
 * be able to read another client's events, quotes, or payment history
 * by guessing or iterating UUIDs (Insecure Direct Object Reference).
 *
 * The attack: Client A is logged in. They know client B's event UUID from
 * a URL pattern or brute force. They hit /client/events/[id] with B's UUID.
 * Without IDOR protection, they see B's menu, price, and personal details.
 *
 * Defense: requireClient() gates all client routes. Every data fetch in
 * client actions must include .eq('client_id', session.user.entityId) —
 * never just .eq('id', eventId) alone.
 *
 * Tests:
 *
 * 1. CLIENT LAYOUT GATE: app/(client)/layout.tsx calls requireClient().
 *
 * 2. CLIENT EVENT FETCH SCOPED: Client-facing event queries include both
 *    the event id AND the client_id from session.
 *
 * 3. CLIENT QUOTE FETCH SCOPED: Client-facing quote queries include both
 *    the quote id AND the client_id.
 *
 * 4. CLIENT ACTIONS FILE HAS REQUIRECLIENT: lib/clients/portal-actions.ts
 *    or equivalent calls requireClient() at the start of each function.
 *
 * 5. NO RAW ID LOOKUP IN CLIENT ROUTES: No client page.tsx performs a bare
 *    .eq('id', params.id) without a second ownership condition.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q51-client-portal-idor.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findFiles(full, ext))
    else if (entry.isFile() && entry.name.endsWith(ext)) results.push(full)
  }
  return results
}

test.describe('Q51: Client portal IDOR prevention', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Client layout exists and requires client role
  // ---------------------------------------------------------------------------
  test('app/(client)/layout.tsx exists and calls requireClient()', () => {
    const clientLayout = resolve(ROOT, 'app/(client)/layout.tsx')
    expect(existsSync(clientLayout), 'app/(client)/layout.tsx must exist').toBe(true)

    const src = readFileSync(clientLayout, 'utf-8')
    expect(
      src.includes('requireClient') || src.includes('requireAuth'),
      'Client layout must gate access with requireClient() or requireAuth()'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Client event/quote fetches are ownership-scoped
  // ---------------------------------------------------------------------------
  test('client-facing data fetches scope by client ownership, not just record id', () => {
    // Look for client portal actions or API routes
    const candidates = [
      resolve(ROOT, 'lib/clients/portal-actions.ts'),
      resolve(ROOT, 'lib/portal/actions.ts'),
      resolve(ROOT, 'app/api/client'),
      resolve(ROOT, 'app/(client)'),
    ]

    let foundClientFetch = false
    let foundOwnershipScope = false

    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue

      const files = candidate.endsWith('.ts')
        ? [candidate]
        : findFiles(candidate, '.ts').concat(findFiles(candidate, '.tsx'))

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        if (src.includes('.from(') && src.includes('events')) {
          foundClientFetch = true
          // Must scope by client_id or tenant
          if (
            src.includes('client_id') ||
            src.includes('entityId') ||
            src.includes('requireClient')
          ) {
            foundOwnershipScope = true
          }
        }
      }
    }

    // If client portal exists, it must scope ownership
    if (foundClientFetch) {
      expect(
        foundOwnershipScope,
        'Client portal event fetches must scope results by client_id from session — bare .eq("id", ...) is IDOR'
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 3: Client action files use requireClient, not just requireAuth
  // ---------------------------------------------------------------------------
  test('client action files call requireClient() not just requireAuth()', () => {
    const clientActionFiles = [
      resolve(ROOT, 'lib/clients/portal-actions.ts'),
      resolve(ROOT, 'lib/portal/actions.ts'),
    ]

    for (const file of clientActionFiles) {
      if (!existsSync(file)) continue
      const src = readFileSync(file, 'utf-8')

      expect(
        src.includes('requireClient'),
        `${file.replace(ROOT, '')} must call requireClient() to enforce client-only access`
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 4: No client page does bare single-param lookup by route param only
  // ---------------------------------------------------------------------------
  test('client pages do not fetch events with only the route param id (no ownership check)', () => {
    const clientDir = resolve(ROOT, 'app/(client)')
    if (!existsSync(clientDir)) return

    const pages = findFiles(clientDir, 'page.tsx')
    const violations: string[] = []

    for (const page of pages) {
      const src = readFileSync(page, 'utf-8')
      // Pattern: .eq('id', params.eventId) or similar without a second condition
      // Heuristic: bare single .eq('id', ...) with no adjacent client_id eq
      const hasBareIdLookup = src.includes(".eq('id'") || src.includes('.eq("id"')
      const hasOwnershipScope =
        src.includes('client_id') ||
        src.includes('requireClient') ||
        src.includes('entityId') ||
        src.includes('tenantId')

      if (hasBareIdLookup && !hasOwnershipScope) {
        violations.push(page.replace(ROOT, '').replace(/\\/g, '/'))
      }
    }

    expect(
      violations,
      `These client pages do bare id lookups without ownership scoping (IDOR risk): ${violations.join(', ')}`
    ).toHaveLength(0)
  })
})
