/**
 * Q77: Menu-Event Link Atomicity
 *
 * attachMenuToEvent and detachMenuFromEvent must use atomic database
 * operations (RPC/transaction), not separate update calls that can
 * partially fail. Without atomicity, a menu could be linked but the event
 * not updated (or vice versa), creating orphaned references.
 *
 * Both functions should call db.rpc() with the atomic RPC functions defined
 * in database migrations: attach_menu_to_event_atomic and
 * detach_menu_from_event_atomic.
 *
 * Tests:
 *
 * 1. ATTACH USES RPC: attachMenuToEvent calls db.rpc('attach_menu_to_event_atomic').
 *
 * 2. DETACH USES RPC: detachMenuFromEvent calls db.rpc('detach_menu_from_event_atomic').
 *
 * 3. ATTACH RPC EXISTS IN MIGRATION: The attach_menu_to_event_atomic function
 *    is defined in a database migration file.
 *
 * 4. DETACH RPC EXISTS IN MIGRATION: The detach_menu_from_event_atomic function
 *    is defined in a database migration file.
 *
 * 5. ATTACH REVALIDATES BOTH PATHS: attachMenuToEvent calls revalidatePath
 *    for both the event and menu pages.
 *
 * 6. DETACH REVALIDATES MENU PATH: detachMenuFromEvent calls revalidatePath
 *    for at least the menu page.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q77-menu-event-link-atomicity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const MENU_ACTIONS = resolve(ROOT, 'lib/menus/actions.ts')
const MIGRATIONS_DIR = resolve(ROOT, 'database/migrations')

test.describe('Q77: Menu-event link atomicity', () => {
  // ---------------------------------------------------------------------------
  // Test 1: attachMenuToEvent uses db.rpc('attach_menu_to_event_atomic')
  // ---------------------------------------------------------------------------
  test('attachMenuToEvent calls db.rpc with attach_menu_to_event_atomic', () => {
    expect(existsSync(MENU_ACTIONS), 'lib/menus/actions.ts must exist').toBe(true)

    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    // Find the attachMenuToEvent function and verify it uses db.rpc
    const attachFnMatch = src.match(
      /export\s+async\s+function\s+attachMenuToEvent[\s\S]*?(?=export\s+async\s+function|\Z)/
    )
    expect(attachFnMatch, 'attachMenuToEvent function must exist in lib/menus/actions.ts').not.toBe(
      null
    )

    expect(
      src.includes("rpc('attach_menu_to_event_atomic'") ||
        src.includes('rpc("attach_menu_to_event_atomic"'),
      'attachMenuToEvent must call db.rpc("attach_menu_to_event_atomic") for atomic operation'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: detachMenuFromEvent uses db.rpc('detach_menu_from_event_atomic')
  // ---------------------------------------------------------------------------
  test('detachMenuFromEvent calls db.rpc with detach_menu_from_event_atomic', () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    // Find the detachMenuFromEvent function and verify it uses db.rpc
    const detachFnMatch = src.match(
      /export\s+async\s+function\s+detachMenuFromEvent[\s\S]*?(?=export\s+async\s+function|\Z)/
    )
    expect(
      detachFnMatch,
      'detachMenuFromEvent function must exist in lib/menus/actions.ts'
    ).not.toBe(null)

    expect(
      src.includes("rpc('detach_menu_from_event_atomic'") ||
        src.includes('rpc("detach_menu_from_event_atomic"'),
      'detachMenuFromEvent must call db.rpc("detach_menu_from_event_atomic") for atomic operation'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: attach_menu_to_event_atomic RPC defined in a migration
  // ---------------------------------------------------------------------------
  test('attach_menu_to_event_atomic function defined in database migrations', () => {
    expect(existsSync(MIGRATIONS_DIR), 'database/migrations/ directory must exist').toBe(true)

    const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
    let found = false

    for (const file of migrationFiles) {
      const src = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      if (src.includes('attach_menu_to_event_atomic')) {
        found = true
        break
      }
    }

    expect(
      found,
      'attach_menu_to_event_atomic must be defined in a database migration file (CREATE OR REPLACE FUNCTION)'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: detach_menu_from_event_atomic RPC defined in a migration
  // ---------------------------------------------------------------------------
  test('detach_menu_from_event_atomic function defined in database migrations', () => {
    const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
    let found = false

    for (const file of migrationFiles) {
      const src = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      if (src.includes('detach_menu_from_event_atomic')) {
        found = true
        break
      }
    }

    expect(
      found,
      'detach_menu_from_event_atomic must be defined in a database migration file (CREATE OR REPLACE FUNCTION)'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: attachMenuToEvent revalidates both event and menu paths
  // ---------------------------------------------------------------------------
  test('attachMenuToEvent calls revalidatePath for both event and menu pages', () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    // Extract the attachMenuToEvent function body
    const attachStart = src.indexOf('export async function attachMenuToEvent')
    expect(attachStart, 'attachMenuToEvent must exist').toBeGreaterThan(-1)

    // Find the next export function after attachMenuToEvent to bound the search
    const nextExport = src.indexOf('export async function', attachStart + 1)
    const attachBody = nextExport > -1 ? src.slice(attachStart, nextExport) : src.slice(attachStart)

    // Must revalidate both the event page and the menu page
    expect(
      attachBody.includes('revalidatePath(`/events/') ||
        attachBody.includes("revalidatePath('/events/"),
      'attachMenuToEvent must call revalidatePath for the event page'
    ).toBe(true)

    expect(
      attachBody.includes('revalidatePath(`/menus/') ||
        attachBody.includes("revalidatePath('/menus/"),
      'attachMenuToEvent must call revalidatePath for the menu page'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 6: detachMenuFromEvent revalidates menu path
  // ---------------------------------------------------------------------------
  test('detachMenuFromEvent calls revalidatePath for the menu page', () => {
    const src = readFileSync(MENU_ACTIONS, 'utf-8')

    // Extract the detachMenuFromEvent function body
    const detachStart = src.indexOf('export async function detachMenuFromEvent')
    expect(detachStart, 'detachMenuFromEvent must exist').toBeGreaterThan(-1)

    const nextExport = src.indexOf('export async function', detachStart + 1)
    const detachBody = nextExport > -1 ? src.slice(detachStart, nextExport) : src.slice(detachStart)

    // Must revalidate at least the menu page
    expect(
      detachBody.includes('revalidatePath(`/menus/') ||
        detachBody.includes("revalidatePath('/menus/"),
      'detachMenuFromEvent must call revalidatePath for the menu page'
    ).toBe(true)
  })
})
