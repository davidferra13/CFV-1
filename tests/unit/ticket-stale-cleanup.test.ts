import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cleanupStalePendingTickets } from '../../lib/tickets/stale-pending-cleanup'

type QueryResult = { data?: any; error?: any }

class FakeDb {
  failFinalCancelFor = new Set<string>()

  tickets = [
    {
      id: 'ticket_1',
      event_id: 'event_1',
      tenant_id: 'tenant_1',
      ticket_type_id: 'type_1',
      quantity: 2,
      payment_status: 'pending',
      last_payment_error: null,
      capacity_released_at: null,
      stripe_checkout_session_id: 'cs_expired',
      created_at: '2026-04-27T10:00:00.000Z',
    },
    {
      id: 'ticket_2',
      event_id: 'event_1',
      tenant_id: 'tenant_1',
      ticket_type_id: 'type_1',
      quantity: 1,
      payment_status: 'pending',
      last_payment_error: null,
      capacity_released_at: null,
      stripe_checkout_session_id: 'cs_complete',
      created_at: '2026-04-27T10:00:00.000Z',
    },
    {
      id: 'ticket_3',
      event_id: 'event_1',
      tenant_id: 'tenant_1',
      ticket_type_id: 'type_1',
      quantity: 1,
      payment_status: 'pending',
      last_payment_error: null,
      capacity_released_at: null,
      stripe_checkout_session_id: null,
      created_at: '2026-04-27T10:00:00.000Z',
    },
  ]

  ticketTypes = [{ id: 'type_1', tenant_id: 'tenant_1', sold_count: 4 }]
  addonPurchases = [{ ticket_id: 'ticket_1', addon_id: 'addon_1', quantity: 3 }]
  addons = [{ id: 'addon_1', tenant_id: 'tenant_1', sold_count: 5 }]

  from(table: string) {
    return new FakeQuery(this, table)
  }
}

class FakeQuery {
  private filters: Array<{ column: string; value: any; operator: 'eq' | 'lt' | 'neq' | 'is' }> = []
  private patch: Record<string, any> | null = null

  constructor(
    private db: FakeDb,
    private table: string
  ) {}

  select() {
    return this
  }

  update(patch: Record<string, any>) {
    this.patch = patch
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value, operator: 'eq' })
    return this
  }

  lt(column: string, value: any) {
    this.filters.push({ column, value, operator: 'lt' })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ column, value, operator: 'neq' })
    return this
  }

  is(column: string, value: any) {
    this.filters.push({ column, value, operator: 'is' })
    return this
  }

  order() {
    return this
  }

  async limit() {
    return { data: this.applyFilters(this.rows()), error: null }
  }

  async maybeSingle() {
    if (this.patch) {
      const rows = this.applyFilters(this.rows())
      const row = rows[0]
      if (!row) return { data: null, error: null }
      if (
        this.table === 'event_tickets' &&
        this.patch.payment_status === 'cancelled' &&
        this.db.failFinalCancelFor.has(row.id)
      ) {
        return { data: null, error: null }
      }
      Object.assign(row, this.patch)
      return { data: { id: row.id }, error: null }
    }

    return { data: this.applyFilters(this.rows())[0] ?? null, error: null }
  }

  then(resolve: (value: QueryResult) => void, reject: (reason?: any) => void) {
    const rows = this.applyFilters(this.rows())
    if (this.patch) {
      for (const row of rows) {
        Object.assign(row, this.patch)
      }
    }
    Promise.resolve({ data: rows, error: null }).then(resolve, reject)
  }

  private rows() {
    if (this.table === 'event_tickets') return this.db.tickets
    if (this.table === 'event_ticket_types') return this.db.ticketTypes
    if (this.table === 'event_ticket_addon_purchases') return this.db.addonPurchases
    if (this.table === 'event_ticket_addons') return this.db.addons
    return []
  }

  private applyFilters(rows: any[]) {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column]
        if (filter.operator === 'lt') return value < filter.value
        if (filter.operator === 'neq') return value !== filter.value
        if (filter.operator === 'is') return value === filter.value
        return value === filter.value
      })
    )
  }
}

