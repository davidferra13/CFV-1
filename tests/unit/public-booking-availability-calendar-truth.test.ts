import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type Filter =
  | { type: 'eq'; column: string; value: unknown }
  | { type: 'in'; column: string; value: unknown[] }
  | { type: 'gte'; column: string; value: unknown }
  | { type: 'lte'; column: string; value: unknown }

type Fixtures = {
  chefs: Array<Record<string, unknown>>
  events: Array<Record<string, unknown>>
  blocks: Array<Record<string, unknown>>
}

class QueryBuilder implements PromiseLike<{ data: any; error: null }> {
  private readonly filters: Filter[] = []

  constructor(
    private readonly table: string,
    private readonly fixtures: Fixtures
  ) {}

  select(_columns?: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ type: 'in', column, value })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ type: 'gte', column, value })
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push({ type: 'lte', column, value })
    return this
  }

  single() {
    const rows = this.executeRows()
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.executeRows(), error: null }).then(onfulfilled, onrejected)
  }

  private executeRows() {
    const rows =
      this.table === 'chefs'
        ? this.fixtures.chefs
        : this.table === 'events'
          ? this.fixtures.events
          : this.table === 'chef_availability_blocks'
            ? this.fixtures.blocks
            : []

    return rows.filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column]
        if (filter.type === 'eq') return value === filter.value
        if (filter.type === 'in') return filter.value.includes(value)
        if (filter.type === 'gte') return String(value ?? '') >= String(filter.value ?? '')
        return String(value ?? '') <= String(filter.value ?? '')
      })
    )
  }
}

function buildCalendarTruth(override?: Partial<any>) {
  const overrideConnection = override?.connection ?? {}
  return {
    connection: {
      connected: true,
      email: 'chef@example.com',
      lastSync: '2026-05-01T12:00:00.000Z',
      checkedAt: '2026-05-02T12:00:00.000Z',
      health: 'ok',
      healthDetail: 'Live Google Calendar verification succeeded across 1 calendar.',
      busyRangeCount: 1,
      conflictCount: 0,
      calendarCount: 1,
      ...overrideConnection,
    },
    externalBusy: [],
    busyDates: [],
    ...(override?.externalBusy ? { externalBusy: override.externalBusy } : {}),
    ...(override?.busyDates ? { busyDates: override.busyDates } : {}),
  }
}

function loadAvailabilityRoute(fixtures: Fixtures, calendarTruth: any) {
  const dbServerPath = require.resolve('../../lib/db/server.ts')
  const calendarSyncPath = require.resolve('../../lib/scheduling/calendar-sync.ts')
  const routePath = require.resolve('../../app/book/[chefSlug]/availability/route.ts')

  const originalDbServer = require.cache[dbServerPath] ?? null
  const originalCalendarSync = require.cache[calendarSyncPath] ?? null

  require.cache[dbServerPath] = {
    id: dbServerPath,
    filename: dbServerPath,
    loaded: true,
    exports: {
      createServerClient: () => ({
        from(table: string) {
          return new QueryBuilder(table, fixtures)
        },
      }),
    },
  } as any

  require.cache[calendarSyncPath] = {
    id: calendarSyncPath,
    filename: calendarSyncPath,
    loaded: true,
    exports: {
      getGoogleCalendarTruthForRange: async () => calendarTruth,
    },
  } as any

  delete require.cache[routePath]
  const mod = require(routePath)

  const restore = () => {
    if (originalDbServer) require.cache[dbServerPath] = originalDbServer
    else delete require.cache[dbServerPath]

    if (originalCalendarSync) require.cache[calendarSyncPath] = originalCalendarSync
    else delete require.cache[calendarSyncPath]

    delete require.cache[routePath]
  }

  return { mod, restore }
}

test('public booking availability blocks dates that are only busy in Google Calendar', async () => {
  const fixtures: Fixtures = {
    chefs: [
      {
        id: 'chef-1',
        booking_slug: 'chef-one',
        booking_enabled: true,
        booking_min_notice_days: 0,
      },
    ],
    events: [],
    blocks: [],
  }

  const { mod, restore } = loadAvailabilityRoute(
    fixtures,
    buildCalendarTruth({ busyDates: ['2026-06-12'] })
  )

  try {
    const response = await mod.GET(
      {
        nextUrl: new URL(
          'http://localhost/book/chef-one/availability?start_date=2026-06-12&end_date=2026-06-12'
        ),
      },
      { params: { chefSlug: 'chef-one' } }
    )
    const payload = await response.json()

    assert.equal(response.status, 200)
    assert.equal(payload.availability['2026-06-12'], 'blocked')
    assert.deepEqual(payload.conflict_details['2026-06-12'], [
      'Google Calendar already marked busy',
    ])
    assert.equal(payload.calendar_truth.mode, 'verified_external')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  } finally {
    restore()
  }
})

test('public booking availability holds dates when Google Calendar truth is degraded', async () => {
  const fixtures: Fixtures = {
    chefs: [
      {
        id: 'chef-1',
        booking_slug: 'chef-one',
        booking_enabled: true,
        booking_min_notice_days: 0,
      },
    ],
    events: [],
    blocks: [],
  }

  const { mod, restore } = loadAvailabilityRoute(
    fixtures,
    buildCalendarTruth({
      connection: {
        health: 'error',
        healthDetail: 'Google Calendar connection expired.',
      },
    })
  )

  try {
    const response = await mod.GET(
      {
        nextUrl: new URL(
          'http://localhost/book/chef-one/availability?start_date=2026-06-13&end_date=2026-06-13'
        ),
      },
      { params: { chefSlug: 'chef-one' } }
    )
    const payload = await response.json()

    assert.equal(response.status, 200)
    assert.equal(payload.availability['2026-06-13'], 'unavailable')
    assert.deepEqual(payload.conflict_details['2026-06-13'], [
      'Live Google Calendar verification is temporarily unavailable',
    ])
    assert.equal(payload.calendar_truth.mode, 'degraded')
    assert.equal(
      payload.calendar_truth.message,
      'Live Google Calendar verification is temporarily unavailable, so new dates are held to avoid false availability.'
    )
  } finally {
    restore()
  }
})
