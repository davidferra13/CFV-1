/**
 * Q40: Staff Action Auth Completeness
 *
 * Staff management touches sensitive data: hourly rates, payroll, performance
 * reviews, contractor agreements, and tax reports. Every server action in
 * the staff module must begin with requireChef() to enforce auth and
 * tenant scoping.
 *
 * The Q419 bug found a staff assignment action that lacked tenant scoping.
 * This suite verifies that every staff 'use server' file has auth guards
 * and that DB queries use session-derived chef_id, not request-body IDs.
 *
 * Tests:
 *
 * 1. CORE STAFF ACTIONS: lib/staff/actions.ts has 'use server' and
 *    requireChef at the top.
 *
 * 2. STAFFING ACTIONS: lib/staff/staffing-actions.ts has requireChef.
 *
 * 3. SCHEDULING ACTIONS: lib/staff/staff-scheduling-actions.ts has
 *    requireChef.
 *
 * 4. ALL STAFF FILES: Every lib/staff/*.ts file with 'use server' directive
 *    also calls requireChef().
 *
 * 5. SESSION-DERIVED ID: Staff action DB queries reference chef_id from
 *    the session (user.tenantId), not from the request body.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q40-staff-action-auth.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()
const STAFF_DIR = resolve(ROOT, 'lib/staff')
const STAFF_ACTIONS = resolve(ROOT, 'lib/staff/actions.ts')
const STAFFING_ACTIONS = resolve(ROOT, 'lib/staff/staffing-actions.ts')
const SCHEDULING_ACTIONS = resolve(ROOT, 'lib/staff/staff-scheduling-actions.ts')

function readIfExists(path: string): string | null {
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf-8')
}

test.describe('Q40: Staff action auth completeness', () => {
  // -------------------------------------------------------------------------
  // Test 1: Core staff actions file has auth guard
  // -------------------------------------------------------------------------
  test('lib/staff/actions.ts has use server directive and requireChef auth guard', () => {
    expect(existsSync(STAFF_ACTIONS), 'lib/staff/actions.ts must exist').toBe(true)

    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    expect(
      src.includes("'use server'") || src.includes('"use server"'),
      'lib/staff/actions.ts must have use server directive'
    ).toBe(true)

    expect(
      src.includes('requireChef'),
      'lib/staff/actions.ts must call requireChef() for auth (staff data is tenant-scoped)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Staffing actions (event assignments) have auth guard
  // -------------------------------------------------------------------------
  test('lib/staff/staffing-actions.ts has requireChef auth guard', () => {
    const src = readIfExists(STAFFING_ACTIONS)
    if (!src) return // skip if not present

    expect(
      src.includes('requireChef'),
      'staffing-actions.ts must call requireChef() (staff-event assignments contain tenant data)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Scheduling actions have auth guard
  // -------------------------------------------------------------------------
  test('lib/staff/staff-scheduling-actions.ts has requireChef auth guard', () => {
    const src = readIfExists(SCHEDULING_ACTIONS)
    if (!src) return

    expect(
      src.includes('requireChef'),
      'staff-scheduling-actions.ts must call requireChef() (schedule data is per-chef)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Every use server file in lib/staff/ has requireChef
  // -------------------------------------------------------------------------
  test("every 'use server' file in lib/staff/ calls requireChef()", () => {
    if (!existsSync(STAFF_DIR)) return

    const entries = readdirSync(STAFF_DIR)
    const violations: string[] = []

    for (const entry of entries) {
      if (!entry.endsWith('.ts')) continue
      const full = join(STAFF_DIR, entry)
      const src = readFileSync(full, 'utf-8')

      const hasUseServer = /^['"]use server['"]/m.test(src.slice(0, 300))
      const hasRequireChef = src.includes('requireChef')

      if (hasUseServer && !hasRequireChef) {
        violations.push(relative(ROOT, full).replace(/\\/g, '/'))
      }
    }

    if (violations.length > 0) {
      console.error(
        `\nQ40 CRITICAL — staff files with use server but no requireChef:\n` +
          violations.map((v) => `  AUTH MISSING: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `All use server files in lib/staff/ must call requireChef(): ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 5: Staff queries use session-derived chef_id (not request body)
  // -------------------------------------------------------------------------
  test('lib/staff/actions.ts derives chef_id from session, not request body', () => {
    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    // The chef_id / tenant_id must come from the requireChef() result
    // (user.tenantId or user.entityId), not from input params
    expect(
      src.includes('user.tenantId') || src.includes('user.entityId') || src.includes('chef.id'),
      'staff actions must derive chef_id from session (user.tenantId), not from request input'
    ).toBe(true)
  })
})
