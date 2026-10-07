import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const good = {
  event_name: 'PageView',
  event_id: 'synthetic-page-view',
  event_source_url: 'http://localhost/demo',
}
function fixture(options: { unauthorized?: boolean; limited?: boolean; failed?: boolean } = {}) {
  const sent: Array<any> = []
  const originals: Array<[string, any]> = []
  function patch(relative: string, exports: object) {
    const path = require.resolve(relative)
    originals.push([path, require.cache[path]])
    require.cache[path] = { id: path, filename: path, loaded: true, exports } as any
  }
  const user = async () => {
    if (options.unauthorized) throw new Error('Unauthorized')
    return { authUserId: 'synthetic-user', tenantId: 'synthetic-chef', role: 'chef' }
  }
  patch('../../lib/auth/get-user.ts', {
    requireAuth: user,
    requireChef: user,
    requireChefAdmin: user,
    requireClient: user,
    requireStaff: user,
    requirePartner: user,
  })
  patch('../../lib/rateLimit.ts', {
    checkRateLimit: async () => {
      if (options.limited) throw new Error('Too many attempts')
    },
  })
  patch('../../lib/tracking/meta-capi.ts', {
    sendConversionEvent: async (event: unknown) => {
      sent.push(event)
      return options.failed ? { success: false, error: 'vendor-private-detail' } : { success: true }
    },
  })
  const guard = require.resolve('../../lib/api/guard.ts')
  const originalGuard = require.cache[guard]
  const route = require.resolve('../../app/api/tracking/meta-capi/route.ts')
  delete require.cache[guard]
  delete require.cache[route]
  const mod = require(route)
  return {
    mod,
    sent,
    restore() {
      delete require.cache[route]
      if (originalGuard) require.cache[guard] = originalGuard
      else delete require.cache[guard]
      for (const [path, original] of originals) {
        if (original) require.cache[path] = original
        else delete require.cache[path]
      }
    },
  }
}
function request(body: unknown) {
  return new Request('http://localhost/api/tracking/meta-capi', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.9',
      'user-agent': 'fixture-browser',
    },
    body: JSON.stringify(body),
  })
}
test('unauthenticated conversion submission is rejected before dispatch', async () => {
  const f = fixture({ unauthorized: true })
  try {
    assert.equal((await f.mod.POST(request(good))).status, 401)
    assert.equal(f.sent.length, 0)
  } finally {
    f.restore()
  }
})
test('invalid event payloads cannot reach the tracking provider', async () => {
  const f = fixture()
  try {
    assert.equal((await f.mod.POST(request({ event_name: 123 }))).status, 400)
    assert.equal(f.sent.length, 0)
  } finally {
    f.restore()
  }
})
test('browser submissions cannot fabricate a purchase conversion', async () => {
  const f = fixture()
  try {
    assert.equal((await f.mod.POST(request({ ...good, event_name: 'Purchase' }))).status, 400)
    assert.equal(f.sent.length, 0)
  } finally {
    f.restore()
  }
})
test('an event cannot claim a different origin as its source', async () => {
  const f = fixture()
  try {
    assert.equal(
      (await f.mod.POST(request({ ...good, event_source_url: 'https://unrelated.example/demo' })))
        .status,
      400
    )
    assert.equal(f.sent.length, 0)
  } finally {
    f.restore()
  }
})
test('valid collection uses server time and received headers rather than supplied identity', async () => {
  const f = fixture()
  try {
    const response = await f.mod.POST(
      request({
        ...good,
        event_time: 1,
        user_data: {
          email: 'unrelated@example.com',
          ip: '203.0.113.100',
          user_agent: 'spoofed',
          fbc: 'fixture-click',
        },
      })
    )
    assert.equal(response.status, 200)
    assert.equal((await response.json()).success, true)
    assert.equal(f.sent.length, 1)
    assert.equal(f.sent[0].event_name, 'PageView')
    assert.equal(f.sent[0].user_data.ip, '198.51.100.9')
    assert.equal(f.sent[0].user_data.userAgent, 'fixture-browser')
    assert.equal(f.sent[0].user_data.email, undefined)
    assert.equal(f.sent[0].user_data.fbc, 'fixture-click')
    assert.ok(Math.abs(f.sent[0].event_time - Math.floor(Date.now() / 1000)) <= 2)
  } finally {
    f.restore()
  }
})
test('rate-limited collection stops before dispatch', async () => {
  const f = fixture({ limited: true })
  try {
    assert.equal((await f.mod.POST(request(good))).status, 429)
    assert.equal(f.sent.length, 0)
  } finally {
    f.restore()
  }
})
test('failed provider delivery returns a failure without vendor internals', async () => {
  const f = fixture({ failed: true })
  try {
    const response = await f.mod.POST(request(good))
    assert.equal(response.status, 502)
    const result = await response.json()
    assert.equal(result.success, false)
    assert.doesNotMatch(JSON.stringify(result), /vendor-private-detail/)
  } finally {
    f.restore()
  }
})
