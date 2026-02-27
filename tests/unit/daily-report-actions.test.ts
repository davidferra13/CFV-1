import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type DailyReportRow = {
  id: string
  tenant_id: string
  report_date: string
  content: Record<string, unknown>
  email_sent_at: string | null
  created_at: string
}

type ActionsMockConfig = {
  upsertResponse?: { data: DailyReportRow | null; error: unknown }
  maybeSingleResponse?: { data: DailyReportRow | null; error: unknown }
  historyResponse?: {
    data: Array<{ report_date: string; content: Record<string, unknown> }>
    error: unknown
  }
}

type ActionsTracker = {
  createServerClientArgs: Array<{ admin?: boolean } | undefined>
  upserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> | undefined }>
  limits: number[]
}

class DailyReportsQueryBuilder implements PromiseLike<{ data: any; error: unknown }> {
  private config: ActionsMockConfig
  private tracker: ActionsTracker

  constructor(config: ActionsMockConfig, tracker: ActionsTracker) {
    this.config = config
    this.tracker = tracker
  }

  select() {
    return this
  }

  eq() {
    return this
  }

  order() {
    return this
  }

  limit(value: number) {
    this.tracker.limits.push(value)
    return this
  }

  upsert(payload: Record<string, unknown>, options?: Record<string, unknown>) {
    this.tracker.upserts.push({ payload, options })
    return this
  }

  single() {
    return Promise.resolve(this.config.upsertResponse ?? { data: null, error: null })
  }

  maybeSingle() {
    return Promise.resolve(this.config.maybeSingleResponse ?? { data: null, error: null })
  }

  then<TResult1 = { data: any; error: unknown }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: unknown }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.config.historyResponse ?? { data: [], error: null }).then(
      onfulfilled,
      onrejected
    )
  }
}

function createMockSupabase(config: ActionsMockConfig, tracker: ActionsTracker) {
  return {
    from(table: string) {
      if (table !== 'daily_reports') throw new Error(`Unexpected table: ${table}`)
      return new DailyReportsQueryBuilder(config, tracker)
    },
  }
}

function loadDailyReportActionsWithMocks(input: {
  requireChef: () => Promise<{ tenantId: string }>
  computeDailyReport: () => Promise<Record<string, unknown>>
  createServerClient: (opts?: { admin?: boolean }) => unknown
}) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const computePath = require.resolve('../../lib/reports/compute-daily-report.ts')
  const actionsPath = require.resolve('../../lib/reports/daily-report-actions.ts')

  require(authPath)
  require(supabasePath)
  require(computePath)

  const originalAuthExports = require.cache[authPath]!.exports
  const originalSupabaseExports = require.cache[supabasePath]!.exports
  const originalComputeExports = require.cache[computePath]!.exports

  require.cache[authPath]!.exports = { requireChef: input.requireChef }
  require.cache[supabasePath]!.exports = { createServerClient: input.createServerClient }
  require.cache[computePath]!.exports = { computeDailyReport: input.computeDailyReport }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuthExports
    require.cache[supabasePath]!.exports = originalSupabaseExports
    require.cache[computePath]!.exports = originalComputeExports
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('generateDailyReport upserts computed content and maps response', async () => {
  const tracker: ActionsTracker = { createServerClientArgs: [], upserts: [], limits: [] }
  const content = {
    eventsToday: [{ eventId: 'evt-1' }],
    paymentsReceivedTodayCents: 1500,
    newInquiriesToday: 2,
  }
  const config: ActionsMockConfig = {
    upsertResponse: {
      data: {
        id: 'dr-1',
        tenant_id: 'tenant-1',
        report_date: '2026-03-10',
        content,
        email_sent_at: null,
        created_at: '2026-03-10T07:00:00.000Z',
      },
      error: null,
    },
  }

  const supabase = createMockSupabase(config, tracker)
  const { actions, restore } = loadDailyReportActionsWithMocks({
    requireChef: async () => ({ tenantId: 'tenant-1' }),
    computeDailyReport: async () => content,
    createServerClient: (opts?: { admin?: boolean }) => {
      tracker.createServerClientArgs.push(opts)
      return supabase
    },
  })

  try {
    const report = await actions.generateDailyReport('2026-03-10')

    assert.equal(report.id, 'dr-1')
    assert.equal(report.tenantId, 'tenant-1')
    assert.equal(report.reportDate, '2026-03-10')
    assert.equal(report.content.paymentsReceivedTodayCents, 1500)
    assert.equal(tracker.upserts.length, 1)
    assert.equal(tracker.upserts[0].payload.tenant_id, 'tenant-1')
    assert.equal(tracker.upserts[0].payload.report_date, '2026-03-10')
    assert.deepEqual(tracker.upserts[0].options, { onConflict: 'tenant_id,report_date' })
    assert.deepEqual(tracker.createServerClientArgs[0], { admin: true })
  } finally {
    restore()
  }
})

