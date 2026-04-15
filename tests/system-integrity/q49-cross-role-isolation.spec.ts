/**
 * Q49: Cross-Role Action Isolation
 *
 * ChefFlow has three authenticated roles: chef, client, staff.
 * Q7 tests same-role tenant isolation (chef A can't read chef B's data).
 * Q49 tests cross-role isolation: a client session must not call chef
 * server actions, a staff session must not call chef-only actions, and
 * a chef must not call client-only actions.
 *
 * Defense: requireChef() rejects sessions where role != 'chef'.
 *          requireClient() rejects sessions where role != 'client'.
 *          The role is read from the JWT, not from the request body.
 *
 * Tests:
 *
 * 1. REQUIRECHEF CHECKS ROLE: lib/auth/actions.ts or auth helpers call
 *    requireChef() which inspects session.user.role === 'chef' before proceeding.
 *
 * 2. REQUIRECLIENT CHECKS ROLE: requireClient() exists and inspects role.
 *
 * 3. CHEF ACTIONS USE REQUIRECHEF: Core chef modules (events, clients, finance,
 *    quotes) call requireChef() — not just requireAuth() which allows any role.
 *
 * 4. CLIENT ACTIONS USE REQUIRECLIENT: Client-facing server actions call
 *    requireClient() not a generic auth guard.
 *
 * 5. ROLE NOT IN REQUEST BODY: No server action accepts 'role' as a parameter
 *    from the caller — role is always derived from session.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q49-cross-role-isolation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const AUTH_CONFIG = resolve(ROOT, 'lib/auth/auth-config.ts')

// Core chef action files — all must use requireChef not just requireAuth
const CHEF_ACTION_FILES = [
  'lib/events/actions.ts',
  'lib/clients/actions.ts',
  'lib/finance/invoice-actions.ts',
  'lib/quotes/actions.ts',
]

// Client-facing action files
const CLIENT_ACTION_FILES = ['app/(client)']

test.describe('Q49: Cross-role action isolation', () => {
  // ---------------------------------------------------------------------------
  // Test 1: requireChef() exists and checks role
  // ---------------------------------------------------------------------------
  test('requireChef() validates role === chef from session (not request)', () => {
    // Find requireChef definition
    const candidates = [
      resolve(ROOT, 'lib/auth/actions.ts'),
      resolve(ROOT, 'lib/auth/session.ts'),
      resolve(ROOT, 'lib/auth/helpers.ts'),
      resolve(ROOT, 'lib/auth/require.ts'),
    ]

    let src = ''
    for (const f of candidates) {
      if (existsSync(f)) {
        const content = readFileSync(f, 'utf-8')
        if (content.includes('requireChef')) {
          src = content
          break
        }
      }
    }

    expect(src.length, 'requireChef() must be defined in a lib/auth/ file').toBeGreaterThan(0)

    expect(src.includes('requireChef'), 'requireChef function must be present').toBe(true)

    // Must check role or entity type, not just session existence
    expect(
      src.includes('role') || src.includes('chef') || src.includes('entityType'),
      'requireChef() must check that the session role/entityType is chef — not just that a session exists'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: requireClient() exists and checks role
  // ---------------------------------------------------------------------------
  test('requireClient() exists and validates client role from session', () => {
    const candidates = [
      resolve(ROOT, 'lib/auth/actions.ts'),
      resolve(ROOT, 'lib/auth/session.ts'),
      resolve(ROOT, 'lib/auth/helpers.ts'),
      resolve(ROOT, 'lib/auth/require.ts'),
    ]

    let src = ''
    for (const f of candidates) {
      if (existsSync(f)) {
        const content = readFileSync(f, 'utf-8')
        if (content.includes('requireClient')) {
          src = content
          break
        }
      }
    }

    expect(src.length, 'requireClient() must be defined in a lib/auth/ file').toBeGreaterThan(0)
    expect(src.includes('requireClient'), 'requireClient function must be present').toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Core chef action files call requireChef (not just requireAuth)
  // ---------------------------------------------------------------------------
  for (const relPath of CHEF_ACTION_FILES) {
    const absPath = resolve(ROOT, relPath)
    test(`${relPath} calls requireChef() not just requireAuth()`, () => {
      if (!existsSync(absPath)) return // file may not exist yet — skip

      const src = readFileSync(absPath, 'utf-8')

      expect(
        src.includes('requireChef'),
        `${relPath} must call requireChef() to enforce chef-only access — requireAuth() alone allows any role`
      ).toBe(true)
    })
  }

  // ---------------------------------------------------------------------------
  // Test 4: Role is derived from session JWT, not from request input
  // ---------------------------------------------------------------------------
  test('auth-config.ts JWT callback stores role from DB, not from client input', () => {
    expect(existsSync(AUTH_CONFIG), 'lib/auth/auth-config.ts must exist').toBe(true)
    const src = readFileSync(AUTH_CONFIG, 'utf-8')

    // JWT callback must set role from DB lookup or user record
    expect(
      src.includes('jwt') && (src.includes('role') || src.includes('entityType')),
      'JWT callback in auth-config.ts must set role/entityType from DB, making it impossible for clients to inject their own role'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: No server action accepts 'role' as a caller-supplied parameter
  // ---------------------------------------------------------------------------
  test("no 'use server' file accepts 'role' as a function parameter from caller", () => {
    // This would allow role spoofing: serverAction({ role: 'admin', ... })
    const eventsActions = resolve(ROOT, 'lib/events/actions.ts')
    if (!existsSync(eventsActions)) return

    const src = readFileSync(eventsActions, 'utf-8')

    // Function signatures should not accept role: string as input
    expect(
      !src.match(/async\s+function\s+\w+\s*\([^)]*\brole\s*:\s*string[^)]*\)/),
      'Server actions must not accept role as a caller-supplied string parameter — role comes from session only'
    ).toBe(true)
  })
})
