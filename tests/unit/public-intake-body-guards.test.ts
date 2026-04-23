import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PUBLIC_INTAKE_JSON_BODY_MAX_BYTES } = require('../../lib/api/request-body.ts') as {
  PUBLIC_INTAKE_JSON_BODY_MAX_BYTES: number
}

class QueryBuilder implements PromiseLike<{ count: number; data: null; error: null }> {
  select() {
    return this
  }

  eq() {
    return this
  }

  gte() {
    return this
  }

  contains() {
    return this
  }

  single() {
    return Promise.resolve(this.execute())
  }

  then<TResult1 = { count: number; data: null; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { count: number; data: null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute() {
    return { count: 0, data: null, error: null }
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

function restoreModules(routePath: string, originals: Map<string, unknown>) {
  for (const [modulePath, original] of originals.entries()) {
    if (original) {
      require.cache[modulePath] = original as never
    } else {
      delete require.cache[modulePath]
    }
  }

  delete require.cache[routePath]
}

function buildOversizedJsonBody() {
  return JSON.stringify({
    payload: 'x'.repeat(PUBLIC_INTAKE_JSON_BODY_MAX_BYTES + 1024),
  })
}

function loadOpenBookingRoute() {
  const originals = new Map<string, unknown>()
  const routePath = require.resolve('../../app/api/book/route.ts')

  mockModule(
    require.resolve('../../lib/db/admin.ts'),
    {
      createAdminClient: () => ({
        from() {
          return new QueryBuilder()
        },
      }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/email/email-validator.ts'),
    {
      validateEmailLocal: () => ({ isValid: true }),
      suggestEmailCorrection: () => null,
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/rateLimit.ts'),
    {
      checkRateLimit: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/booking/match-chefs.ts'),
    {
      matchChefsForBooking: async () => ({
        chefs: [],
        resolvedLocation: null,
      }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/platform/owner-account.ts'),
    {
      resolveOwnerChefId: async () => null,
    },
    originals
  )

  delete require.cache[routePath]
  const mod = require(routePath)

  return {
    mod,
    restore: () => restoreModules(routePath, originals),
  }
}

function loadEmbedInquiryRoute() {
  const originals = new Map<string, unknown>()
  const routePath = require.resolve('../../app/api/embed/inquiry/route.ts')

  mockModule(
    require.resolve('../../lib/db/admin.ts'),
    {
      createAdminClient: () => ({
        from() {
          return new QueryBuilder()
        },
      }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/email/email-validator.ts'),
    {
      validateEmailLocal: () => ({ isValid: true }),
      suggestEmailCorrection: () => null,
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/rateLimit.ts'),
    {
      checkRateLimit: async () => {},
    },
    originals
  )

  delete require.cache[routePath]
  const mod = require(routePath)

  return {
    mod,
    restore: () => restoreModules(routePath, originals),
  }
}

function loadKioskInquiryRoute() {
  const originals = new Map<string, unknown>()
  const routePath = require.resolve('../../app/api/kiosk/inquiry/route.ts')

  mockModule(
    require.resolve('../../lib/db/admin.ts'),
    {
      createAdminClient: () => ({
        from() {
          return new QueryBuilder()
        },
      }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/clients/actions.ts'),
    {
      createClientFromLead: async () => ({ id: 'client-1' }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/devices/token.ts'),
    {
      extractBearerToken: () => 'device-token',
      validateDeviceToken: async () => ({
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      }),
    },
    originals
  )

  delete require.cache[routePath]
  const mod = require(routePath)

  return {
    mod,
    restore: () => restoreModules(routePath, originals),
  }
}

test('open booking returns 400 for malformed JSON', async () => {
  const { mod, restore } = loadOpenBookingRoute()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/book', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: '{',
      })
    )

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), {
      error: 'Invalid booking request body',
    })
  } finally {
    restore()
  }
})

test('open booking returns 413 for oversized request bodies', async () => {
  const { mod, restore } = loadOpenBookingRoute()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/book', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: buildOversizedJsonBody(),
      })
    )

    assert.equal(response.status, 413)
    assert.deepEqual(await response.json(), {
      error: 'Booking request body is too large',
    })
  } finally {
    restore()
  }
})

test('embed inquiry returns 400 for malformed JSON and keeps CORS headers', async () => {
  const { mod, restore } = loadEmbedInquiryRoute()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/embed/inquiry', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: '{',
      })
    )

    assert.equal(response.status, 400)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
    assert.deepEqual(await response.json(), {
      error: 'Invalid inquiry request body',
    })
  } finally {
    restore()
  }
})

test('embed inquiry returns 413 for oversized request bodies and keeps CORS headers', async () => {
  const { mod, restore } = loadEmbedInquiryRoute()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/embed/inquiry', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: buildOversizedJsonBody(),
      })
    )

    assert.equal(response.status, 413)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
    assert.deepEqual(await response.json(), {
      error: 'Inquiry request body is too large',
    })
  } finally {
    restore()
  }
})

test('kiosk inquiry returns 400 for malformed JSON after device auth succeeds', async () => {
  const { mod, restore } = loadKioskInquiryRoute()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/kiosk/inquiry', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer device-token',
        },
        body: '{',
      })
    )

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), {
      error: 'Invalid kiosk inquiry request body',
    })
  } finally {
    restore()
  }
})

test('kiosk inquiry returns 413 for oversized request bodies after device auth succeeds', async () => {
  const { mod, restore } = loadKioskInquiryRoute()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/kiosk/inquiry', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer device-token',
        },
        body: buildOversizedJsonBody(),
      })
    )

    assert.equal(response.status, 413)
    assert.deepEqual(await response.json(), {
      error: 'Kiosk inquiry request body is too large',
    })
  } finally {
    restore()
  }
})
