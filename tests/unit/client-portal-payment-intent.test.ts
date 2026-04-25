import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { hashClientPortalToken } from '../../lib/client-portal/token.js'

const require = createRequire(import.meta.url)

const ACTIONS_PATH = require.resolve('../../lib/client-portal/actions.ts')
const DB_PATH = require.resolve('../../lib/db/server.ts')
const HEADERS_PATH = require.resolve('next/headers')
const RATE_LIMIT_PATH = require.resolve('../../lib/rateLimit.ts')
const PUBLIC_INTENT_GUARD_PATH = require.resolve('../../lib/security/public-intent-guard.ts')
const CHECKOUT_PATH = require.resolve('../../lib/stripe/checkout.ts')
const AUTH_PATH = require.resolve('../../lib/auth/get-user.ts')
const CACHE_PATH = require.resolve('next/cache')

type Filter = { column: string; value: unknown }

type PortalClient = {
  id: string
  tenant_id: string | null
  full_name: string | null
  portal_access_token: string | null
  portal_access_token_hash: string | null
  portal_token_created_at: string | null
  portal_token_expires_at: string | null
  portal_token_revoked_at: string | null
}

type PortalEvent = {
  id: string
  client_id: string
  tenant_id: string
}

type MockState = {
  clients: PortalClient[]
  events: PortalEvent[]
  updates: Array<{ table: string; values: Record<string, unknown>; filters: Filter[] }>
  eventSelects: Filter[][]
}

class PortalQueryBuilder implements PromiseLike<{ data: any; error: null }> {
  private mode: 'select' | 'update' = 'select'
  private updateValues: Record<string, unknown> = {}
  private readonly filters: Filter[] = []

  constructor(
    private readonly table: string,
    private readonly state: MockState
  ) {}

  select() {
    return this
  }

