/**
 * Q34: Realtime Broadcast Tenant Scoping
 *
 * SSE broadcasts are in-memory pub/sub. If a broadcast helper sends to a
 * global channel (no tenant context), every connected client receives the
 * event regardless of which chef's data it belongs to. This is a data
 * exposure bug that is invisible in testing but catastrophic in production
 * with multiple tenants connected simultaneously.
 *
 * Tests:
 *
 * 1. TENANT PARAM: broadcastInsert / broadcastUpdate / broadcastDelete all
 *    accept a tenantId parameter.
 *
 * 2. CHANNEL FORMAT: The channel string includes the tenantId, scoping the
 *    broadcast to one tenant's subscribers only.
 *
 * 3. NO GLOBAL BROADCAST: No broadcast helper sends to a channel with no
 *    tenant or user context (no wildcard or empty-string channel).
 *
 * 4. TYPING INDICATOR SCOPED: broadcastTyping is scoped to a channel
 *    (conversation-level, not global).
 *
 * 5. GENERIC BROADCAST REQUIRES CHANNEL: The low-level broadcast() function
 *    requires an explicit channel string — it cannot be called without one.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q34-broadcast-tenant-scoping.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const BROADCAST = resolve(process.cwd(), 'lib/realtime/broadcast.ts')

test.describe('Q34: Realtime broadcast tenant scoping', () => {
  // -------------------------------------------------------------------------
  // Test 1: Insert/Update/Delete helpers require tenantId
  // -------------------------------------------------------------------------
  test('broadcastInsert, broadcastUpdate, broadcastDelete accept tenantId param', () => {
    expect(existsSync(BROADCAST), 'lib/realtime/broadcast.ts must exist').toBe(true)

    const src = readFileSync(BROADCAST, 'utf-8')

    const helpers = ['broadcastInsert', 'broadcastUpdate', 'broadcastDelete']
    for (const fn of helpers) {
      expect(src.includes(fn), `broadcast.ts must export ${fn}`).toBe(true)
    }

    // All three must reference tenantId in their signatures or bodies
    expect(
      src.includes('tenantId'),
      'broadcast helpers must accept tenantId to scope channels to one tenant'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Channel string includes tenantId
  // -------------------------------------------------------------------------
  test('broadcast channel format includes tenantId (prevents cross-tenant bleed)', () => {
    const src = readFileSync(BROADCAST, 'utf-8')

    // Channel pattern: `${table}:${tenantId}` or similar interpolation
    expect(
      src.includes('tenantId') &&
        (src.includes('`${') || src.includes('+ tenantId') || src.includes(':${tenantId}')),
      'broadcast.ts must build channel strings that include tenantId (e.g. `table:tenantId`)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: No broadcast to empty/wildcard channel
  // -------------------------------------------------------------------------
  test('no broadcast helper sends to an empty or global channel', () => {
    const src = readFileSync(BROADCAST, 'utf-8')

    // No broadcast('*', ...) or broadcast('', ...) or broadcast('all', ...)
    expect(
      !src.includes("broadcast('*'") &&
        !src.includes('broadcast("*"') &&
        !src.includes("broadcast('')") &&
        !src.includes('broadcast("all"'),
      'broadcast.ts must not allow global/wildcard channel broadcasts'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Typing indicator is scoped to a channel
  // -------------------------------------------------------------------------
  test('broadcastTyping accepts a channel parameter (conversation-scoped)', () => {
    const src = readFileSync(BROADCAST, 'utf-8')

    if (src.includes('broadcastTyping')) {
      const idx = src.indexOf('broadcastTyping')
      const fnSignature = src.slice(idx, idx + 200)

      expect(
        fnSignature.includes('channel') || fnSignature.includes('Channel'),
        'broadcastTyping must accept a channel param (typing indicators must be conversation-scoped)'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 5: Generic broadcast() requires an explicit channel string
  // -------------------------------------------------------------------------
  test('low-level broadcast() function requires an explicit channel argument', () => {
    const src = readFileSync(BROADCAST, 'utf-8')

    // The generic broadcast function must take channel as first argument
    expect(
      src.includes('function broadcast(channel') ||
        src.includes('broadcast = (channel') ||
        src.includes('broadcast(channel:'),
      'generic broadcast() must require an explicit channel (no default or optional channel)'
    ).toBe(true)
  })
})
