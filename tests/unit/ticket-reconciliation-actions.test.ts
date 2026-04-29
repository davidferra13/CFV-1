import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runTicketReconciliationAuditForCron } from '../../lib/tickets/reconciliation-actions'

type QueryResult = { data?: any[]; error?: any }

class FakeDb {
  tickets = [
    {
      id: 'ticket_paid_missing',
      event_id: 'event_1',
      tenant_id: 'tenant_1',
      total_cents: 5000,
      payment_status: 'paid',
      capacity_released_at: null,
      stripe_payment_intent_id: 'pi_missing',
      stripe_checkout_session_id: 'cs_missing',
      created_at: '2026-04-29T10:00:00.000Z',
    },
    {
      id: 'ticket_refunded',
      event_id: 'event_1',
      tenant_id: 'tenant_1',
      total_cents: 7000,
      payment_status: 'refunded',
      capacity_released_at: null,
      stripe_payment_intent_id: 'pi_refunded',
      stripe_checkout_session_id: 'cs_refunded',
      created_at: '2026-04-29T10:00:00.000Z',
    },
  ]

  ledgerEntries = [
    {
      id: 'ledger_purchase_refunded',
      tenant_id: 'tenant_1',
      event_id: 'event_1',
      amount_cents: 7000,
      entry_type: 'payment',
      transaction_reference: 'stripe_ticket_pi_refunded',
      is_refund: false,
      internal_notes: null,
      description: 'Ticket purchase',
    },
    {
      id: 'ledger_refund_refunded',
      tenant_id: 'tenant_1',
      event_id: 'event_1',
      amount_cents: -7000,
      entry_type: 'refund',
      transaction_reference: 'ticket_refund_ticket_refunded',
      is_refund: true,
      internal_notes: null,
      description: 'Ticket refund',
    },
    {
      id: 'ledger_orphan',
      tenant_id: 'tenant_1',
      event_id: 'event_orphan',
      amount_cents: 9000,
      entry_type: 'payment',
      transaction_reference: 'stripe_ticket_pi_orphan',
      is_refund: false,
      internal_notes: null,
      description: 'Ticket purchase',
    },
  ]

  from(table: string) {
    return new FakeQuery(this, table)
  }
}

class FakeQuery {
  private filters: Array<{
    column: string
    value: any
    operator: 'eq' | 'in' | 'like'
  }> = []
  private rowLimit: number | null = null

  constructor(
    private db: FakeDb,
    private table: string
  ) {}

  select() {
    return this
  }

  order() {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value, operator: 'eq' })
    return this
  }

  in(column: string, value: any[]) {
    this.filters.push({ column, value, operator: 'in' })
    return this
  }

  like(column: string, value: string) {
    this.filters.push({ column, value, operator: 'like' })
    return this
  }

  async limit(value: number) {
    this.rowLimit = value
    return { data: this.applyFilters(this.rows()).slice(0, value), error: null }
  }

  then(resolve: (value: QueryResult) => void, reject: (reason?: any) => void) {
    const rows = this.applyFilters(this.rows())
    Promise.resolve({ data: this.rowLimit ? rows.slice(0, this.rowLimit) : rows, error: null }).then(
      resolve,
      reject
    )
  }

  private rows() {
    if (this.table === 'event_tickets') return this.db.tickets
    if (this.table === 'ledger_entries') return this.db.ledgerEntries
    return []
  }

  private applyFilters(rows: any[]) {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column]
        if (filter.operator === 'in') return filter.value.includes(value)
        if (filter.operator === 'like') {
          const regex = new RegExp(`^${String(filter.value).replace(/%/g, '.*')}$`)
          return regex.test(String(value ?? ''))
        }
        return value === filter.value
      })
    )
  }
}

describe('ticket reconciliation actions', () => {
  it('loads ticket and ledger truth into a structured audit result', async () => {
    const result = await runTicketReconciliationAuditForCron({
      db: new FakeDb(),
      now: new Date('2026-04-29T12:00:00.000Z'),
      limit: 100,
    })

    assert.equal(result.checkedAt, '2026-04-29T12:00:00.000Z')
    assert.equal(result.ticketCount, 2)
    assert.equal(result.ledgerEntryCount, 3)
    assert.equal(result.mismatchCount, 2)
    assert.equal(result.summaryByCode.paid_ticket_missing_positive_ledger, 1)
    assert.equal(result.summaryByCode.ticket_ledger_missing_ticket, 1)
  })

  it('can scope the audit to one tenant', async () => {
    const db = new FakeDb()
    db.tickets.push({
      id: 'ticket_other_tenant',
      event_id: 'event_2',
      tenant_id: 'tenant_2',
      total_cents: 1100,
      payment_status: 'paid',
      capacity_released_at: null,
      stripe_payment_intent_id: 'pi_other',
      stripe_checkout_session_id: 'cs_other',
      created_at: '2026-04-29T10:00:00.000Z',
    })

    const result = await runTicketReconciliationAuditForCron({
      db,
      tenantId: 'tenant_1',
      limit: 100,
    })

    assert.equal(result.tenantId, 'tenant_1')
    assert.equal(result.ticketCount, 2)
    assert.equal(
      result.mismatches.some((mismatch) => mismatch.ticketId === 'ticket_other_tenant'),
      false
    )
  })
})
