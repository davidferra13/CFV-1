import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type Filter = { column: string; value: unknown }
type MockState = {
  inserts: Record<string, unknown[]>
  updates: Array<{ table: string; values: Record<string, unknown>; filters: Filter[] }>
}

class QueryBuilder implements PromiseLike<{ data: any; error: null; count?: number }> {
  private mode: 'select' | 'insert' | 'update' | 'upsert' | null = null
  private insertedValues: unknown = null
  private updatedValues: Record<string, unknown> | null = null
  private readonly filters: Filter[] = []

  constructor(
    private readonly table: string,
    private readonly state: MockState
  ) {}

  select() {
    if (!this.mode) this.mode = 'select'
    return this
  }

  insert(values: unknown) {
    this.mode = 'insert'
    this.insertedValues = values
    return this
  }

  update(values: Record<string, unknown>) {
    this.mode = 'update'
    this.updatedValues = values
    return this
  }

  upsert(values: unknown) {
    this.mode = 'upsert'
    this.insertedValues = values
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  ilike(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  gte() {
    return this
  }

  lte() {
    return this
  }

  in() {
    return this
  }

  not() {
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  is() {
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.execute())
  }

  single() {
    return Promise.resolve(this.execute())
  }

  then<TResult1 = { data: any; error: null; count?: number }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute() {
    if (this.mode === 'insert' || this.mode === 'upsert') {
      const rows = this.state.inserts[this.table] ?? []
      this.state.inserts[this.table] = rows
      rows.push(this.insertedValues)

      if (this.table === 'inquiries') return { data: { id: `inquiry-${rows.length}` }, error: null }
      if (this.table === 'events') return { data: { id: `event-${rows.length}` }, error: null }
      if (this.table === 'event_series')
        return { data: { id: `series-${rows.length}` }, error: null }
      if (this.table === 'event_service_sessions') {
        const values = Array.isArray(this.insertedValues)
          ? this.insertedValues
          : [this.insertedValues]
        return {
          data: values.map((value, index) => ({
            id: `session-${index + 1}`,
            ...(value as Record<string, unknown>),
          })),
          error: null,
        }
      }
      return { data: null, error: null }
    }

    if (this.mode === 'update') {
      this.state.updates.push({
        table: this.table,
        values: this.updatedValues ?? {},
        filters: [...this.filters],
      })
      return { data: null, error: null }
    }

    if (this.table === 'chefs') {
      const bookingSlug = this.filters.find((filter) => filter.column === 'booking_slug')?.value
      if (bookingSlug) {
        return {
          data: {
            id: 'chef-1',
            business_name: 'Chef One',
            booking_slug: bookingSlug,
            booking_enabled: true,
            booking_model: 'instant_book',
            booking_base_price_cents: 20000,
            booking_pricing_type: 'flat_rate',
            booking_deposit_type: 'percent',
            booking_deposit_percent: 30,
            booking_deposit_fixed_cents: null,
            booking_min_notice_days: 1,
            stripe_account_id: 'acct_123',
            stripe_onboarding_complete: true,
            platform_fee_percent: 0,
            platform_fee_fixed_cents: 0,
          },
          error: null,
        }
      }
      return { data: { phone: null, email: null }, error: null }
    }

    if (this.table === 'chef_marketplace_profiles') return { data: null, error: null }
    if (this.table === 'ai_call_routing_rules') return { data: null, error: null }
    if (this.table === 'inquiries') return { data: null, error: null, count: 0 }
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

function restoreModules(routePath: string, originals: Map<string, unknown>) {
  for (const [modulePath, original] of originals.entries()) {
    if (original) require.cache[modulePath] = original as never
    else delete require.cache[modulePath]
  }
  delete require.cache[routePath]
}

function mockNextHeaders(originals: Map<string, unknown>, ip: string) {
  mockModule(
    require.resolve('next/headers'),
    {
      headers: async () =>
        new Headers({
          'x-forwarded-for': ip,
          host: 'localhost:3100',
        }),
    },
    originals
  )
}

function loadInstantBookingAction() {
  const originals = new Map<string, unknown>()
  const actionPath = require.resolve('../../lib/booking/instant-book-actions.ts')
  const state: MockState = { inserts: {}, updates: [] }
  const stripeCalls: Array<{ params: any; options: any }> = []

  mockNextHeaders(originals, `203.0.113.${Math.floor(Math.random() * 80) + 20}`)
  mockModule(
    require.resolve('../../lib/db/server.ts'),
    {
      createServerClient: () => ({
        from(table: string) {
          return new QueryBuilder(table, state)
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
    require.resolve('../../lib/stripe/transfer-routing.ts'),
    {
      __esModule: true,
      computeApplicationFee: () => 0,
      default: {
        computeApplicationFee: () => 0,
      },
    },
    originals
  )
  const StripeCtor = function StripeCtor() {
    return {
      checkout: {
        sessions: {
          create: async (params: any, options: any) => {
            stripeCalls.push({ params, options })
            return { url: `https://stripe.test/session-${stripeCalls.length}` }
          },
        },
      },
    }
  }
  mockModule(require.resolve('stripe'), { default: StripeCtor }, originals)

  delete require.cache[actionPath]
  return {
    mod: require(actionPath),
    state,
    stripeCalls,
    restore: () => restoreModules(actionPath, originals),
  }
}

function loadPublicInquiryAction() {
  const originals = new Map<string, unknown>()
  const actionPath = require.resolve('../../lib/inquiries/public-actions.ts')
  const state: MockState = { inserts: {}, updates: [] }

  mockNextHeaders(originals, `203.0.113.${Math.floor(Math.random() * 80) + 100}`)
  mockModule(
    require.resolve('../../lib/db/server.ts'),
    {
      createServerClient: () => ({
        from(table: string) {
          return new QueryBuilder(table, state)
        },
      }),
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/profile/public-chef.ts'),
    {
      findChefByPublicSlug: async () => ({
        data: {
          id: 'chef-1',
          business_name: 'Chef One',
          email: null,
          account_status: 'active',
          deletion_scheduled_for: null,
        },
        error: null,
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
    require.resolve('../../lib/platform/owner-account.ts'),
    {
      FOUNDER_EMAIL: 'founder@example.com',
      resolveOwnerChefId: async () => null,
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/platform-observability/events.ts'),
    {
      recordPlatformEvent: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/email/notifications.ts'),
    {
      __esModule: true,
      sendInquiryReceivedEmail: async () => {},
      sendNewInquiryChefEmail: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/sms/send.ts'),
    {
      __esModule: true,
      sendSms: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/realtime/broadcast.ts'),
    {
      __esModule: true,
      broadcast: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/automations/engine.ts'),
    {
      __esModule: true,
      evaluateAutomations: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/ai/reactive/hooks.ts'),
    {
      __esModule: true,
      onInquiryCreated: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/notifications/actions.ts'),
    {
      __esModule: true,
      getChefAuthUserId: async () => null,
      createNotification: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/communication/auto-response.ts'),
    {
      __esModule: true,
      triggerAutoResponse: async () => {},
    },
    originals
  )
  mockModule(
    require.resolve('../../lib/hub/inquiry-circle-actions.ts'),
    {
      __esModule: true,
      createInquiryCircle: async () => ({ groupToken: 'group-token', groupId: 'group-1' }),
    },
    originals
  )

  delete require.cache[actionPath]
  return {
    mod: require(actionPath),
    state,
    restore: () => restoreModules(actionPath, originals),
  }
}

test('instant booking reuses checkout for the same anonymous public intent', async () => {
  const { mod, state, stripeCalls, restore } = loadInstantBookingAction()

  try {
    const input = {
      chef_slug: 'chef-one',
      full_name: 'Casey Client',
      email: `casey-${Date.now()}@example.com`,
      occasion: 'Birthday dinner',
      event_date: '2026-06-20',
      serve_time: '18:30',
      guest_count: 8,
      address: '1 Main St, Boston, MA',
      additional_notes: 'Window table',
      website_url: '',
      attempt_id: `attempt-${Date.now()}-a`,
    }

    const first = await mod.createInstantBookingCheckout(input)
    const second = await mod.createInstantBookingCheckout({
      ...input,
      attempt_id: `attempt-${Date.now()}-b`,
    })

    assert.equal(first.checkoutUrl, 'https://stripe.test/session-1')
    assert.equal(second.checkoutUrl, first.checkoutUrl)
    assert.equal(stripeCalls.length, 1)
    assert.equal(state.inserts.inquiries?.length, 1)
    assert.equal(state.inserts.events?.length, 1)
    assert.match(stripeCalls[0].options.idempotencyKey, /^cf-instant-/)
  } finally {
    restore()
  }
})

test('public inquiry accepts a valid public submission shape', async () => {
  const { mod, state, restore } = loadPublicInquiryAction()

  try {
    const result = await mod.submitPublicInquiry({
      chef_slug: 'chef-one',
      full_name: 'Casey Client',
      email: `public-${Date.now()}@example.com`,
      address: '1 Main St, Boston, MA',
      event_date: '2026-06-20',
      serve_time: '18:30',
      guest_count: 8,
      occasion: 'Birthday dinner',
      additional_notes: 'No shellfish',
      website_url: '',
    })

    assert.deepEqual(result, { success: true, inquiryCreated: true, eventCreated: false })
    assert.equal(state.inserts.inquiries?.length, 1)
    assert.equal(state.inserts.events?.length ?? 0, 0)
    assert.equal(
      state.updates.some((update) => update.table === 'inquiries'),
      false,
      'public inquiry should not link an inquiry to an event before commitment'
    )
  } finally {
    restore()
  }
})
