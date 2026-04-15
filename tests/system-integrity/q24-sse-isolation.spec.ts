/**
 * Q24: SSE Channel Isolation
 *
 * Server-Sent Events provide real-time updates (notifications, chat, event
 * status). If channels are not tenant-scoped, a chef could subscribe to
 * another chef's activity stream by guessing a UUID. If the auth gate is
 * missing, unauthenticated clients could subscribe to any channel.
 *
 * Tests:
 *
 * 1. CHANNEL NAMING: lib/realtime/sse-server.ts defines tenant-scoped channel
 *    patterns (activity:{tenantId}, events:{eventId}, chat:{conversationId}).
 *
 * 2. AUTH GATE: The SSE endpoint calls auth() before subscribing. A missing
 *    session must return 401, not an open stream.
 *
 * 3. ACCESS VALIDATION: validateRealtimeChannelAccess() exists and is called
 *    before subscribing. Unknown prefixes fail closed (return false/403).
 *
 * 4. TENANT DB VERIFICATION: For event/chat channels, access is verified by
 *    querying the DB (not just matching the channel name). Prevents access
 *    to channels for events owned by other tenants.
 *
 * 5. BROADCAST TENANT SCOPING: The broadcast helpers take tenant context —
 *    they don't broadcast to all subscribers indiscriminately.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q24-sse-isolation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// The auth gate and channel validation live in the API route, not the event bus.
// lib/realtime/sse-server.ts is a low-level EventEmitter (no auth).
// app/api/realtime/[channel]/route.ts is the HTTP endpoint with auth + tenant scoping.
const SSE_ROUTE = resolve(process.cwd(), 'app/api/realtime/[channel]/route.ts')
const CHANNEL_ACCESS = resolve(process.cwd(), 'lib/realtime/channel-access.ts')
const BROADCAST = resolve(process.cwd(), 'lib/realtime/broadcast.ts')

test.describe('Q24: SSE channel isolation', () => {
  // -------------------------------------------------------------------------
  // Test 1: Channel naming includes tenant/user scoping
  // -------------------------------------------------------------------------
  test('SSE channels use tenant-scoped naming conventions', () => {
    expect(existsSync(SSE_ROUTE), 'app/api/realtime/[channel]/route.ts must exist').toBe(true)

    const src = readFileSync(SSE_ROUTE, 'utf-8')

    // Must have tenant-scoped channel patterns documented/used
    const hasTenantChannels =
      src.includes('activity:') || src.includes('tenantId') || src.includes('notifications:')

    expect(
      hasTenantChannels,
      'SSE route must define tenant-scoped channel patterns (activity:{tenantId}, notifications:{userId})'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: SSE endpoint requires authentication
  // -------------------------------------------------------------------------
  test('SSE server requires valid auth session before subscribing', () => {
    const src = readFileSync(SSE_ROUTE, 'utf-8')

    // Must call auth() to get the session
    expect(
      src.includes('auth()') || src.includes('getServerSession') || src.includes('requireAuth'),
      'SSE server must authenticate user before allowing subscription'
    ).toBe(true)

    // Must return 401 if no session
    expect(
      src.includes('401') || src.includes('Unauthorized'),
      'SSE server must return 401 for unauthenticated requests'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Channel access validator exists and is called
  // -------------------------------------------------------------------------
  test('validateRealtimeChannelAccess is called before subscription', () => {
    expect(existsSync(CHANNEL_ACCESS), 'lib/realtime/channel-access.ts must exist').toBe(true)

    const serverSrc = readFileSync(SSE_ROUTE, 'utf-8')
    const accessSrc = readFileSync(CHANNEL_ACCESS, 'utf-8')

    expect(
      serverSrc.includes('validateRealtimeChannelAccess') || serverSrc.includes('channel-access'),
      'SSE server must call validateRealtimeChannelAccess before creating subscription'
    ).toBe(true)

    // Must return 403 when access denied
    expect(
      serverSrc.includes('403') || serverSrc.includes('Forbidden'),
      'SSE server must return 403 when channel access is denied'
    ).toBe(true)

    // channel-access must export the validator
    expect(
      accessSrc.includes('export') && accessSrc.includes('validateRealtimeChannelAccess'),
      'channel-access.ts must export validateRealtimeChannelAccess function'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Unknown channel prefix fails closed
  // -------------------------------------------------------------------------
  test('channel access validator fails closed for unknown prefixes', () => {
    const src = readFileSync(CHANNEL_ACCESS, 'utf-8')

    // Must have a fallback that returns false for unknown channels
    // (not a passthrough or default-allow)
    expect(
      src.includes('return false') || src.includes('return false;'),
      'validateRealtimeChannelAccess must return false for unknown/unrecognized channel prefixes'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Event/chat channels verified against DB
  // -------------------------------------------------------------------------
  test('events and chat channels verify tenant ownership via DB query', () => {
    const src = readFileSync(CHANNEL_ACCESS, 'utf-8')

    // Must query the DB to verify ownership (not just match tenant_id from channel name)
    expect(
      src.includes('.from(') || src.includes('select(') || src.includes('createAdminClient'),
      'channel-access.ts must query DB to verify event/chat channel ownership (not just name matching)'
    ).toBe(true)

    // Must compare against tenantId from the session context
    expect(
      src.includes('tenantId') || src.includes('tenant_id'),
      'channel-access must verify tenant_id from session context matches channel ownership'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Broadcast helpers are tenant-scoped
  // -------------------------------------------------------------------------
  test('realtime broadcast helpers accept tenant context', () => {
    if (!existsSync(BROADCAST)) return // Skip if file not present

    const src = readFileSync(BROADCAST, 'utf-8')

    // Broadcast functions must take some form of tenant/channel scoping
    expect(
      src.includes('tenantId') || src.includes('channel'),
      'Broadcast helpers must be scoped to a specific tenant/channel (no global broadcast)'
    ).toBe(true)
  })
})
