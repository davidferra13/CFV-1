/**
 * Unit tests for the Event FSM (Finite State Machine)
 *
 * Tests the pure logic in lib/events/fsm.ts:
 *   - Valid/invalid state transitions
 *   - Actor permission enforcement
 *   - Terminal state detection
 *   - Full transition matrix coverage
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidTransition,
  isActorPermitted,
  validateTransition,
  isTerminalState,
  getAllowedTransitions,
  TRANSITION_RULES,
  ALL_EVENT_STATUSES,
  TERMINAL_STATES,
  type EventStatus,
  type TransitionActor,
} from '../../lib/events/fsm.js'

// ─────────────────────────────────────────────────────────────────────────────
// VALID TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('isValidTransition — valid forward paths', () => {
  const validPaths: [EventStatus, EventStatus][] = [
    ['draft', 'proposed'],
    ['draft', 'paid'], // Instant-book
    ['draft', 'cancelled'],
    ['proposed', 'accepted'],
    ['proposed', 'cancelled'],
    ['accepted', 'paid'],
    ['accepted', 'cancelled'],
    ['paid', 'confirmed'],
    ['paid', 'cancelled'],
    ['confirmed', 'in_progress'],
    ['confirmed', 'cancelled'],
    ['in_progress', 'completed'],
    ['in_progress', 'cancelled'],
  ]

  for (const [from, to] of validPaths) {
    it(`${from} → ${to} should be valid`, () => {
      assert.equal(isValidTransition(from, to), true)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// INVALID TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('isValidTransition — invalid/skipping transitions', () => {
  const invalidPaths: [EventStatus, EventStatus][] = [
    ['draft', 'accepted'],
    ['draft', 'confirmed'],
    ['draft', 'in_progress'],
    ['draft', 'completed'],
    ['proposed', 'paid'],
    ['proposed', 'confirmed'],
    ['proposed', 'in_progress'],
    ['proposed', 'completed'],
    ['accepted', 'confirmed'],
    ['accepted', 'in_progress'],
    ['accepted', 'completed'],
    ['paid', 'in_progress'],
    ['paid', 'completed'],
    ['confirmed', 'completed'],
  ]

  for (const [from, to] of invalidPaths) {
    it(`${from} → ${to} should be INVALID`, () => {
      assert.equal(isValidTransition(from, to), false)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL STATES — no transitions out
// ─────────────────────────────────────────────────────────────────────────────

describe('Terminal states block all transitions', () => {
  for (const terminal of TERMINAL_STATES) {
    for (const status of ALL_EVENT_STATUSES) {
      it(`${terminal} → ${status} should be INVALID`, () => {
        assert.equal(isValidTransition(terminal as EventStatus, status), false)
      })
    }
  }
})

describe('isTerminalState', () => {
  it('completed is terminal', () => assert.equal(isTerminalState('completed'), true))
  it('cancelled is terminal', () => assert.equal(isTerminalState('cancelled'), true))
  it('draft is NOT terminal', () => assert.equal(isTerminalState('draft'), false))
  it('proposed is NOT terminal', () => assert.equal(isTerminalState('proposed'), false))
  it('accepted is NOT terminal', () => assert.equal(isTerminalState('accepted'), false))
  it('paid is NOT terminal', () => assert.equal(isTerminalState('paid'), false))
  it('confirmed is NOT terminal', () => assert.equal(isTerminalState('confirmed'), false))
  it('in_progress is NOT terminal', () => assert.equal(isTerminalState('in_progress'), false))
})

// ─────────────────────────────────────────────────────────────────────────────
// ACTOR PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('isActorPermitted — chef permissions', () => {
  it('chef can propose (draft → proposed)', () => {
    assert.equal(isActorPermitted('draft', 'proposed', 'chef'), true)
  })
  it('chef can confirm (paid → confirmed)', () => {
    assert.equal(isActorPermitted('paid', 'confirmed', 'chef'), true)
  })
  it('chef can start service (confirmed → in_progress)', () => {
    assert.equal(isActorPermitted('confirmed', 'in_progress', 'chef'), true)
  })
  it('chef can complete (in_progress → completed)', () => {
    assert.equal(isActorPermitted('in_progress', 'completed', 'chef'), true)
  })
  it('chef can cancel from proposed', () => {
    assert.equal(isActorPermitted('proposed', 'cancelled', 'chef'), true)
  })
  it('chef can cancel from accepted', () => {
    assert.equal(isActorPermitted('accepted', 'cancelled', 'chef'), true)
  })
})

describe('isActorPermitted — client permissions', () => {
  it('client can accept (proposed → accepted)', () => {
    assert.equal(isActorPermitted('proposed', 'accepted', 'client'), true)
  })
  it('client can cancel from proposed', () => {
    assert.equal(isActorPermitted('proposed', 'cancelled', 'client'), true)
  })
  it('client can cancel from accepted', () => {
    assert.equal(isActorPermitted('accepted', 'cancelled', 'client'), true)
  })
  it('client CANNOT propose (draft → proposed)', () => {
    assert.equal(isActorPermitted('draft', 'proposed', 'client'), false)
  })
  it('client CANNOT confirm (paid → confirmed)', () => {
    assert.equal(isActorPermitted('paid', 'confirmed', 'client'), false)
  })
  it('client CANNOT complete (in_progress → completed)', () => {
    assert.equal(isActorPermitted('in_progress', 'completed', 'client'), false)
  })
})

describe('isActorPermitted — system permissions (Stripe webhook)', () => {
  it('system can pay instantly (draft → paid)', () => {
    assert.equal(isActorPermitted('draft', 'paid', 'system'), true)
  })
  it('system can pay from accepted (accepted → paid)', () => {
    assert.equal(isActorPermitted('accepted', 'paid', 'system'), true)
  })
  it('system CANNOT propose', () => {
    assert.equal(isActorPermitted('draft', 'proposed', 'system'), false)
  })
  it('system CANNOT confirm', () => {
    assert.equal(isActorPermitted('paid', 'confirmed', 'system'), false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// validateTransition — combined validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validateTransition — returns { valid: true } for correct paths', () => {
  it('chef proposing draft event', () => {
    const result = validateTransition('draft', 'proposed', 'chef')
    assert.equal(result.valid, true)
  })

  it('client accepting proposal', () => {
    const result = validateTransition('proposed', 'accepted', 'client')
    assert.equal(result.valid, true)
  })

  it('system processing payment (accepted → paid)', () => {
    const result = validateTransition('accepted', 'paid', 'system')
    assert.equal(result.valid, true)
  })

  it('chef confirming paid event', () => {
    const result = validateTransition('paid', 'confirmed', 'chef')
    assert.equal(result.valid, true)
  })
})

describe('validateTransition — returns { valid: false } for invalid paths', () => {
  it('skipping states (draft → completed)', () => {
    const result = validateTransition('draft', 'completed', 'chef')
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('Invalid transition'))
  })

  it('client trying to propose (chef-only action)', () => {
    const result = validateTransition('draft', 'proposed', 'client')
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('chef'))
  })

  it('chef trying to pay (system-only action)', () => {
    const result = validateTransition('accepted', 'paid', 'chef')
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.toLowerCase().includes('system'))
  })

  it('transitioning from terminal state (completed → anything)', () => {
    const result = validateTransition('completed', 'draft', 'chef')
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('terminal'))
  })

  it('transitioning from cancelled', () => {
    const result = validateTransition('cancelled', 'draft', 'chef')
    assert.equal(result.valid, false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION RULES completeness check
// ─────────────────────────────────────────────────────────────────────────────

describe('TRANSITION_RULES completeness', () => {
  it('every status has an entry in TRANSITION_RULES', () => {
    for (const status of ALL_EVENT_STATUSES) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(TRANSITION_RULES, status),
        `Missing entry for status: ${status}`
      )
    }
  })

  it('all referenced target states are valid statuses', () => {
    for (const [from, targets] of Object.entries(TRANSITION_RULES)) {
      for (const to of targets) {
        assert.ok(
          ALL_EVENT_STATUSES.includes(to as EventStatus),
          `Invalid target status '${to}' in TRANSITION_RULES['${from}']`
        )
      }
    }
  })
})

describe('getAllowedTransitions', () => {
  it('draft has 3 allowed transitions', () => {
    assert.equal(getAllowedTransitions('draft').length, 3)
  })
  it('completed has 0 allowed transitions', () => {
    assert.equal(getAllowedTransitions('completed').length, 0)
  })
  it('cancelled has 0 allowed transitions', () => {
    assert.equal(getAllowedTransitions('cancelled').length, 0)
  })
})
