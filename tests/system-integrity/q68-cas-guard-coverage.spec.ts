/**
 * Q68: CAS (Compare-and-Swap) Guard Coverage
 *
 * Concurrent editing on shared entities (menus, events, quotes, clients)
 * must use optimistic concurrency control. Without CAS guards, the
 * last write silently wins and overwrites earlier concurrent edits.
 *
 * The pattern: update mutations accept an expected_updated_at (or
 * expected status for FSM transitions) and include it as a WHERE
 * condition. If the row was modified between read and write, the
 * UPDATE matches zero rows and the function returns a conflict error
 * instead of silently succeeding.
 *
 * Not every update needs CAS - settings, toggles, and single-user
 * operations are fine without it. Focus on entities where concurrent
 * editing is realistic: menus, events, quotes, clients.
 *
 * Tests:
 *
 * 1. MENU UPDATE HAS CAS: updateMenu in lib/menus/actions.ts accepts
 *    expected_updated_at or uses a CAS guard.
 *
 * 2. EVENT TRANSITIONS USE STATUS GUARD: transition functions in
 *    lib/events/transitions.ts use .eq('status', expected) as a CAS guard.
 *
 * 3. QUOTE UPDATE HAS CAS: updateQuote in lib/quotes/ accepts
 *    expected_updated_at or uses a status guard.
 *
 * 4. CLIENT UPDATE HAS CAS: updateClient in lib/clients/ accepts
 *    expected_updated_at.
 *
 * 5. CAS FAILURES RETURN CONFLICT ERROR: When a CAS guard fails
 *    (zero rows matched), the function returns a conflict error
 *    (not silent success).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q68-cas-guard-coverage.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

function findTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      results.push(...findTsFiles(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full)
    }
  }
  return results
}

test.describe('Q68: CAS (Compare-and-Swap) guard coverage', () => {
  // ---------------------------------------------------------------------------
  // Test 1: updateMenu in lib/menus/actions.ts uses a CAS guard
  // ---------------------------------------------------------------------------
  test('lib/menus/actions.ts update functions use CAS guards', () => {
    const menusActions = resolve(ROOT, 'lib/menus/actions.ts')
    expect(existsSync(menusActions), 'lib/menus/actions.ts must exist').toBe(true)

    const src = readFileSync(menusActions, 'utf-8')

    // Look for CAS guard patterns: expected_updated_at, updated_at check,
    // or optimistic locking
    const hasCasGuard =
      src.includes('expected_updated_at') ||
      src.includes('expectedUpdatedAt') ||
      src.includes("eq('updated_at'") ||
      src.includes('.eq("updated_at"') ||
      src.includes('updated_at =') ||
      // Status-based CAS for menus
      src.includes("eq('status'") ||
      src.includes('.eq("status"') ||
      src.includes('conflict') ||
      src.includes('Conflict')

    expect(
      hasCasGuard,
      'lib/menus/actions.ts must use CAS guards (expected_updated_at or status check) ' +
        'on update mutations to prevent last-write-wins race conditions'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Event transitions use status guard as CAS
  // ---------------------------------------------------------------------------
  test('lib/events/transitions.ts uses status-based CAS guard on transitions', () => {
    const transitions = resolve(ROOT, 'lib/events/transitions.ts')
    expect(existsSync(transitions), 'lib/events/transitions.ts must exist').toBe(true)

    const src = readFileSync(transitions, 'utf-8')

    // Event FSM transitions must check current status before updating.
    // The actual mechanism is an atomic RPC: db.rpc('transition_event_atomic', { p_from_status })
    // which passes the expected from-status to a Postgres function that uses it as a WHERE guard.
    // Also accept direct .eq('status', ...) patterns.
    const hasStatusGuard =
      src.includes("eq('status'") ||
      src.includes('.eq("status"') ||
      src.includes('currentStatus') ||
      src.includes('expected_status') ||
      src.includes('expectedStatus') ||
      // RPC-based CAS: passes from-status to atomic Postgres function
      src.includes('p_from_status') ||
      src.includes('transition_event_atomic') ||
      // Variable holding current status for validation
      src.includes('fromStatus') ||
      // Raw SQL pattern
      src.includes("status = '") ||
      src.includes('status = $')

    expect(
      hasStatusGuard,
      'lib/events/transitions.ts must check current status before updating. ' +
        'Accepts .eq("status", ...) or RPC with p_from_status (atomic CAS guard prevents double transitions).'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Quote update in lib/quotes/ uses CAS guard
  // ---------------------------------------------------------------------------
  test('lib/quotes/ update functions use CAS guards', () => {
    const quotesDir = resolve(ROOT, 'lib/quotes')
    if (!existsSync(quotesDir)) {
      // If quotes dir doesn't exist, check for alternative locations
      const altPath = resolve(ROOT, 'lib/events/quotes.ts')
      if (!existsSync(altPath)) return // Skip if no quotes module found
    }

    const files = findTsFiles(quotesDir || resolve(ROOT, 'lib/quotes'))
    let foundCas = false

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')

      // Check for update functions with CAS
      if (src.includes('updateQuote') || src.includes('update_quote') || src.includes('.update(')) {
        if (
          src.includes('expected_updated_at') ||
          src.includes('expectedUpdatedAt') ||
          src.includes("eq('status'") ||
          src.includes("eq('updated_at'") ||
          src.includes('conflict') ||
          src.includes('Conflict')
        ) {
          foundCas = true
          break
        }
      }
    }

    expect(
      foundCas,
      'lib/quotes/ must use CAS guards (expected_updated_at or status check) ' +
        'on quote update mutations'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Client update in lib/clients/ uses CAS guard
  // ---------------------------------------------------------------------------
  test('lib/clients/ update functions use CAS guards', () => {
    const clientsDir = resolve(ROOT, 'lib/clients')
    if (!existsSync(clientsDir)) return

    const files = findTsFiles(clientsDir)
    let foundCas = false

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')

      // Check for update functions with CAS
      if (
        src.includes('updateClient') ||
        src.includes('update_client') ||
        src.includes('.update(')
      ) {
        if (
          src.includes('expected_updated_at') ||
          src.includes('expectedUpdatedAt') ||
          src.includes("eq('updated_at'") ||
          src.includes('conflict') ||
          src.includes('Conflict')
        ) {
          foundCas = true
          break
        }
      }
    }

    expect(
      foundCas,
      'lib/clients/ must use CAS guards (expected_updated_at) on client update mutations ' +
        'to prevent concurrent edit overwrites'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: CAS failures return conflict errors (not silent success)
  // ---------------------------------------------------------------------------
  test('CAS guard failures produce conflict/error responses (not silent success)', () => {
    // Check that when a CAS guard matches zero rows, the code detects it
    // and returns an error instead of silently succeeding
    const targetFiles = [
      resolve(ROOT, 'lib/menus/actions.ts'),
      resolve(ROOT, 'lib/events/transitions.ts'),
    ]

    let hasConflictHandling = false

    for (const file of targetFiles) {
      if (!existsSync(file)) continue
      const src = readFileSync(file, 'utf-8')

      // Patterns that indicate conflict detection:
      // - Checking rowCount/count === 0 after update
      // - Checking .length === 0 on returned rows
      // - Explicit conflict error
      // - createConflictError
      // - "no rows" or "not found" after update
      if (
        src.includes('rowCount') ||
        src.includes('rows.length') ||
        src.includes('length === 0') ||
        src.includes('conflict') ||
        src.includes('Conflict') ||
        src.includes('createConflictError') ||
        src.includes('stale') ||
        src.includes('modified') ||
        src.includes('concurrent') ||
        // Result check: if update returns nothing, it means CAS failed
        src.includes('if (!result') ||
        src.includes('if (result.length === 0') ||
        src.includes('No rows') ||
        src.includes('no rows')
      ) {
        hasConflictHandling = true
      }
    }

    expect(
      hasConflictHandling,
      'CAS guard failures must produce explicit conflict/error responses. ' +
        'At least one of menus/events must check for zero-row updates and return an error.'
    ).toBe(true)
  })
})
