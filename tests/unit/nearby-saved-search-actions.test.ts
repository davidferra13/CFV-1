import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const WAITLIST_ACTIONS_PATH = require.resolve('../../lib/directory/waitlist-actions.ts')
const HEADERS_PATH = require.resolve('next/headers')
const RATE_LIMIT_PATH = require.resolve('../../lib/rateLimit.ts')
const DB_ADMIN_PATH = require.resolve('../../lib/db/admin.ts')

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

type Scenario = {
  existingSavedSearch?: { id: string } | null
  insertError?: any
  updateError?: any
  preferenceError?: any
}

class WaitlistQueryBuilder {
  private mode: 'select' | 'insert' | 'update' | 'upsert' = 'select'
  private filters: Array<[string, unknown]> = []
  private payload: any = null

  constructor(
    private readonly table: string,
    private readonly scenario: Scenario,
    private readonly calls: {
      inserts: Array<{ table: string; payload: any }>
      updates: Array<{ table: string; payload: any; filters: Array<[string, unknown]> }>
      upserts: Array<{ table: string; payload: any; options?: any }>
      selects: Array<{ table: string; filters: Array<[string, unknown]> }>
    }
  ) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  async maybeSingle() {
    this.calls.selects.push({ table: this.table, filters: [...this.filters] })
    if (this.table === 'directory_waitlist') {
      return { data: this.scenario.existingSavedSearch ?? null, error: null }
    }
    return { data: null, error: null }
  }

  insert(payload: any) {
    this.mode = 'insert'
    this.payload = payload
    this.calls.inserts.push({ table: this.table, payload })
    return this
  }

  update(payload: any) {
    this.mode = 'update'
    this.payload = payload
    return this
  }

  upsert(payload: any, options?: any) {
    this.mode = 'upsert'
    this.payload = payload
    this.calls.upserts.push({ table: this.table, payload, options })
    return this
  }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    let response: any = { data: null, error: null }

    if (this.mode === 'insert') {
      response.error = this.scenario.insertError ?? null
    } else if (this.mode === 'update') {
      this.calls.updates.push({
        table: this.table,
        payload: this.payload,
        filters: [...this.filters],
      })
      response.error = this.scenario.updateError ?? null
    } else if (this.mode === 'upsert' && this.table === 'directory_email_preferences') {
      response.error = this.scenario.preferenceError ?? null
    }

    return Promise.resolve(response).then(resolve, reject)
  }
}

function createDbMock(scenario: Scenario = {}) {
  const calls = {
    inserts: [] as Array<{ table: string; payload: any }>,
    updates: [] as Array<{ table: string; payload: any; filters: Array<[string, unknown]> }>,
    upserts: [] as Array<{ table: string; payload: any; options?: any }>,
    selects: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
  }

  return {
    db: {
      from(table: string) {
        return new WaitlistQueryBuilder(table, scenario, calls)
      },
    },
    calls,
  }
}

function loadWaitlistActions(options: {
  headersImpl?: () => Promise<Headers>
  checkRateLimitImpl?: (key: string, max: number, windowMs: number) => Promise<void>
  db: any
}) {
  const originals = {
    actions: require.cache[WAITLIST_ACTIONS_PATH],
    headers: require.cache[HEADERS_PATH],
    rateLimit: require.cache[RATE_LIMIT_PATH],
    dbAdmin: require.cache[DB_ADMIN_PATH],
  }

  require.cache[HEADERS_PATH] = {
    id: HEADERS_PATH,
    filename: HEADERS_PATH,
    loaded: true,
    exports: {
      headers: options.headersImpl || (async () => new Headers()),
    },
  } as NodeJS.Module

  require.cache[RATE_LIMIT_PATH] = {
    id: RATE_LIMIT_PATH,
    filename: RATE_LIMIT_PATH,
    loaded: true,
    exports: {
      checkRateLimit:
        options.checkRateLimitImpl ||
        (async () => {
          return
        }),
    },
  } as NodeJS.Module

  require.cache[DB_ADMIN_PATH] = {
    id: DB_ADMIN_PATH,
    filename: DB_ADMIN_PATH,
    loaded: true,
    exports: {
      createAdminClient: () => options.db,
    },
  } as NodeJS.Module

  delete require.cache[WAITLIST_ACTIONS_PATH]
  const mod = require(WAITLIST_ACTIONS_PATH)

  const restore = () => {
    restoreModule(WAITLIST_ACTIONS_PATH, originals.actions)
    restoreModule(HEADERS_PATH, originals.headers)
    restoreModule(RATE_LIMIT_PATH, originals.rateLimit)
    restoreModule(DB_ADMIN_PATH, originals.dbAdmin)
  }

  return { mod, restore }
}

