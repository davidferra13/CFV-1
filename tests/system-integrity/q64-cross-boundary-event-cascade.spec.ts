/**
 * Q64: Cross-Boundary Event Cascade
 *
 * Hypothesis: When an event transitions to 'cancelled', ALL downstream
 * effects fire: installments voided, notifications sent, calendar updated,
 * activity logged.
 *
 * Failure: Cancelled event still has active installments charging the client,
 * or client doesn't know event was cancelled.
 *
 * Tests:
 *
 * 1. lib/events/transitions.ts has a 'cancelled' transition handler
 * 2. The cancellation path sends a notification (broadcastUpdate or createNotification)
 * 3. The cancellation path sends client notification
 * 4. The cancellation path sends a cancellation email
 * 5. The payment_plan_installments trigger exists in migrations (void unpaid on cancel)
 * 6. The cancellation handler revalidates relevant paths
 *
 * Approach: Read transitions.ts, find the cancellation code path, verify
 * each downstream effect exists.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q64-cross-boundary-event-cascade.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const TRANSITIONS = resolve(ROOT, 'lib/events/transitions.ts')
const MIGRATIONS_DIR = resolve(ROOT, 'database/migrations')

test.describe('Q64: Cross-boundary event cascade', () => {
  let src: string

  test.beforeAll(() => {
    expect(existsSync(TRANSITIONS), 'lib/events/transitions.ts must exist').toBe(true)
    src = readFileSync(TRANSITIONS, 'utf-8')
  })

  // -------------------------------------------------------------------------
  // Test 1: 'cancelled' is a recognized terminal state
  // -------------------------------------------------------------------------
  test("'cancelled' is a recognized terminal state in the FSM", () => {
    // Verify the TRANSITION_RULES include cancelled
    expect(
      src.includes('cancelled: []') || src.includes("'cancelled': []"),
      "'cancelled' must be a terminal state in TRANSITION_RULES (empty allowed transitions)"
    ).toBe(true)

    // Verify cancelled is listed as a target in multiple states
    const cancelledTransitions = (src.match(/'cancelled'/g) || []).length
    expect(
      cancelledTransitions,
      "'cancelled' must appear multiple times (as target from many states)"
    ).toBeGreaterThan(3)
  })

  // -------------------------------------------------------------------------
  // Test 2: Cancellation sends chef notifications
  // -------------------------------------------------------------------------
  test('cancellation path sends chef notification', () => {
    // The transitions file must import or reference createNotification
    expect(
      src.includes('createNotification') || src.includes('notification'),
      'transitions.ts must reference notification creation for cancellation events'
    ).toBe(true)

    // There must be a section handling cancelled -> notification
    expect(
      src.includes("toStatus === 'cancelled'") || src.includes('event_cancelled'),
      "transitions.ts must have specific handling for toStatus === 'cancelled'"
    ).toBe(true)

    // Verify the notification specifically references cancellation
    expect(
      src.includes("action: 'event_cancelled'") ||
        src.includes("action: 'event_cancelled_to_client'"),
      'transitions.ts must create a notification with a cancellation-specific action'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Cancellation sends client notification
  // -------------------------------------------------------------------------
  test('cancellation path sends client notification', () => {
    // The transitions file must call createClientNotification for cancellations
    expect(
      src.includes('createClientNotification'),
      'transitions.ts must import and call createClientNotification'
    ).toBe(true)

    // There must be a cancelled-specific client notification
    expect(
      src.includes("'event_cancelled_to_client'") || src.includes('"event_cancelled_to_client"'),
      "transitions.ts must create a client notification with action 'event_cancelled_to_client'"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Cancellation sends cancellation email
  // -------------------------------------------------------------------------
  test('cancellation path sends cancellation email to client', () => {
    // Check for sendEventCancelledEmail import/usage
    expect(
      src.includes('sendEventCancelledEmail') || src.includes('CancelledEmail'),
      'transitions.ts must import and use sendEventCancelledEmail for the cancellation path'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Database trigger voids unpaid installments on event cancellation
  // -------------------------------------------------------------------------
  test('migration exists to void unpaid installments when event is cancelled', () => {
    expect(existsSync(MIGRATIONS_DIR), 'database/migrations/ directory must exist').toBe(true)

    const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))

    // Search for a migration that creates the void installments trigger
    let foundVoidTrigger = false
    let triggerMigrationFile = ''

    for (const file of migrationFiles) {
      const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      if (
        content.includes('void_installments_on_event_cancel') ||
        content.includes('trg_void_installments_on_cancel')
      ) {
        foundVoidTrigger = true
        triggerMigrationFile = file
        break
      }
    }

    expect(
      foundVoidTrigger,
      'A migration must create a trigger to void unpaid installments when event status changes to cancelled. ' +
        'Without this, cancelled events can still have active installments charging the client.'
    ).toBe(true)

    if (triggerMigrationFile) {
      console.log(`[Q64] Installment void trigger found in: ${triggerMigrationFile}`)

      // Verify the trigger fires on update to 'cancelled'
      const triggerSrc = readFileSync(join(MIGRATIONS_DIR, triggerMigrationFile), 'utf-8')

      expect(
        triggerSrc.includes("'cancelled'") || triggerSrc.includes('"cancelled"'),
        'The installment void trigger must specifically check for the cancelled status'
      ).toBe(true)

      expect(
        triggerSrc.includes('cancelled_at') || triggerSrc.includes('void'),
        'The trigger must set cancelled_at or void the installments'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 6: Cancellation revalidates relevant paths
  // -------------------------------------------------------------------------
  test('transition handler revalidates event and dashboard paths', () => {
    // The transitionEvent function must revalidate relevant paths
    expect(
      src.includes("revalidatePath('/events')") || src.includes('revalidatePath(`/events'),
      'transitionEvent must revalidate the /events path after any transition (including cancellation)'
    ).toBe(true)

    expect(
      src.includes("revalidatePath('/dashboard')") || src.includes('revalidatePath(`/dashboard'),
      'transitionEvent must revalidate the /dashboard path (cancelled events affect the dashboard)'
    ).toBe(true)

    // Also check that the specific event page is revalidated
    expect(
      src.includes('revalidatePath(`/events/${eventId}`') ||
        src.includes('revalidatePath(`/events/$'),
      'transitionEvent must revalidate the specific event page'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 7: SSE broadcast fires on cancellation
  // -------------------------------------------------------------------------
  test('transition handler broadcasts status change via SSE', () => {
    // The transition must broadcast to connected clients via SSE
    expect(
      src.includes('broadcast(') || src.includes('broadcastUpdate('),
      'transitionEvent must broadcast the status change via SSE for live client updates'
    ).toBe(true)

    expect(
      src.includes('status_changed') || src.includes('event_updated'),
      "The SSE broadcast must include a 'status_changed' event type"
    ).toBe(true)
  })
})
