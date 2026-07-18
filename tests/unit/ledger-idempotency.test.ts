/**
 * Unit tests for the manual-ledger idempotency key.
 *
 * The deposit and balance-payment paths derived transaction_reference from
 * Date.now(), so a double-click posted two rows. The key must be deterministic.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ledgerReference } from '../../lib/ledger/idempotency'

describe('ledgerReference', () => {
  it('is deterministic across identical calls (double-click dedupes)', () => {
    assert.equal(ledgerReference('dep', 'evt-1', 50000), ledgerReference('dep', 'evt-1', 50000))
  })

  it('carries no timestamp (regression guard against Date.now())', () => {
    assert.equal(ledgerReference('dep', 'evt-1', 50000), 'dep_evt-1_50000')
  })

  it('differs by amount', () => {
    assert.notEqual(ledgerReference('dep', 'evt-1', 50000), ledgerReference('dep', 'evt-1', 60000))
  })

  it('differs by entry kind (deposit vs balance)', () => {
    assert.notEqual(ledgerReference('dep', 'evt-1', 50000), ledgerReference('bal', 'evt-1', 50000))
  })
})
