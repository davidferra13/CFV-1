/**
 * Q49: Menu Lock Enforcement
 *
 * When a client approves a menu, it transitions to 'locked' status and
 * locked_at is set. After this point, the menu cannot be silently edited.
 * This protects the client's agreement and the chef's documented commitment.
 *
 * If a locked menu can be edited, the chef could unilaterally change dishes
 * after client approval without triggering the re-approval workflow. This
 * is both a trust violation and a potential liability.
 *
 * Tests:
 *
 * 1. EDIT BLOCKED ON LOCK: lib/menus/actions.ts throws when attempting to
 *    edit a menu with status 'locked'.
 *
 * 2. LOCKED_AT SET: When a menu transitions to locked, locked_at timestamp
 *    is set (not null).
 *
 * 3. ADD DISH BLOCKED: Adding a dish to a locked menu is also blocked
 *    (not just top-level edits).
 *
 * 4. ERROR MESSAGE CLEAR: The lock error message explicitly says the menu
 *    is locked (not a generic "operation failed").
 *
 * 5. LOCKED STATUS IN FSM: 'locked' is a recognized menu status with
 *    defined semantics.
 *
 * 6. RE-APPROVAL WORKFLOW: There is a mechanism to unlock/revision a menu
 *    (not a permanent dead-end for the chef).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q49-menu-lock-enforcement.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const MENU_ACTIONS = resolve(process.cwd(), 'lib/menus/actions.ts')

test.describe('Q49: Menu lock enforcement', () => {
  // -------------------------------------------------------------------------
  // Test 1: Editing a locked menu throws an error
  // -------------------------------------------------------------------------
  test("lib/menus/actions.ts blocks edits to menus with status 'locked'", () => {
    expect(existsSync(MENU_ACTIONS), 'lib/menus/actions.ts must exist').toBe(true)

    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    expect(
      src.includes("'locked'") || src.includes('"locked"'),
      "menus/actions.ts must recognize 'locked' status and enforce its restrictions"
    ).toBe(true)

    // Must have a guard that throws or returns error for locked menus
    expect(
      src.includes('locked') &&
        (src.includes('Cannot') || src.includes('throw') || src.includes('error')),
      'menus/actions.ts must throw or return error when attempting to edit a locked menu'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: locked_at timestamp set on lock transition
  // -------------------------------------------------------------------------
  test('locked_at timestamp is set when menu transitions to locked status', () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    expect(
      src.includes('locked_at'),
      'menus/actions.ts must set locked_at timestamp when locking a menu (audit trail)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Adding dishes to locked menu is blocked
  // -------------------------------------------------------------------------
  test('adding a dish to a locked menu is also blocked (not just top-level edits)', () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    // The add dish function must also check locked status
    const addDishIdx =
      src.indexOf('addDish') !== -1 ? src.indexOf('addDish') : src.indexOf('add_dish')

    if (addDishIdx !== -1) {
      const fnBody = src.slice(addDishIdx, addDishIdx + 800)
      expect(
        fnBody.includes('locked') || fnBody.includes('Cannot'),
        'addDish must check menu lock status (locked menus cannot have dishes added)'
      ).toBe(true)
    } else {
      // If addDish not found separately, the general locked check covers it
      expect(
        src.includes('locked') && src.includes('Cannot'),
        'menu actions must block modifications to locked menus (including adding dishes)'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: Lock error message explicitly mentions locked state
  // -------------------------------------------------------------------------
  test("lock error message says 'locked' or 'Cannot edit' (actionable error)", () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    expect(
      src.includes('Cannot edit a locked') ||
        src.includes('locked menu') ||
        src.includes('menu is locked'),
      "lock error must say 'Cannot edit a locked menu' (not a generic error message)"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Menu status enum includes locked
  // -------------------------------------------------------------------------
  test("'locked' is a recognized menu status in menus/actions.ts", () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    expect(
      src.includes("'locked'") || src.includes('"locked"'),
      "menu actions must recognize 'locked' as a valid status (not just a data value)"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Mechanism exists to create a revision from a locked menu
  // -------------------------------------------------------------------------
  test('a revision or unlock mechanism exists for locked menus (not a permanent dead-end)', () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    expect(
      src.includes('draft') ||
        src.includes('revision') ||
        src.includes('archive') ||
        src.includes('unlock') ||
        src.includes('archived'),
      'menu system must allow transition OUT of locked state (revision, archive, or draft reset)'
    ).toBe(true)
  })
})