describe('stale pending ticket cleanup', () => {
  it('cancels stale non-complete sessions and releases ticket and add-on capacity', async () => {
    const db = new FakeDb()
    const stripe = {
      checkout: {
        sessions: {
          retrieve: async (id: string) => ({
            id,
            status: id === 'cs_complete' ? 'complete' : 'expired',
          }),
        },
      },
    }

    const result = await cleanupStalePendingTickets({
      db,
      stripe,
      now: new Date('2026-04-29T12:00:00.000Z'),
      staleHours: 24,
      revalidate: () => {},
    })

    assert.equal(result.checked, 3)
    assert.equal(result.cancelled, 1)
    assert.equal(result.skippedComplete, 1)
    assert.equal(result.unverifiable, 1)
    assert.equal(result.cancelCasMisses, 0)
    assert.deepEqual(result.ticketIds, ['ticket_1'])
    assert.deepEqual(result.unverifiableTicketIds, ['ticket_3'])
    assert.equal(db.tickets[0].payment_status, 'cancelled')
    assert.equal(db.tickets[0].capacity_released_at, '2026-04-29T12:00:00.000Z')
    assert.equal(db.ticketTypes[0].sold_count, 2)
    assert.equal(db.addons[0].sold_count, 2)
    assert.equal(db.tickets[1].payment_status, 'pending')
  })

  it('does not release capacity before winning the cancel CAS', async () => {
    const db = new FakeDb()
    db.tickets = [db.tickets[0]]
    db.failFinalCancelFor.add('ticket_1')
    const stripe = {
      checkout: {
        sessions: {
          retrieve: async (id: string) => ({
            id,
            status: 'expired',
          }),
        },
      },
    }

    const firstRun = await cleanupStalePendingTickets({
      db,
      stripe,
      now: new Date('2026-04-29T12:00:00.000Z'),
      staleHours: 24,
      revalidate: () => {},
    })

    assert.equal(firstRun.cancelled, 0)
    assert.equal(firstRun.cancelCasMisses, 1)
    assert.equal(db.tickets[0].payment_status, 'pending')
    assert.equal(db.tickets[0].capacity_released_at, null)
    assert.equal(db.ticketTypes[0].sold_count, 4)
    assert.equal(db.addons[0].sold_count, 5)

    db.failFinalCancelFor.clear()

    const secondRun = await cleanupStalePendingTickets({
      db,
      stripe,
      now: new Date('2026-04-29T12:05:00.000Z'),
      staleHours: 24,
      revalidate: () => {},
    })

    assert.equal(secondRun.cancelled, 1)
    assert.equal(secondRun.alreadyReleased, 0)
    assert.equal(db.ticketTypes[0].sold_count, 2)
    assert.equal(db.addons[0].sold_count, 2)
    assert.equal(db.tickets[0].payment_status, 'cancelled')
  })

  it('recovers cleanup-cancelled tickets with unreleased capacity', async () => {
    const db = new FakeDb()
    db.tickets = [
      {
        ...db.tickets[0],
        payment_status: 'cancelled',
        last_payment_error: 'Stale pending checkout cleanup',
        capacity_released_at: null,
      },
    ]

    const result = await cleanupStalePendingTickets({
      db,
      stripe: null,
      now: new Date('2026-04-29T12:00:00.000Z'),
      staleHours: 24,
      revalidate: () => {},
    })

    assert.equal(result.checked, 1)
    assert.equal(result.cancelled, 0)
    assert.equal(result.unverifiable, 0)
    assert.deepEqual(result.ticketIds, ['ticket_1'])
    assert.equal(db.tickets[0].capacity_released_at, '2026-04-29T12:00:00.000Z')
    assert.equal(db.ticketTypes[0].sold_count, 2)
    assert.equal(db.addons[0].sold_count, 2)
  })

  it('reports checkout-session tickets as unverifiable when Stripe is unavailable', async () => {
    const db = new FakeDb()

    const result = await cleanupStalePendingTickets({
      db,
      stripe: null,
      now: new Date('2026-04-29T12:00:00.000Z'),
      staleHours: 24,
      revalidate: () => {},
    })

    assert.equal(result.cancelled, 0)
    assert.equal(result.unverifiable, 3)
    assert.equal(db.ticketTypes[0].sold_count, 4)
    assert.equal(db.addons[0].sold_count, 5)
  })
})
