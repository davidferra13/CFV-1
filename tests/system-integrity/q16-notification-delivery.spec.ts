/**
 * Q16: Notification Delivery Chain
 *
 * Key mutations must fire notifications to the correct recipient.
 * Notifications are non-blocking (try/catch wrapped) — a failed
 * notification must never abort the main operation.
 *
 * Tests:
 *
 * 1. EVENT TRANSITION NOTIFY: lib/events/transitions.ts fires createNotification
 *    when an event changes state. This is how chefs know clients responded.
 *
 * 2. NON-BLOCKING GUARANTEE: The notification call in transitions.ts is inside
 *    a try/catch so a notification failure cannot roll back the state change.
 *
 * 3. MENU APPROVAL NOTIFICATIONS: lib/events/menu-approval-actions.ts fires
 *    notifications for both approval and rejection paths.
 *
 * 4. GMAIL SYNC NOTIFICATIONS: lib/gmail/sync.ts calls createNotification for
 *    incoming TAC/Gmail events so chefs are alerted to new activity.
 *
 * 5. NOTIFICATION PIPELINE WIRED: lib/notifications/send.ts calls
 *    createNotification, which calls routeNotification — the full delivery
 *    chain is connected.
 *
 * 6. NOTIFICATION ACTIONS EXIST: lib/notifications/actions.ts exports
 *    createNotification and getChefAuthUserId (recipient resolution).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q16-notification-delivery.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const TRANSITIONS = resolve(process.cwd(), 'lib/events/transitions.ts')
const MENU_APPROVAL = resolve(process.cwd(), 'lib/events/menu-approval-actions.ts')
const GMAIL_SYNC = resolve(process.cwd(), 'lib/gmail/sync.ts')
const NOTIFICATION_ACTIONS = resolve(process.cwd(), 'lib/notifications/actions.ts')
const NOTIFICATION_SEND = resolve(process.cwd(), 'lib/notifications/send.ts')
const CHANNEL_ROUTER = resolve(process.cwd(), 'lib/notifications/channel-router.ts')

test.describe('Q16: Notification delivery chain', () => {
  // -------------------------------------------------------------------------
  // Test 1: Event transitions fire createNotification
  // -------------------------------------------------------------------------
  test('transitions.ts fires createNotification on state changes', () => {
    expect(existsSync(TRANSITIONS), 'lib/events/transitions.ts must exist').toBe(true)

    const src = readFileSync(TRANSITIONS, 'utf-8')

    expect(
      src.includes('createNotification'),
      'transitions.ts must call createNotification for state-change notifications'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Notification call is non-blocking (wrapped in try/catch)
  // -------------------------------------------------------------------------
  test('notification call in transitions.ts is non-blocking (try/catch wrapped)', () => {
    const src = readFileSync(TRANSITIONS, 'utf-8')

    // Find the createNotification call
    const notifyIdx = src.indexOf('createNotification')
    expect(notifyIdx, 'createNotification call must exist in transitions.ts').toBeGreaterThan(-1)

    // Scan context around the call for try/catch
    const contextStart = Math.max(0, notifyIdx - 500)
    const contextEnd = Math.min(src.length, notifyIdx + 200)
    const context = src.slice(contextStart, contextEnd)

    expect(
      context.includes('try {') || context.includes('try{'),
      'createNotification in transitions.ts must be wrapped in try/catch (non-blocking)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Menu approval fires notifications for both approval and rejection
  // -------------------------------------------------------------------------
  test('menu-approval-actions.ts fires createNotification for approval and rejection', () => {
    expect(existsSync(MENU_APPROVAL), 'lib/events/menu-approval-actions.ts must exist').toBe(true)

    const src = readFileSync(MENU_APPROVAL, 'utf-8')

    // Must have at least two createNotification calls (approve + reject paths)
    const matches = src.match(/createNotification/g) || []
    expect(
      matches.length >= 2,
      `menu-approval-actions.ts must have at least 2 createNotification calls (approve + reject), found ${matches.length}`
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Gmail sync fires notifications for incoming events
  // -------------------------------------------------------------------------
  test('gmail/sync.ts fires createNotification for incoming chef activity', () => {
    expect(existsSync(GMAIL_SYNC), 'lib/gmail/sync.ts must exist').toBe(true)

    const src = readFileSync(GMAIL_SYNC, 'utf-8')

    expect(
      src.includes('createNotification'),
      'gmail/sync.ts must call createNotification to alert chefs of incoming activity'
    ).toBe(true)

    // Must have multiple notification call sites (multiple event types handled)
    const matches = src.match(/createNotification/g) || []
    expect(
      matches.length >= 3,
      `gmail/sync.ts should have at least 3 notification call sites (covers multiple email types), found ${matches.length}`
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Notification pipeline is connected end-to-end
  // -------------------------------------------------------------------------
  test('notification pipeline: send.ts -> createNotification -> routeNotification', () => {
    expect(existsSync(NOTIFICATION_ACTIONS), 'lib/notifications/actions.ts must exist').toBe(true)
    expect(existsSync(NOTIFICATION_SEND), 'lib/notifications/send.ts must exist').toBe(true)

    const actionsSrc = readFileSync(NOTIFICATION_ACTIONS, 'utf-8')
    const sendSrc = readFileSync(NOTIFICATION_SEND, 'utf-8')

    // actions.ts must export createNotification
    expect(
      actionsSrc.includes('export async function createNotification') ||
        actionsSrc.includes('export function createNotification'),
      'notifications/actions.ts must export createNotification'
    ).toBe(true)

    // send.ts must import and use createNotification
    expect(
      sendSrc.includes('createNotification'),
      'notifications/send.ts must call createNotification (pipeline entry point)'
    ).toBe(true)

    // actions.ts must call routeNotification (delivery to channels)
    expect(
      actionsSrc.includes('routeNotification'),
      'notifications/actions.ts must call routeNotification (delivers to email/SMS/push)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Recipient resolution function exists
  // -------------------------------------------------------------------------
  test('notifications/actions.ts exports getChefAuthUserId for recipient resolution', () => {
    const src = readFileSync(NOTIFICATION_ACTIONS, 'utf-8')

    expect(
      src.includes('getChefAuthUserId'),
      'notifications/actions.ts must export getChefAuthUserId (maps tenant -> auth user for delivery)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 7: Channel router exists and handles in-app + external channels
  // -------------------------------------------------------------------------
  test('channel-router.ts exists and routes to multiple delivery channels', () => {
    expect(existsSync(CHANNEL_ROUTER), 'lib/notifications/channel-router.ts must exist').toBe(true)

    const src = readFileSync(CHANNEL_ROUTER, 'utf-8')

    // Must handle at least one external channel (email or SMS or push)
    const hasExternalChannel = src.includes('email') || src.includes('sms') || src.includes('push')

    expect(
      hasExternalChannel,
      'channel-router.ts must route to at least one external channel (email, SMS, or push)'
    ).toBe(true)
  })
})
