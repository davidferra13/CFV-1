import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDailyReport } from '@/lib/reports/compute-daily-report'

type Filter = { op: string; column?: string; value?: unknown }

type QueryState = {
  table: string
  selection: string
  selectOpts?: { count?: string; head?: boolean }
  filters: Filter[]
  limitValue?: number
}

type QueryResult = {
  data?: any[]
  count?: number | null
}

type Resolver = (query: QueryState) => Promise<QueryResult> | QueryResult

class MockQueryBuilder implements PromiseLike<QueryResult> {
  private query: QueryState
  private resolver: Resolver

  constructor(table: string, resolver: Resolver) {
    this.query = { table, selection: '', filters: [] }
    this.resolver = resolver
  }

  select(selection: string, opts?: { count?: string; head?: boolean }) {
    this.query.selection = selection
    this.query.selectOpts = opts
    return this
  }

  eq(column: string, value: unknown) {
    this.query.filters.push({ op: 'eq', column, value })
    return this
  }

  gt(column: string, value: unknown) {
    this.query.filters.push({ op: 'gt', column, value })
    return this
  }

  gte(column: string, value: unknown) {
    this.query.filters.push({ op: 'gte', column, value })
    return this
  }

  lt(column: string, value: unknown) {
    this.query.filters.push({ op: 'lt', column, value })
    return this
  }

  lte(column: string, value: unknown) {
    this.query.filters.push({ op: 'lte', column, value })
    return this
  }

  not(column: string, value: unknown, extra?: unknown) {
    this.query.filters.push({ op: 'not', column, value: [value, extra] })
    return this
  }

