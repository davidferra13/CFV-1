import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type Filter =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'in'; column: string; values: unknown[] }
  | { kind: 'not'; column: string; value: unknown }
  | { kind: 'gt'; column: string; value: number }

type OrderBy = {
  column: string
  ascending: boolean
}

type TableState = Record<string, Array<Record<string, any>>>

class QueryBuilder implements PromiseLike<{ data: any; error: any; count?: number }> {
  private readonly filters: Filter[] = []
  private orderBy: OrderBy | null = null
  private countMode: { head?: boolean; count?: string } | null = null

  constructor(
    private readonly table: string,
    private readonly state: TableState
  ) {}

  select(_columns?: string, options?: { head?: boolean; count?: string }) {
    this.countMode = options ?? null
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: 'eq', column, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: 'in', column, values })
    return this
  }

  not(column: string, _operator: string, value: unknown) {
    this.filters.push({ kind: 'not', column, value })
    return this
  }

  gt(column: string, value: number) {
    this.filters.push({ kind: 'gt', column, value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = {
      column,
      ascending: options?.ascending !== false,
    }
    return this
  }

  single() {
    return Promise.resolve(this.executeSingle())
  }

  maybeSingle() {
    return Promise.resolve(this.executeSingle())
  }

  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute() {
    let rows = [...(this.state[this.table] ?? [])]

    for (const filter of this.filters) {
      switch (filter.kind) {
        case 'eq':
          rows = rows.filter((row) => row[filter.column] === filter.value)
          break
        case 'in':
          rows = rows.filter((row) => filter.values.includes(row[filter.column]))
          break
        case 'not':
          rows = rows.filter((row) => row[filter.column] !== filter.value)
          break
        case 'gt':
          rows = rows.filter((row) => Number(row[filter.column] ?? 0) > filter.value)
          break
      }
    }

    if (this.orderBy) {
      rows.sort((left, right) => {
        const leftValue = left[this.orderBy!.column]
        const rightValue = right[this.orderBy!.column]
        if (leftValue === rightValue) return 0
        const result = leftValue > rightValue ? 1 : -1
        return this.orderBy!.ascending ? result : -result
      })
    }

    if (this.countMode?.head && this.countMode.count === 'exact') {
      return { data: null, error: null, count: rows.length }
    }

    return { data: rows, error: null }
  }

  private executeSingle() {
    const result = this.execute()
    const rows = Array.isArray(result.data) ? result.data : []
    return {
      data: rows[0] ?? null,
      error: null,
      count: result.count,
    }
  }
}

function createDb(state: TableState) {
  return {
    from(table: string) {
      return new QueryBuilder(table, state)
    },
  }
}

function mockModule(modulePath: string, exports: unknown, originals: Map<string, unknown>) {
  originals.set(modulePath, require.cache[modulePath] ?? null)
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  } as never
}

function restoreModules(targetPath: string, originals: Map<string, unknown>) {
  for (const [modulePath, original] of originals.entries()) {
    if (original) require.cache[modulePath] = original as never
    else delete require.cache[modulePath]
  }
  delete require.cache[targetPath]
}