  update(values: Record<string, unknown>) {
    this.mode = 'update'
    this.updateValues = values
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.execute())
  }

  single() {
    return Promise.resolve(this.execute())
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private findFilter(column: string) {
    return this.filters.find((filter) => filter.column === column)?.value
  }

  private execute() {
    if (this.mode === 'update') {
      this.state.updates.push({
        table: this.table,
        values: this.updateValues,
        filters: [...this.filters],
      })
      return { data: null, error: null }
    }

    if (this.table === 'clients') {
      const hash = this.findFilter('portal_access_token_hash')
      const legacyToken = this.findFilter('portal_access_token')
      const client =
        this.state.clients.find((row) =>
          hash
            ? row.portal_access_token_hash === hash
            : legacyToken
              ? row.portal_access_token === legacyToken
              : false
        ) ?? null
      return { data: client, error: null }
    }

    if (this.table === 'events') {
      this.state.eventSelects.push([...this.filters])
      const id = this.findFilter('id')
      const clientId = this.findFilter('client_id')
      const tenantId = this.findFilter('tenant_id')
      const event =
        this.state.events.find(
          (row) => row.id === id && row.client_id === clientId && row.tenant_id === tenantId
        ) ?? null
      return { data: event ? { id: event.id } : null, error: null }
    }

    return { data: null, error: null }
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

function restoreModules(originals: Map<string, unknown>) {
  for (const [modulePath, original] of originals.entries()) {
    if (original) require.cache[modulePath] = original as never
    else delete require.cache[modulePath]
  }
  delete require.cache[ACTIONS_PATH]
  delete require.cache[PUBLIC_INTENT_GUARD_PATH]
}

function createClient(token: string, overrides: Partial<PortalClient> = {}): PortalClient {
  return {
    id: 'client-1',
    tenant_id: 'tenant-1',
    full_name: 'Casey Client',
    portal_access_token: null,
    portal_access_token_hash: hashClientPortalToken(token),
    portal_token_created_at: '2026-04-24T12:00:00.000Z',
    portal_token_expires_at: '2026-05-24T12:00:00.000Z',
    portal_token_revoked_at: null,
    ...overrides,
  }
}

function createState(token: string, events: PortalEvent[] = []): MockState {
  return {
    clients: [createClient(token)],
    events,
    updates: [],
    eventSelects: [],
  }
}

function loadPaymentAction(options: {
  state: MockState
  ip?: string
  rateLimitImpl?: (key: string, max: number, windowMs: number) => Promise<void>
  checkoutImpl?: (
    eventId: string,
    tenantId: string,
    options?: { successUrl?: string; cancelUrl?: string; idempotencyKey?: string }
  ) => Promise<string | null>
}) {
  const originals = new Map<string, unknown>()
  const rateLimitCounts = new Map<string, number>()
  const checkoutCalls: Array<{
    eventId: string
    tenantId: string
    options?: { successUrl?: string; cancelUrl?: string; idempotencyKey?: string }
  }> = []

  mockModule(
    HEADERS_PATH,
    {
      headers: async () =>
        new Headers({
          'x-forwarded-for': options.ip ?? '203.0.113.41',
          'x-tenant-id': 'tenant-from-request-must-not-be-used',
          host: 'localhost:3100',
        }),
    },
    originals
  )
  mockModule(
    RATE_LIMIT_PATH,
    {
      checkRateLimit:
        options.rateLimitImpl ??
        (async (key: string, max: number) => {
          const next = (rateLimitCounts.get(key) ?? 0) + 1
          rateLimitCounts.set(key, next)
          if (next > max) throw new Error('Too many attempts')
        }),
    },
    originals
  )
  mockModule(
    DB_PATH,
    {
      createServerClient: () => ({
        from(table: string) {
          return new PortalQueryBuilder(table, options.state)
        },
      }),
    },
    originals
  )
  mockModule(
    CHECKOUT_PATH,
    {
      createPaymentCheckoutUrl:
        options.checkoutImpl ??
        (async (
          eventId: string,
          tenantId: string,
          checkoutOptions?: { successUrl?: string; cancelUrl?: string; idempotencyKey?: string }
        ) => {
          checkoutCalls.push({ eventId, tenantId, options: checkoutOptions })
          return `https://stripe.test/session-${checkoutCalls.length}`
        }),
    },
    originals
  )
  mockModule(AUTH_PATH, { requireChef: async () => ({ tenantId: 'tenant-1' }) }, originals)
  mockModule(CACHE_PATH, { revalidatePath: () => undefined }, originals)

  delete require.cache[ACTIONS_PATH]
  delete require.cache[PUBLIC_INTENT_GUARD_PATH]
  const mod = require(ACTIONS_PATH)

  return {
    mod,
    checkoutCalls,
    restore: () => restoreModules(originals),
  }
}

test('client portal payment checkout returns ok for a valid token and payable event', async () => {
  const token = `valid-${Date.now()}`
  const state = createState(token, [
    { id: 'event-1', client_id: 'client-1', tenant_id: 'tenant-1' },
  ])
  const { mod, checkoutCalls, restore } = loadPaymentAction({ state })

  try {
    const result = await mod.getClientPortalPaymentCheckoutUrl(token, 'event-1')

    assert.deepEqual(result, {
      status: 'ok',
      checkoutUrl: 'https://stripe.test/session-1',
    })
    assert.equal(checkoutCalls.length, 1)
    assert.equal(checkoutCalls[0].tenantId, 'tenant-1')
    assert.match(checkoutCalls[0].options?.idempotencyKey ?? '', /^cf-client-portal-pay-/)
  } finally {
    restore()
  }
})

test('client portal payment checkout returns not_found for an invalid token', async () => {
  const token = `invalid-${Date.now()}`
  const state = createState(token, [
    { id: 'event-1', client_id: 'client-1', tenant_id: 'tenant-1' },
  ])
  const { mod, checkoutCalls, restore } = loadPaymentAction({ state })

  try {
    const result = await mod.getClientPortalPaymentCheckoutUrl('missing-token', 'event-1')

    assert.deepEqual(result, { status: 'not_found' })
    assert.equal(checkoutCalls.length, 0)
  } finally {
    restore()
  }
})

test('client portal payment checkout dedupes repeated anonymous hits for the same token and event', async () => {
  const token = `dedupe-${Date.now()}`
  const state = createState(token, [
    { id: 'event-1', client_id: 'client-1', tenant_id: 'tenant-1' },
  ])
  const checkoutCalls: string[] = []
  const { mod, restore } = loadPaymentAction({
    state,
    checkoutImpl: async (eventId) => {
      checkoutCalls.push(eventId)
      await new Promise((resolve) => setTimeout(resolve, 25))
      return `https://stripe.test/session-${checkoutCalls.length}`
    },
  })

  try {
    const [first, second] = await Promise.all([
      mod.getClientPortalPaymentCheckoutUrl(token, 'event-1'),
      mod.getClientPortalPaymentCheckoutUrl(token, 'event-1'),
    ])
    const third = await mod.getClientPortalPaymentCheckoutUrl(token, 'event-1')

    assert.equal(first.status, 'ok')
    assert.deepEqual(second, first)
    assert.deepEqual(third, first)
    assert.equal(checkoutCalls.length, 1)
  } finally {
    restore()
  }
})

test('client portal payment checkout returns rate_limited when the public intent guard rejects attempts', async () => {
  const token = `rate-${Date.now()}`
  const state = createState(token, [
    { id: 'event-1', client_id: 'client-1', tenant_id: 'tenant-1' },
  ])
  const { mod, checkoutCalls, restore } = loadPaymentAction({ state })

  try {
    let result: any
    for (let index = 0; index < 13; index += 1) {
      result = await mod.getClientPortalPaymentCheckoutUrl(token, 'event-1')
    }

    assert.deepEqual(result, { status: 'rate_limited' })
    assert.equal(checkoutCalls.length, 1)
  } finally {
    restore()
  }
})

test('client portal payment checkout scopes tenant from resolved portal access and event lookup', async () => {
  const token = `tenant-${Date.now()}`
  const state = createState(token, [
    { id: 'event-1', client_id: 'client-1', tenant_id: 'tenant-from-request-must-not-be-used' },
  ])
  const { mod, checkoutCalls, restore } = loadPaymentAction({ state })

  try {
    const result = await mod.getClientPortalPaymentCheckoutUrl(token, 'event-1')

    assert.deepEqual(result, { status: 'not_found' })
    assert.equal(checkoutCalls.length, 0)
    assert.equal(
      state.eventSelects.some((filters) =>
        filters.some((filter) => filter.column === 'tenant_id' && filter.value === 'tenant-1')
      ),
      true
    )
  } finally {
    restore()
  }
})