test('saveNearbySavedSearchAlert stores the current nearby filter state and refreshes email preferences', async () => {
  const { db, calls } = createDbMock()
  const rateLimitCalls: string[] = []
  const { mod, restore } = loadWaitlistActions({
    db,
    headersImpl: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    checkRateLimitImpl: async (key) => {
      rateLimitCalls.push(key)
    },
  })

  try {
    const result = await mod.saveNearbySavedSearchAlert({
      email: 'Taylor@example.com',
      city: 'Boston',
      state: 'massachusetts',
      businessType: 'private_chef',
      cuisine: 'french',
      searchQuery: 'tasting menu',
      locationQuery: '02116',
      locationLabel: '02116 - Boston, MA',
      radiusMiles: 15,
      userLat: 42.361145,
      userLon: -71.057083,
      currentMatchCount: 2,
      source: mod.NEARBY_NO_RESULTS_WAITLIST_SOURCE,
    })

    assert.equal(result.success, true)
    assert.match(result.summaryLabel, /Private Chef/)
    assert.deepEqual(rateLimitCalls, [
      'nearby-alert:ip:203.0.113.9',
      'nearby-alert:email:taylor@example.com',
    ])

    assert.equal(calls.selects.length, 1)
    assert.deepEqual(calls.selects[0].filters, [
      ['email', 'taylor@example.com'],
      ['saved_search_key', calls.inserts[0].payload.saved_search_key],
    ])

    assert.equal(calls.inserts.length, 1)
    assert.equal(calls.inserts[0].table, 'directory_waitlist')
    assert.equal(calls.inserts[0].payload.email, 'taylor@example.com')
    assert.equal(calls.inserts[0].payload.city, 'Boston')
    assert.equal(calls.inserts[0].payload.state, 'MA')
    assert.equal(calls.inserts[0].payload.business_type, 'private_chef')
    assert.equal(calls.inserts[0].payload.cuisine, 'french')
    assert.equal(calls.inserts[0].payload.search_query, 'tasting menu')
    assert.equal(calls.inserts[0].payload.location_query, '02116')
    assert.equal(calls.inserts[0].payload.radius_miles, 15)
    assert.equal(calls.inserts[0].payload.user_lat, 42.361)
    assert.equal(calls.inserts[0].payload.user_lon, -71.057)
    assert.equal(calls.inserts[0].payload.baseline_match_count, 2)
    assert.equal(calls.inserts[0].payload.filter_snapshot.locationQuery, '02116')

    assert.equal(calls.upserts.length, 1)
    assert.equal(calls.upserts[0].table, 'directory_email_preferences')
    assert.deepEqual(calls.upserts[0].payload, {
      email: 'taylor@example.com',
      opted_out: false,
      opted_out_at: null,
      opt_out_reason: null,
    })
  } finally {
    restore()
  }
})

test('saveNearbySavedSearchAlert updates an existing saved search instead of inserting a duplicate', async () => {
  const { db, calls } = createDbMock({ existingSavedSearch: { id: 'saved-search-1' } })
  const { mod, restore } = loadWaitlistActions({ db })

  try {
    const result = await mod.saveNearbySavedSearchAlert({
      email: 'person@example.com',
      city: 'Austin',
      state: 'TX',
      businessType: 'caterer',
      source: mod.NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
    })

    assert.equal(result.success, true)
    assert.equal(calls.inserts.length, 0)
    assert.equal(calls.updates.length, 1)
    assert.deepEqual(calls.updates[0].filters, [['id', 'saved-search-1']])
    assert.equal(calls.updates[0].payload.business_type, 'caterer')
  } finally {
    restore()
  }
})

test('saveNearbySavedSearchAlert returns a friendly rate-limit error', async () => {
  const { db, calls } = createDbMock()
  const { mod, restore } = loadWaitlistActions({
    db,
    checkRateLimitImpl: async () => {
      throw new Error('Too many attempts')
    },
  })

  try {
    const result = await mod.saveNearbySavedSearchAlert({
      email: 'person@example.com',
      source: mod.NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
    })

    assert.equal(result.success, false)
    assert.equal(result.error, 'Too many requests. Please try again shortly.')
    assert.equal(calls.inserts.length, 0)
    assert.equal(calls.updates.length, 0)
    assert.equal(calls.upserts.length, 0)
  } finally {
    restore()
  }
})
