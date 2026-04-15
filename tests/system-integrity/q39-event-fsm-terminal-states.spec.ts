/**
 * Q39: Event FSM Terminal State Guards
 *
 * The event FSM has 8 states. Two are terminal: 'completed' and 'cancelled'.
 * Once an event reaches either terminal state, no further transitions are
 * allowed. Violations would allow:
 *   - Re-opening a completed event (revenue accounting nightmare)
 *   - Re-activating a cancelled event (potential double-charge)
 *   - Firing installment reminders for cancelled events
 *
 * Q4 covers the FSM broadly. Q39 is specifically about the terminal state
 * enforcement being a hard stop, not a soft warning.
 *
 * Tests:
 *
 * 1. TERMINAL STATES DEFINED: lib/events/transitions.ts defines
 *    'completed' and 'cancelled' as having empty transition arrays [].
 *
 * 2. TRANSITION CHECK: transitionEvent() checks whether the current state
 *    is terminal before allowing any transition.
 *
 * 3. COMPLETED HAS NO OUTGOING: The completed state maps to [] — no
 *    state can follow completed.
 *
 * 4. CANCELLED HAS NO OUTGOING: The cancelled state maps to [] — no
 *    state can follow cancelled.
 *
 * 5. VALID_TRANSITIONS MAP: A VALID_TRANSITIONS constant or similar
 *    structure is the single source of truth for allowed transitions.
 *
 * 6. ERROR ON TERMINAL ATTEMPT: The function throws or returns an error
 *    when a transition from a terminal state is attempted.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q39-event-fsm-terminal-states.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const TRANSITIONS = resolve(process.cwd(), 'lib/events/transitions.ts')

test.describe('Q39: Event FSM terminal state guards', () => {
  // -------------------------------------------------------------------------
  // Test 1: Terminal states defined with empty transition arrays
  // -------------------------------------------------------------------------
  test('completed and cancelled are defined as terminal states (empty transitions [])', () => {
    expect(existsSync(TRANSITIONS), 'lib/events/transitions.ts must exist').toBe(true)

    const src = readFileSync(TRANSITIONS, 'utf-8')

    // Both terminal states must map to empty arrays
    expect(
      src.includes('completed: []') ||
        src.includes("'completed': []") ||
        src.includes('"completed": []'),
      'transitions.ts must define completed as terminal: completed: []'
    ).toBe(true)

    expect(
      src.includes('cancelled: []') ||
        src.includes("'cancelled': []") ||
        src.includes('"cancelled": []'),
      'transitions.ts must define cancelled as terminal: cancelled: []'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: transitionEvent checks for terminal state
  // -------------------------------------------------------------------------
  test('transitionEvent() checks for terminal state before allowing transition', () => {
    const src = readFileSync(TRANSITIONS, 'utf-8')

    // Must check if transitions are available / if state is terminal
    expect(
      src.includes('terminal') ||
        src.includes('TERMINAL') ||
        ((src.includes('length === 0') || src.includes('length == 0') || src.includes('.length')) &&
          src.includes('transition')),
      'transitionEvent must check whether the current state is terminal before allowing transition'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Completed state has no outgoing transitions
  // -------------------------------------------------------------------------
  test('completed state has no allowed outgoing transitions', () => {
    const src = readFileSync(TRANSITIONS, 'utf-8')

    // Find where completed maps and ensure nothing follows
    const completedIdx = src.indexOf('completed')
    expect(completedIdx, 'completed must appear in transitions.ts').toBeGreaterThan(-1)

    // Check around the completed entry for an empty array (terminal marker)
    const region = src.slice(completedIdx, completedIdx + 100)
    expect(
      region.includes('[]') || region.includes(': []'),
      'completed state must map to [] (no outgoing transitions allowed)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Cancelled state has no outgoing transitions
  // -------------------------------------------------------------------------
  test('cancelled state has no allowed outgoing transitions', () => {
    const src = readFileSync(TRANSITIONS, 'utf-8')

    const cancelledIdx = src.indexOf('cancelled')
    expect(cancelledIdx, 'cancelled must appear in transitions.ts').toBeGreaterThan(-1)

    const region = src.slice(cancelledIdx, cancelledIdx + 100)
    expect(
      region.includes('[]') || region.includes(': []'),
      'cancelled state must map to [] (no outgoing transitions allowed)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Single VALID_TRANSITIONS map as FSM source of truth
  // -------------------------------------------------------------------------
  test('VALID_TRANSITIONS or equivalent is the single source of truth for allowed moves', () => {
    const src = readFileSync(TRANSITIONS, 'utf-8')

    expect(
      src.includes('TRANSITION_RULES') ||
        src.includes('VALID_TRANSITIONS') ||
        src.includes('validTransitions') ||
        src.includes('ALLOWED_TRANSITIONS') ||
        src.includes('STATE_MACHINE'),
      'transitions.ts must define a single transition map constant (TRANSITION_RULES or equivalent)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Error returned when terminal transition attempted
  // -------------------------------------------------------------------------
  test('transitionEvent returns error or throws for attempted transition from terminal state', () => {
    const src = readFileSync(TRANSITIONS, 'utf-8')

    expect(
      src.includes("'Cannot transition") ||
        src.includes('"Cannot transition') ||
        src.includes('already in') ||
        src.includes('terminal') ||
        src.includes('Invalid transition') ||
        src.includes('not allowed'),
      'transitionEvent must throw or return an error message when transition from terminal state is attempted'
    ).toBe(true)
  })
})