  in(column: string, value: unknown[]) {
    this.query.filters.push({ op: 'in', column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.query.filters.push({ op: 'is', column, value })
    return this
  }

  or(value: string) {
    this.query.filters.push({ op: 'or', value })
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.query.filters.push({ op: 'order', column, value: opts?.ascending ?? true })
    return this
  }

  limit(value: number) {
    this.query.limitValue = value
    return this
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.resolver(this.query))
      .then(onfulfilled, onrejected)
  }
}

function getFilter(query: QueryState, op: string, column: string): unknown {
  return query.filters.find((f) => f.op === op && f.column === column)?.value
}

function hasFilter(query: QueryState, op: string, column: string): boolean {
  return query.filters.some((f) => f.op === op && f.column === column)
}

function createMockSupabase(resolver: Resolver) {
  return {
    from(table: string) {
      return new MockQueryBuilder(table, resolver)
    },
  } as any
}

function standardResolver(query: QueryState): QueryResult {
  if (query.table === 'events' && query.selection.includes('serve_time')) {
    return {
      data: [
        {
          id: 'evt-1',
          occasion: 'Birthday Dinner',
          serve_time: '18:30:00',
          guest_count: 8,
          status: 'confirmed',
          client: { full_name: 'Alex Rivera' },
        },
        {
          id: 'evt-2',
          occasion: 'Anniversary',
          serve_time: '20:00:00',
          guest_count: 2,
          status: 'paid',
          client: { full_name: 'Morgan Lee' },
        },
      ],
    }
  }

  if (query.table === 'events' && query.selection === 'id' && query.selectOpts?.head) {
    const statusEq = getFilter(query, 'eq', 'status')
    return { count: statusEq === 'completed' ? 2 : 4 }
  }

  if (query.table === 'events' && query.selection === 'event_date') {
    const clientId = getFilter(query, 'eq', 'client_id') as string | undefined
    if (clientId) {
      if (clientId === 'client-1') return { data: [{ event_date: '2025-11-01' }] }
      return { data: [{ event_date: '2026-03-01' }] }
    }
    return {
      data: [
        { event_date: '2026-03-12' },
        { event_date: '2026-03-12' },
        { event_date: '2026-03-15' },
      ],
    }
  }

  if (query.table === 'events' && query.selection.includes('aar_filed')) {
    return {
      data: [
        {
          event_date: '2026-03-09',
          aar_filed: true,
          reset_complete: true,
          follow_up_sent: true,
          financially_closed: true,
        },
        {
          event_date: '2026-03-08',
          aar_filed: true,
          reset_complete: true,
          follow_up_sent: true,
          financially_closed: true,
        },
        {
          event_date: '2026-03-07',
          aar_filed: false,
          reset_complete: true,
          follow_up_sent: true,
          financially_closed: true,
        },
      ],
    }
  }

  if (query.table === 'inquiries' && query.selection === 'status') {
    return {
      data: [{ status: 'new' }, { status: 'awaiting_client' }, { status: 'awaiting_client' }],
    }
  }

  if (query.table === 'inquiries' && query.selection === 'created_at, first_response_at') {
    return {
      data: [
        { created_at: '2026-03-08T10:00:00.000Z', first_response_at: '2026-03-08T12:00:00.000Z' },
        { created_at: '2026-03-08T12:00:00.000Z', first_response_at: '2026-03-08T18:00:00.000Z' },
      ],
    }
  }

  if (query.table === 'inquiries' && query.selection === 'id' && query.selectOpts?.head) {
    if (hasFilter(query, 'is', 'first_response_at')) return { count: 1 }
    if (hasFilter(query, 'gte', 'created_at') && hasFilter(query, 'lte', 'created_at'))
      return { count: 2 }
    return { count: 3 }
  }

  if (query.table === 'inquiries' && query.selection.includes('confirmed_occasion')) {
    return {
      data: [
        {
          id: 'inq-1',
          status: 'new',
          confirmed_occasion: 'Birthday',
          client: { id: 'client-1', full_name: 'Alex Rivera' },
        },
        {
          id: 'inq-2',
          status: 'awaiting_chef',
          confirmed_occasion: 'Anniversary',
          client: { id: 'client-2', full_name: 'Morgan Lee' },
        },
      ],
    }
  }

  if (query.table === 'quotes' && query.selection.includes('inquiry:inquiries')) {
    return {
      data: [
        {
          id: 'q-1',
          valid_until: '2026-03-12',
          total_quoted_cents: 120000,
          inquiry: { client: { full_name: 'Alex Rivera' } },
        },
        {
          id: 'q-2',
          valid_until: '2026-03-15',
          total_quoted_cents: 90000,
          inquiry: { client: { full_name: 'Morgan Lee' } },
        },
      ],
    }
  }

  if (query.table === 'quotes' && query.selection === 'total_quoted_cents, status') {
    return {
      data: [
        { total_quoted_cents: 100000, status: 'sent' },
        { total_quoted_cents: 200000, status: 'draft' },
      ],
    }
  }

  if (query.table === 'ledger_entries' && query.selection === 'amount_cents, is_refund') {
    const createdAtStart = String(getFilter(query, 'gte', 'created_at') ?? '')
    if (createdAtStart.startsWith('2026-03-10')) {
      return {
        data: [
          { amount_cents: 2000, is_refund: false },
          { amount_cents: 500, is_refund: true },
        ],
      }
    }
    if (createdAtStart.startsWith('2026-03-01')) {
      return {
        data: [
          { amount_cents: 10000, is_refund: false },
          { amount_cents: 2000, is_refund: true },
        ],
      }
    }
    if (createdAtStart.startsWith('2026-02-01')) {
      return { data: [{ amount_cents: 5000, is_refund: false }] }
    }
    return { data: [] }
  }

  if (
    query.table === 'event_financial_summary' &&
    query.selection === 'outstanding_balance_cents'
  ) {
    return { data: [{ outstanding_balance_cents: 3000 }, { outstanding_balance_cents: 2000 }] }
  }

  if (query.table === 'event_financial_summary' && query.selection === 'food_cost_percentage') {
    return {
      data: [
        { food_cost_percentage: 40 },
        { food_cost_percentage: 30 },
        { food_cost_percentage: 20 },
        { food_cost_percentage: 10 },
      ],
    }
  }

  if (query.table === 'activity_events') {
    return {
      data: [
        {
          client_id: 'client-1',
          event_type: 'payment_page_visited',
          created_at: '2026-03-09T17:00:00.000Z',
          metadata: {},
        },
        {
          client_id: 'client-2',
          event_type: 'portal_login',
          created_at: '2026-03-09T16:00:00.000Z',
          metadata: {},
        },
        {
          client_id: 'client-3',
          event_type: 'proposal_viewed',
          created_at: '2026-03-09T15:00:00.000Z',
          metadata: {},
        },
        {
          client_id: 'client-1',
          event_type: 'quote_viewed',
          created_at: '2026-03-09T14:00:00.000Z',
          metadata: {},
        },
      ],
    }
  }

  if (query.table === 'clients' && query.selection === 'id, full_name, birthday, anniversary') {
    return {
      data: [
        { id: 'client-1', full_name: 'Alex Rivera', birthday: '1990-03-12', anniversary: null },
        { id: 'client-2', full_name: 'Morgan Lee', birthday: null, anniversary: '2010-03-24' },
        { id: 'client-3', full_name: 'Casey Stone', birthday: '1990-04-30', anniversary: null },
      ],
    }
  }

  if (
    query.table === 'clients' &&
    query.selection === 'id, full_name' &&
    getFilter(query, 'eq', 'status') === 'active'
  ) {
    return {
      data: [
        { id: 'client-1', full_name: 'Alex Rivera' },
        { id: 'client-2', full_name: 'Morgan Lee' },
      ],
    }
  }

  if (query.table === 'clients' && query.selection === 'id, full_name') {
    return {
      data: [
        { id: 'client-1', full_name: 'Alex Rivera' },
        { id: 'client-2', full_name: 'Morgan Lee' },
        { id: 'client-3', full_name: 'Casey Stone' },
      ],
    }
  }

  return { data: [], count: 0 }
}

test('computeDailyReport aggregates core metrics and mappings', async () => {
  const supabase = createMockSupabase(standardResolver)
  const report = await computeDailyReport(supabase, 'tenant-1', '2026-03-10')

  assert.equal(report.eventsToday.length, 2)
  assert.equal(report.eventsToday[0].clientName, 'Alex Rivera')
  assert.equal(report.upcomingEventsNext7d, 4)
  assert.equal(report.newInquiriesToday, 2)
  assert.equal(report.quotesExpiringSoon, 2)
  assert.equal(report.expiringQuoteDetails[0].amountCents, 120000)
  assert.equal(report.staleFollowUps, 3)
  assert.equal(report.paymentsReceivedTodayCents, 1500)
  assert.equal(report.monthRevenueToDateCents, 8000)
  assert.equal(report.monthOverMonthChangePercent, 60)
  assert.equal(report.outstandingBalanceCents, 5000)
  assert.equal(report.pipelineForecastCents, 70000)
  assert.equal(report.clientLoginsYesterday, 1)
  assert.equal(report.highIntentVisits.length, 3)
  assert.equal(report.nextBestActions.length, 2)
})

test('computeDailyReport computes trends, streaks, and schedule conflicts', async () => {
  const supabase = createMockSupabase(standardResolver)
  const report = await computeDailyReport(supabase, 'tenant-1', '2026-03-10')

  assert.equal(report.avgResponseTimeHours, 4)
  assert.equal(report.overdueResponses, 1)
  assert.equal(report.foodCostAvgPercent, 25)
  assert.equal(report.foodCostTrending, 'rising')
  assert.equal(report.closureStreak, 2)
  assert.equal(report.longestStreak, 2)
  assert.deepEqual(report.scheduleConflicts, [{ date: '2026-03-12', eventCount: 2 }])
})

test('computeDailyReport computes milestones and dormant clients', async () => {
  const supabase = createMockSupabase(standardResolver)
  const report = await computeDailyReport(supabase, 'tenant-1', '2026-03-10')

  assert.equal(report.upcomingMilestones.length, 2)
  assert.equal(report.upcomingMilestones[0].clientName, 'Alex Rivera')
  assert.equal(report.upcomingMilestones[0].daysUntil, 2)
  assert.equal(report.upcomingMilestones[1].daysUntil, 14)
  assert.equal(report.dormantClients.length, 1)
  assert.equal(report.dormantClients[0].clientId, 'client-1')
  assert.ok(report.dormantClients[0].daysSinceLastEvent >= 90)
})

test('computeDailyReport safe wrapper falls back when stale inquiry query fails', async () => {
  const supabase = createMockSupabase((query) => {
    const isStaleInquiriesCountQuery =
      query.table === 'inquiries' &&
      query.selection === 'id' &&
      query.selectOpts?.head &&
      Array.isArray(getFilter(query, 'in', 'status')) &&
      !hasFilter(query, 'is', 'first_response_at') &&
      !hasFilter(query, 'gte', 'created_at')
    if (isStaleInquiriesCountQuery) {
      throw new Error('simulated stale inquiry fetch failure')
    }
    return standardResolver(query)
  })

  const report = await computeDailyReport(supabase, 'tenant-1', '2026-03-10')
  assert.equal(report.staleFollowUps, 0)
  assert.equal(report.eventsToday.length, 2)
})

test('computeDailyReport sets MoM change to 0 when previous month revenue is zero', async () => {
  const supabase = createMockSupabase((query) => {
    if (query.table === 'ledger_entries' && query.selection === 'amount_cents, is_refund') {
      const createdAtStart = String(getFilter(query, 'gte', 'created_at') ?? '')
      if (createdAtStart.startsWith('2026-03-01')) {
        return { data: [{ amount_cents: 10000, is_refund: false }] }
      }
      if (createdAtStart.startsWith('2026-02-01')) {
        return { data: [] }
      }
    }
    return standardResolver(query)
  })

  const report = await computeDailyReport(supabase, 'tenant-1', '2026-03-10')
  assert.equal(report.monthRevenueToDateCents, 10000)
  assert.equal(report.monthOverMonthChangePercent, 0)
})
