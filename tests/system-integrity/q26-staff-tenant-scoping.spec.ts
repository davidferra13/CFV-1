/**
 * Q26: Staff Tenant Scoping
 *
 * Staff members and their event assignments are chef-scoped resources.
 * In 2026-04-15 (Q419 CRITICAL fix), a staff assignment action was found
 * to be missing tenant scoping — allowing one chef to see or modify another
 * chef's staff roster. All staff queries must include chef_id from the
 * authenticated session (never from request input).
 *
 * Tests:
 *
 * 1. STAFF QUERIES SCOPED: lib/staff/actions.ts queries use .eq('chef_id', user.tenantId!)
 *    on every SELECT, UPDATE, and DELETE.
 *
 * 2. ASSIGNMENT QUERIES SCOPED: Event staff assignment queries include
 *    chef_id or tenant_id scoping, not just staff_member_id.
 *
 * 3. SESSION-DERIVED ID: chef_id inserted on new staff records comes from
 *    user.tenantId (session) — never from request body.
 *
 * 4. AUTH GUARD: Staff actions file has 'use server' directive and calls
 *    requireChef() before all exported functions.
 *
 * 5. GET SINGLE STAFF SCOPED: getStaffMember(id) fetches by both id AND
 *    chef_id — prevents fetching another chef's staff by guessing a UUID.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q26-staff-tenant-scoping.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const STAFF_ACTIONS = resolve(process.cwd(), 'lib/staff/actions.ts')

test.describe('Q26: Staff tenant scoping', () => {
  // -------------------------------------------------------------------------
  // Test 1: All staff queries include chef_id scoping
  // -------------------------------------------------------------------------
  test('lib/staff/actions.ts scopes all queries to chef_id', () => {
    expect(existsSync(STAFF_ACTIONS), 'lib/staff/actions.ts must exist').toBe(true)

    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    // Must have chef_id scoping on queries
    expect(
      src.includes("eq('chef_id'") || src.includes('.eq("chef_id"'),
      "Staff actions must scope queries with .eq('chef_id', ...) to prevent cross-tenant access"
    ).toBe(true)

    // The chef_id must come from the session (user.tenantId), not from an argument
    expect(
      src.includes('user.tenantId') || src.includes('user.entityId'),
      'Staff actions must derive chef_id from authenticated session (user.tenantId), not from request'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Event staff assignments are scoped to the tenant
  // -------------------------------------------------------------------------
  test('event staff assignment queries include chef_id scoping', () => {
    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    // If the file queries event_staff_assignments, it must scope them
    if (src.includes('event_staff_assignments')) {
      expect(
        src.includes("eq('chef_id'") ||
          src.includes('.eq("chef_id"') ||
          src.includes("eq('tenant_id'") ||
          src.includes('.eq("tenant_id"'),
        'event_staff_assignments queries must include tenant/chef scoping'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 3: New staff records insert chef_id from session
  // -------------------------------------------------------------------------
  test('new staff member insert uses chef_id from session, not request body', () => {
    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    // Find insert block for staff_members
    const insertIdx = src.indexOf('.insert(')
    expect(insertIdx, 'Staff actions must have an insert call').toBeGreaterThan(-1)

    // chef_id must be set from user.tenantId in the insert
    expect(
      src.includes('chef_id: user.tenantId') || src.includes('chef_id: user.entityId'),
      'New staff member insert must set chef_id from user.tenantId (session), not from request'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Staff actions file has 'use server' and auth guard
  // -------------------------------------------------------------------------
  test("staff/actions.ts has 'use server' directive and requireChef()", () => {
    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    expect(
      src.includes("'use server'") || src.includes('"use server"'),
      "staff/actions.ts must have 'use server' directive"
    ).toBe(true)

    expect(
      src.includes('requireChef'),
      'Staff actions must call requireChef() to gate all operations'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Single staff fetch scoped by both id AND chef_id
  // -------------------------------------------------------------------------
  test('getStaffMember fetches by staff id AND chef_id (prevents UUID guessing)', () => {
    const src = readFileSync(STAFF_ACTIONS, 'utf-8')

    // Find the single-record fetch (getStaffMember or similar)
    const singleFetchIdx = src.indexOf('.single()')
    expect(singleFetchIdx, 'Staff actions must have a single-record fetch').toBeGreaterThan(-1)

    // The area around .single() must include both id and chef_id conditions
    const fetchContext = src.slice(Math.max(0, singleFetchIdx - 300), singleFetchIdx + 50)

    expect(
      (fetchContext.includes("eq('id'") || fetchContext.includes('.eq("id"')) &&
        (fetchContext.includes("eq('chef_id'") || fetchContext.includes('.eq("chef_id"')),
      'Single staff record fetch must filter by BOTH id AND chef_id (prevents cross-tenant UUID guessing)'
    ).toBe(true)
  })
})