test('generateDailyReport throws when upsert fails', async () => {
  const tracker: ActionsTracker = { createServerClientArgs: [], upserts: [], limits: [] }
  const config: ActionsMockConfig = {
    upsertResponse: {
      data: null,
      error: { message: 'write failed' },
    },
  }

  const supabase = createMockSupabase(config, tracker)
  const { actions, restore } = loadDailyReportActionsWithMocks({
    requireChef: async () => ({ tenantId: 'tenant-1' }),
    computeDailyReport: async () => ({ eventsToday: [] }),
    createServerClient: (opts?: { admin?: boolean }) => {
      tracker.createServerClientArgs.push(opts)
      return supabase
    },
  })

  try {
    await assert.rejects(
      async () => actions.generateDailyReport('2026-03-10'),
      /Failed to generate daily report/
    )
  } finally {
    restore()
  }
})

test('getDailyReport returns mapped row when present', async () => {
  const tracker: ActionsTracker = { createServerClientArgs: [], upserts: [], limits: [] }
  const config: ActionsMockConfig = {
    maybeSingleResponse: {
      data: {
        id: 'dr-2',
        tenant_id: 'tenant-1',
        report_date: '2026-03-09',
        content: { eventsToday: [{ eventId: 'evt-9' }], paymentsReceivedTodayCents: 900 },
        email_sent_at: '2026-03-09T12:00:00.000Z',
        created_at: '2026-03-09T07:00:00.000Z',
      },
      error: null,
    },
  }

  const supabase = createMockSupabase(config, tracker)
  const { actions, restore } = loadDailyReportActionsWithMocks({
    requireChef: async () => ({ tenantId: 'tenant-1' }),
    computeDailyReport: async () => ({}),
    createServerClient: (opts?: { admin?: boolean }) => {
      tracker.createServerClientArgs.push(opts)
      return supabase
    },
  })

  try {
    const report = await actions.getDailyReport('2026-03-09')
    assert.ok(report)
    assert.equal(report.id, 'dr-2')
    assert.equal(report.tenantId, 'tenant-1')
    assert.equal(report.content.paymentsReceivedTodayCents, 900)
    assert.equal(tracker.createServerClientArgs[0], undefined)
  } finally {
    restore()
  }
})

test('getDailyReport returns null when query errors', async () => {
  const tracker: ActionsTracker = { createServerClientArgs: [], upserts: [], limits: [] }
  const config: ActionsMockConfig = {
    maybeSingleResponse: {
      data: null,
      error: { message: 'query failed' },
    },
  }

  const supabase = createMockSupabase(config, tracker)
  const { actions, restore } = loadDailyReportActionsWithMocks({
    requireChef: async () => ({ tenantId: 'tenant-1' }),
    computeDailyReport: async () => ({}),
    createServerClient: () => supabase,
  })

  try {
    const report = await actions.getDailyReport('2026-03-09')
    assert.equal(report, null)
  } finally {
    restore()
  }
})

test('getDailyReportHistory maps summaries and applies requested limit', async () => {
  const tracker: ActionsTracker = { createServerClientArgs: [], upserts: [], limits: [] }
  const config: ActionsMockConfig = {
    historyResponse: {
      data: [
        {
          report_date: '2026-03-10',
          content: {
            eventsToday: [{ eventId: 'evt-1' }, { eventId: 'evt-2' }],
            paymentsReceivedTodayCents: 1700,
            newInquiriesToday: 3,
          },
        },
        {
          report_date: '2026-03-09',
          content: {
            eventsToday: [],
            paymentsReceivedTodayCents: 0,
            newInquiriesToday: 1,
          },
        },
      ],
      error: null,
    },
  }

  const supabase = createMockSupabase(config, tracker)
  const { actions, restore } = loadDailyReportActionsWithMocks({
    requireChef: async () => ({ tenantId: 'tenant-1' }),
    computeDailyReport: async () => ({}),
    createServerClient: () => supabase,
  })

  try {
    const rows = await actions.getDailyReportHistory(2)
    assert.equal(rows.length, 2)
    assert.deepEqual(rows[0], {
      reportDate: '2026-03-10',
      eventsCount: 2,
      revenueCents: 1700,
      newInquiries: 3,
    })
    assert.equal(rows[1].eventsCount, 0)
    assert.deepEqual(tracker.limits, [2])
  } finally {
    restore()
  }
})
