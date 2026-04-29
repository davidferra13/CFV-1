import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTicketPurchaseTransactionReferences,
  reconcileTicketFinancialTruth,
} from '../../lib/tickets/reconciliation'

describe('ticket reconciliation', () => {
  it('builds deterministic Stripe ticket purchase transaction references', () => {
    assert.deepEqual(
      buildTicketPurchaseTransactionReferences({
        stripe_payment_intent_id: 'pi_123',
        stripe_checkout_session_id: 'cs_456',
      }),
      ['stripe_ticket_pi_123', 'stripe_ticket_cs_456']
    )
  })

  it('detects paid tickets without matching positive ledger entries', () => {
    const result = reconcileTicketFinancialTruth({
      tickets: [
        {
          id: 'ticket_1',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          total_cents: 7500,
          payment_status: 'paid',
          capacity_released_at: null,
          stripe_payment_intent_id: 'pi_missing',
          stripe_checkout_session_id: 'cs_missing',
        },
      ],
      ledgerEntries: [],
    })

    assert.deepEqual(
      result.mismatches.map((mismatch) => mismatch.code),
      ['paid_ticket_missing_positive_ledger']
    )
  })

  it('matches paid tickets to positive ledger entries by Stripe reference', () => {
    const result = reconcileTicketFinancialTruth({
      tickets: [
        {
          id: 'ticket_1',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          total_cents: 7500,
          payment_status: 'paid',
          capacity_released_at: null,
          stripe_payment_intent_id: 'pi_123',
        },
      ],
      ledgerEntries: [
        {
          id: 'ledger_1',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          amount_cents: 7500,
          entry_type: 'payment',
          transaction_reference: 'stripe_ticket_pi_123',
          is_refund: false,
        },
      ],
    })

    assert.deepEqual(result.mismatches, [])
  })

  it('detects refunded tickets without matching negative refund ledger entries', () => {
    const result = reconcileTicketFinancialTruth({
      tickets: [
        {
          id: 'ticket_1',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          total_cents: 7500,
          payment_status: 'refunded',
          capacity_released_at: null,
          stripe_payment_intent_id: 'pi_123',
        },
      ],
      ledgerEntries: [
        {
          id: 'ledger_1',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          amount_cents: 7500,
          entry_type: 'payment',
          transaction_reference: 'stripe_ticket_pi_123',
          is_refund: false,
        },
      ],
    })

    assert.deepEqual(
      result.mismatches.map((mismatch) => mismatch.code),
      ['refunded_ticket_missing_negative_refund_ledger']
    )
  })

  it('detects ticket ledger entries without matching tickets', () => {
    const result = reconcileTicketFinancialTruth({
      tickets: [],
      ledgerEntries: [
        {
          id: 'ledger_1',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          amount_cents: 7500,
          entry_type: 'payment',
          transaction_reference: 'stripe_ticket_pi_orphan',
          is_refund: false,
        },
      ],
    })

    assert.deepEqual(
      result.mismatches.map((mismatch) => mismatch.code),
      ['ticket_ledger_missing_ticket']
    )
  })

  it('detects inconsistent capacity release states', () => {
    const result = reconcileTicketFinancialTruth({
      tickets: [
        {
          id: 'ticket_pending',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          total_cents: 7500,
          payment_status: 'pending',
          capacity_released_at: '2026-04-29T12:00:00.000Z',
        },
        {
          id: 'ticket_failed',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          total_cents: 7500,
          payment_status: 'failed',
          capacity_released_at: null,
        },
        {
          id: 'ticket_cancelled',
          event_id: 'event_1',
          tenant_id: 'tenant_1',
          total_cents: 7500,
          payment_status: 'cancelled',
          capacity_released_at: null,
        },
      ],
      ledgerEntries: [],
    })

    assert.deepEqual(
      result.mismatches.map((mismatch) => mismatch.code),
      [
        'pending_ticket_capacity_released',
        'failed_ticket_capacity_not_released',
        'cancelled_ticket_capacity_not_released',
      ]
    )
  })
})
