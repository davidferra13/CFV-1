import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const token = '00000000-0000-4000-8000-000000000001'
const payload = {
  dietary_restrictions: ['gluten-free'],
  allergies: ['peanut'],
  allergy_severity: 'life_threatening',
  spice_tolerance: 'mild',
}

function fixture(
  options: {
    outreach?: Record<string, unknown>
    foreignGuest?: boolean
    receiptFailure?: boolean
  } = {}
) {
  const outreach = {
    id: 'outreach-1',
    guest_id: 'guest-1',
    event_id: 'event-1',
    tenant_id: 'chef-1',
    token,
    status: 'opened',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    ...options.outreach,
  }
  const guest = {
    id: 'guest-1',
    event_id: 'event-1',
    tenant_id: options.foreignGuest ? 'chef-2' : 'chef-1',
    full_name: 'Synthetic Guest',
    dietary_restrictions: ['vegetarian'],
    allergies: ['sesame'],
    allergy_severity: 'allergy',
    spice_tolerance: 'none',
  }
  const records: Record<string, Array<Record<string, unknown>>> = {
    dietary_outreach: [outreach],
    event_guests: [guest],
  }
  let reads = 0
  let writes = 0
  class Query {
    filters: Array<[string, unknown]> = []
    values: Record<string, unknown> | undefined
    constructor(readonly table: string) {}
    select(_columns?: string) {
      return this
    }
    update(values: Record<string, unknown>) {
      this.values = values
      return this
    }
    eq(column: string, value: unknown) {
      this.filters.push([column, value])
      return this
    }
    execute(single: boolean) {
      const rows = (records[this.table] ?? []).filter((row) =>
        this.filters.every(([key, value]) => row[key] === value)
      )
      if (this.values) {
        writes++
        if (this.table === 'dietary_outreach' && options.receiptFailure)
          return { data: null, error: { code: 'FIXTURE_FAILURE' } }
        for (const row of rows) Object.assign(row, this.values)
      } else reads++
      return {
        data: single ? (rows[0] ?? null) : rows,
        error: single && !rows.length ? { code: 'PGRST116' } : null,
      }
    }
    single() {
      return Promise.resolve(this.execute(true))
    }
    maybeSingle() {
      return this.single()
    }
    then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(this.execute(false)).then(resolve, reject)
    }
  }
  const patches: Array<[string, unknown]> = []
  const patch = (relative: string, exports: object) => {
    const path = require.resolve(relative)
    patches.push([path, require.cache[path]])
    require.cache[path] = { id: path, filename: path, loaded: true, exports } as any
  }
  patch('../../lib/db/server.ts', {
    createServerClient: () => ({ from: (table: string) => new Query(table) }),
  })
  patch('../../lib/rateLimit.ts', { checkRateLimit: async () => {} })
  const noAccount = async () => {
    throw new Error('Guest confirmation must not require an account')
  }
  patch('../../lib/auth/get-user.ts', {
    requireAuth: noAccount,
    requireChef: noAccount,
    requireChefAdmin: noAccount,
    requireClient: noAccount,
    requirePartner: noAccount,
    requireStaff: noAccount,
  })
  const routePath = require.resolve('../../app/api/dietary-confirm/[token]/route.ts')
  const guardPath = require.resolve('../../lib/api/guard.ts')
  const oldGuard = require.cache[guardPath]
  delete require.cache[guardPath]
  delete require.cache[routePath]
  const route = require(routePath)
  return {
    route,
    guest,
    outreach,
    counters: () => ({ reads, writes }),
    restore() {
      delete require.cache[routePath]
      if (oldGuard) require.cache[guardPath] = oldGuard
      else delete require.cache[guardPath]
      for (const [path, original] of patches) {
        if (original) require.cache[path] = original as any
        else delete require.cache[path]
      }
    },
  }
}
function request(method = 'GET', body?: unknown) {
  return new Request('http://localhost/api/dietary-confirm/' + token, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.8' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  })
}
test('a malformed capability never queries guest data', async () => {
  const f = fixture()
  try {
    const response = await f.route.GET(request(), { params: { token: 'not-a-uuid' } })
    assert.equal(response.status, 404)
    assert.deepEqual(f.counters(), { reads: 0, writes: 0 })
  } finally {
    f.restore()
  }
})
test('a valid guest capability works without an account and is never cacheable', async () => {
  const f = fixture()
  try {
    const response = await f.route.GET(request(), { params: { token } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).guest_name, 'Synthetic Guest')
    assert.match(response.headers.get('cache-control') ?? '', /no-store/)
  } finally {
    f.restore()
  }
})
test('a token cannot expose a guest from another chef tenant', async () => {
  const f = fixture({ foreignGuest: true })
  try {
    const response = await f.route.GET(request(), { params: { token } })
    assert.equal(response.status, 404)
    assert.doesNotMatch(JSON.stringify(await response.json()), /Synthetic Guest|sesame/)
  } finally {
    f.restore()
  }
})
test('a token cannot update a guest from another chef tenant', async () => {
  const f = fixture({ foreignGuest: true })
  try {
    const response = await f.route.POST(request('POST', payload), { params: { token } })
    assert.equal(response.status, 404)
    assert.deepEqual(f.guest.allergies, ['sesame'])
    assert.equal(f.outreach.status, 'opened')
  } finally {
    f.restore()
  }
})
test('a capability without tenant ownership fails before guest access', async () => {
  const f = fixture({ outreach: { tenant_id: null } })
  try {
    const response = await f.route.GET(request(), { params: { token } })
    assert.equal(response.status, 404)
    assert.equal(f.counters().reads, 1)
  } finally {
    f.restore()
  }
})
test('a malformed expiry cannot make a guest capability permanent', async () => {
  const f = fixture({ outreach: { expires_at: 'not-a-date' } })
  try {
    const response = await f.route.GET(request(), { params: { token } })
    assert.equal(response.status, 410)
    assert.doesNotMatch(JSON.stringify(await response.json()), /Synthetic Guest|sesame/)
  } finally {
    f.restore()
  }
})
test('an explicitly expired capability cannot be revived by a future expiry value', async () => {
  const f = fixture({ outreach: { status: 'expired' } })
  try {
    assert.equal((await f.route.GET(request(), { params: { token } })).status, 410)
  } finally {
    f.restore()
  }
})
test('invalid dietary input cannot silently replace existing allergies', async () => {
  const f = fixture()
  try {
    const response = await f.route.POST(request('POST', { ...payload, allergies: [123] }), {
      params: { token },
    })
    assert.equal(response.status, 400)
    assert.deepEqual(f.guest.allergies, ['sesame'])
    assert.equal(f.counters().writes, 0)
  } finally {
    f.restore()
  }
})
test('a valid confirmation records the guest changes and the response receipt', async () => {
  const f = fixture()
  try {
    const response = await f.route.POST(request('POST', payload), { params: { token } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).success, true)
    assert.deepEqual(f.guest.allergies, ['peanut'])
    assert.equal(f.guest.allergy_severity, 'life_threatening')
    assert.equal(f.outreach.status, 'responded')
    assert.equal(f.counters().writes, 2)
  } finally {
    f.restore()
  }
})
test('a failed confirmation receipt is not reported as complete', async () => {
  const f = fixture({ receiptFailure: true })
  try {
    const response = await f.route.POST(request('POST', payload), { params: { token } })
    assert.equal(response.status, 500)
    assert.notEqual((await response.json()).success, true)
    assert.equal(f.outreach.status, 'opened')
  } finally {
    f.restore()
  }
})
