/**
 * Unit tests for the Inquiry FSM.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_INQUIRY_STATUSES,
  TERMINAL_INQUIRY_STATES,
  getAllowedInquiryTransitions,
  isTerminalInquiryState,
  isValidInquiryTransition,
  shouldSyncInquiryToQuotedFromQuoteSend,
  type InquiryStatus,
} from '../../lib/inquiries/fsm.js'

describe('Inquiry FSM - valid transitions', () => {
  const validPaths: [InquiryStatus, InquiryStatus][] = [
    ['new', 'awaiting_client'],
    ['new', 'quoted'],
    ['new', 'declined'],
    ['awaiting_client', 'awaiting_chef'],
    ['awaiting_client', 'quoted'],
    ['awaiting_client', 'declined'],
    ['awaiting_client', 'expired'],
    ['awaiting_chef', 'quoted'],
    ['awaiting_chef', 'declined'],
    ['quoted', 'confirmed'],
    ['quoted', 'declined'],
    ['quoted', 'expired'],
    ['expired', 'new'],
  ]

  for (const [from, to] of validPaths) {
    it(`${from} -> ${to} should be valid`, () => {
      assert.equal(isValidInquiryTransition(from, to), true)
    })
  }
})

describe('Inquiry FSM - invalid transitions', () => {
  const invalidPaths: [InquiryStatus, InquiryStatus][] = [
    ['new', 'awaiting_chef'],
    ['new', 'confirmed'],
    ['awaiting_client', 'confirmed'],
    ['awaiting_chef', 'confirmed'],
    ['quoted', 'awaiting_client'],
    ['quoted', 'new'],
    ['confirmed', 'new'],
    ['confirmed', 'declined'],
    ['declined', 'new'],
    ['declined', 'quoted'],
    ['expired', 'quoted'],
    ['expired', 'confirmed'],
    ['new', 'new'],
    ['quoted', 'quoted'],
  ]

  for (const [from, to] of invalidPaths) {
    it(`${from} -> ${to} should be invalid`, () => {
      assert.equal(isValidInquiryTransition(from, to), false)
    })
  }
})

describe('Inquiry FSM - allowed transition lists', () => {
  it('new can move directly to quoted', () => {
    assert.deepEqual(getAllowedInquiryTransitions('new'), ['awaiting_client', 'quoted', 'declined'])
  })

  it('awaiting_client keeps the quote shortcut', () => {
    assert.deepEqual(getAllowedInquiryTransitions('awaiting_client'), [
      'awaiting_chef',
      'quoted',
      'declined',
      'expired',
    ])
  })

  it('confirmed has no outgoing transitions', () => {
    assert.deepEqual(getAllowedInquiryTransitions('confirmed'), [])
  })
})

describe('Inquiry FSM - terminal states', () => {
  it('confirmed is terminal', () => {
    assert.equal(isTerminalInquiryState('confirmed'), true)
  })

  it('declined is terminal', () => {
    assert.equal(isTerminalInquiryState('declined'), true)
  })

  it('expired is not terminal because it can reopen', () => {
    assert.equal(isTerminalInquiryState('expired'), false)
  })

  it('terminal states remain part of the full status list', () => {
    for (const status of TERMINAL_INQUIRY_STATES) {
      assert.ok(ALL_INQUIRY_STATUSES.includes(status))
    }
  })
})

describe('Inquiry FSM - quote send sync eligibility', () => {
  it('syncs when the inquiry is still pre-quote', () => {
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('new'), true)
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('awaiting_client'), true)
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('awaiting_chef'), true)
  })

  it('does not sync already-quoted or terminal states', () => {
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('quoted'), false)
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('confirmed'), false)
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('declined'), false)
    assert.equal(shouldSyncInquiryToQuotedFromQuoteSend('expired'), false)
  })
})