function loadSharedSnapshotModule() {
  const originals = new Map<string, unknown>()
  const targetPath = require.resolve('../../lib/client-work-graph/shared-snapshot.ts')

  mockModule(
    require.resolve('../../lib/db/server.ts'),
    {
      createServerClient: () => ({
        from() {
          throw new Error('createServerClient should not be used in this test')
        },
      }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/guests/count-changes.ts'),
    {
      getLatestPendingClientGuestCountChangeMap: async () => new Map(),
    },
    originals
  )

  delete require.cache[targetPath]
  return {
    mod: require(targetPath),
    restore: () => restoreModules(targetPath, originals),
  }
}

describe('shared client work graph snapshot', () => {
  it('builds the shared chef-safe snapshot from tenant-scoped client data', async () => {
    const { mod, restore } = loadSharedSnapshotModule()
    const db = createDb({
      clients: [
        {
          id: 'client-1',
          tenant_id: 'tenant-1',
          full_name: 'Jordan Avery',
          phone: '555-0001',
          address: null,
          dietary_restrictions: ['Vegetarian'],
          allergies: [],
          favorite_cuisines: ['Italian'],
          availability_signal_notifications: false,
        },
      ],
      events: [
        {
          id: 'event-upcoming',
          tenant_id: 'tenant-1',
          client_id: 'client-1',
          status: 'confirmed',
          event_date: '2026-05-20',
          occasion: 'Garden Dinner',
          guest_count: 8,
          quoted_price_cents: 120000,
          client: { id: 'client-1', full_name: 'Jordan Avery', email: 'jordan@example.com' },
          hub_group: null,
        },
        {
          id: 'event-past',
          tenant_id: 'tenant-1',
          client_id: 'client-1',
          status: 'completed',
          event_date: '2026-04-10',
          occasion: 'Spring Dinner',
          guest_count: 6,
          quoted_price_cents: 90000,
          client: { id: 'client-1', full_name: 'Jordan Avery', email: 'jordan@example.com' },
          hub_group: null,
        },
      ],
      quotes: [
        {
          id: 'quote-1',
          tenant_id: 'tenant-1',
          client_id: 'client-1',
          status: 'sent',
          quote_name: 'Summer Dinner Quote',
          total_quoted_cents: 150000,
          inquiry: {
            confirmed_occasion: 'Summer Dinner',
            confirmed_date: '2026-06-12',
            confirmed_guest_count: 10,
          },
          event: null,
        },
      ],
      inquiries: [
        {
          id: 'inquiry-1',
          tenant_id: 'tenant-1',
          client_id: 'client-1',
          status: 'awaiting_client',
          confirmed_occasion: 'Birthday Dinner',
          confirmed_date: '2026-06-18',
          confirmed_guest_count: 10,
          confirmed_location: 'Brooklyn',
          follow_up_due_at: '2026-05-02T12:00:00.000Z',
          next_action_required: 'Confirm the final menu choices.',
          first_contact_at: '2026-05-01T12:00:00.000Z',
          updated_at: '2026-05-01T12:00:00.000Z',
          converted_to_event_id: null,
        },
      ],
      client_meal_requests: [
        {
          id: 'meal-request-1',
          tenant_id: 'tenant-1',
          client_id: 'client-1',
          status: 'requested',
        },
      ],
      event_contracts: [
        {
          event_id: 'event-upcoming',
          signed_at: null,
          status: 'sent',
          created_at: '2026-05-01T10:00:00.000Z',
        },
      ],
      client_reviews: [],
      event_financial_summary: [
        {
          event_id: 'event-upcoming',
          outstanding_balance_cents: 30000,
        },
      ],
      event_rsvp_summary: [
        {
          event_id: 'event-upcoming',
          tenant_id: 'tenant-1',
          total_guests: 8,
          attending_count: 5,
          pending_count: 2,
        },
      ],
      event_shares: [
        {
          id: 'share-1',
          event_id: 'event-upcoming',
          tenant_id: 'tenant-1',
          created_by_client_id: 'client-1',
          is_active: true,
        },
      ],
    })

    try {
      const snapshot = await mod.getSharedClientWorkGraphSnapshot(
        {
          tenantId: 'tenant-1',
          clientId: 'client-1',
          pastLimit: 5,
        },
        {
          db,
          getPendingGuestCountChangeMap: async () =>
            new Map([
              [
                'event-upcoming',
                {
                  id: 'change-1',
                  event_id: 'event-upcoming',
                  tenant_id: 'tenant-1',
                  previous_count: 8,
                  new_count: 10,
                  requested_by: 'client-1',
                  requested_by_role: 'client',
                  status: 'pending',
                  price_impact_cents: null,
                  surcharge_applied: false,
                  surcharge_cents: 0,
                  acknowledged_by_client: false,
                  acknowledged_at: null,
                  applied: false,
                  applied_at: null,
                  notes: null,
                  review_notes: null,
                  reviewed_by: null,
                  reviewed_at: null,
                  created_at: '2026-05-02T08:00:00.000Z',
                },
              ],
            ]),
        }
      )

      assert.ok(snapshot)
      assert.equal(snapshot?.eventsResult.upcoming.length, 1)
      assert.equal(snapshot?.eventsResult.past.length, 1)
      assert.equal(snapshot?.profileSummary.completionPercent, 67)
      assert.equal(snapshot?.profileSummary.pendingMealRequests, 1)
      assert.equal(snapshot?.profileSummary.signalNotificationsEnabled, false)
      assert.equal(snapshot?.eventsResult.upcoming[0]?.hasContract, true)
      assert.equal(snapshot?.eventsResult.upcoming[0]?.hasOutstandingBalance, true)
      assert.equal(snapshot?.eventsResult.upcoming[0]?.pendingGuestCountChange?.newCount, 10)
      assert.deepEqual(snapshot?.rsvpSummary, {
        eventId: 'event-upcoming',
        occasion: 'Garden Dinner',
        totalGuests: 8,
        attendingCount: 5,
        pendingCount: 2,
        hasActiveShare: true,
      })
      assert.equal(snapshot?.unreviewedEvent?.id, 'event-past')

      assert.deepEqual(
        mod.buildClientActionRequiredSummary({
          proposalCount: 1,
          paymentDueCount: 0,
          outstandingBalanceCount: 1,
          quotePendingCount: 1,
          inquiryAwaitingCount: 1,
          friendRequestCount: 1,
          totalItems: 5,
        }),
        {
          proposalCount: 1,
          paymentDueCount: 0,
          outstandingBalanceCount: 1,
          quotePendingCount: 1,
          inquiryAwaitingCount: 1,
          friendRequestCount: 1,
          totalItems: 5,
        }
      )
    } finally {
      restore()
    }
  })

  it('returns null when the client is outside the tenant scope', async () => {
    const { mod, restore } = loadSharedSnapshotModule()
    const db = createDb({
      clients: [],
    })

    try {
      const snapshot = await mod.getSharedClientWorkGraphSnapshot(
        {
          tenantId: 'tenant-1',
          clientId: 'missing-client',
          pastLimit: 5,
        },
        {
          db,
          getPendingGuestCountChangeMap: async () => new Map(),
        }
      )

      assert.equal(snapshot, null)
    } finally {
      restore()
    }
  })
})
