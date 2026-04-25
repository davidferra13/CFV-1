import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type Filter = { type: 'eq' | 'ilike'; column: string; value: unknown }

type MockState = {
  inserts: Record<string, any[]>
  updates: Array<{ table: string; values: Record<string, unknown>; filters: Filter[] }>
}

class QueryBuilder implements PromiseLike<{ data: any; error: null }> {
  private mode: 'select' | 'insert' | 'update' | null = null
  private readonly filters: Filter[] = []
  private insertedValues: any = null
  private updatedValues: Record<string, unknown> | null = null

  constructor(
    private readonly table: string,
    private readonly state: MockState
  ) {}

  select(_columns?: string) {
    if (!this.mode) this.mode = 'select'
    return this
  }

  insert(values: any) {
    this.mode = 'insert'
    this.insertedValues = values
    return this
  }

  update(values: Record<string, unknown>) {
    this.mode = 'update'
    this.updatedValues = values
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  ilike(column: string, value: unknown) {
    this.filters.push({ type: 'ilike', column, value })
    return this
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

  private execute() {
    switch (this.mode) {
      case 'select':
        if (this.table === 'clients') return { data: null, error: null }
        if (this.table === 'chefs') return { data: { email: null }, error: null }
        return { data: null, error: null }
      case 'insert': {
        const entries = this.state.inserts[this.table] ?? []
        this.state.inserts[this.table] = entries
        entries.push(this.insertedValues)

        if (this.table === 'clients') {
          return { data: { id: `client-${entries.length}` }, error: null }
        }
        if (this.table === 'inquiries') {
          return { data: { id: `inquiry-${entries.length}` }, error: null }
        }
        if (this.table === 'open_bookings') {
          return {
            data: { id: `booking-${entries.length}`, booking_token: 'abc123def4567890' },
            error: null,
          }
        }
        if (this.table === 'open_booking_inquiries') {
          return { data: { id: `booking-inquiry-${entries.length}` }, error: null }
        }
        if (this.table === 'events') {
          return { data: { id: `event-${entries.length}` }, error: null }
        }

        return { data: null, error: null }
      }
      case 'update':
        this.state.updates.push({
          table: this.table,
          values: this.updatedValues ?? {},
          filters: [...this.filters],
        })
        return { data: null, error: null }
      default:
        return { data: null, error: null }
    }
  }
}

function loadRouteModule() {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const emailValidatorPath = require.resolve('../../lib/email/email-validator.ts')
  const rateLimitPath = require.resolve('../../lib/rateLimit.ts')
  const matchChefsPath = require.resolve('../../lib/booking/match-chefs.ts')
  const ownerAccountPath = require.resolve('../../lib/platform/owner-account.ts')
  const notificationsPath = require.resolve('../../lib/email/notifications.ts')
  const allergySyncPath = require.resolve('../../lib/dietary/allergy-sync.ts')
  const notificationsActionsPath = require.resolve('../../lib/notifications/actions.ts')
  const automationsEnginePath = require.resolve('../../lib/automations/engine.ts')
  const reactiveHooksPath = require.resolve('../../lib/ai/reactive/hooks.ts')
  const autoResponsePath = require.resolve('../../lib/communication/auto-response.ts')
  const inquiryCirclePath = require.resolve('../../lib/hub/inquiry-circle-actions.ts')
  const routePath = require.resolve('../../app/api/book/route.ts')

  const originalAdmin = require.cache[adminPath] ?? null
  const originalEmailValidator = require.cache[emailValidatorPath] ?? null
  const originalRateLimit = require.cache[rateLimitPath] ?? null
  const originalMatchChefs = require.cache[matchChefsPath] ?? null
  const originalOwnerAccount = require.cache[ownerAccountPath] ?? null
  const originalNotifications = require.cache[notificationsPath] ?? null
  const originalAllergySync = require.cache[allergySyncPath] ?? null
  const originalNotificationsActions = require.cache[notificationsActionsPath] ?? null
  const originalAutomationsEngine = require.cache[automationsEnginePath] ?? null
  const originalReactiveHooks = require.cache[reactiveHooksPath] ?? null
  const originalAutoResponse = require.cache[autoResponsePath] ?? null
  const originalInquiryCircle = require.cache[inquiryCirclePath] ?? null

  const state: MockState = { inserts: {}, updates: [] }
  const notificationCalls = {
    chef: 0,
    client: 0,
  }

  require.cache[adminPath] = {
    id: adminPath,
    filename: adminPath,
    loaded: true,
    exports: {
      createAdminClient: () => ({
        from(table: string) {
          return new QueryBuilder(table, state)
        },
      }),
    },
  } as any

  require.cache[emailValidatorPath] = {
    id: emailValidatorPath,
    filename: emailValidatorPath,
    loaded: true,
    exports: {
      validateEmailLocal: () => ({ isValid: true }),
      suggestEmailCorrection: () => null,
    },
  } as any

  require.cache[rateLimitPath] = {
    id: rateLimitPath,
    filename: rateLimitPath,
    loaded: true,
    exports: {
      checkRateLimit: async () => {},
    },
  } as any

  require.cache[matchChefsPath] = {
    id: matchChefsPath,
    filename: matchChefsPath,
    loaded: true,
    exports: {
      matchChefsForBooking: async () => ({
        chefs: [{ id: 'chef-1', display_name: 'Chef One', distance_miles: 4 }],
        resolvedLocation: {
          displayLabel: 'Boston, MA',
          city: 'Boston',
          zip: '02108',
        },
      }),
    },
  } as any

  require.cache[ownerAccountPath] = {
    id: ownerAccountPath,
    filename: ownerAccountPath,
    loaded: true,
    exports: {
      resolveOwnerChefId: async () => null,
    },
  } as any

  require.cache[notificationsPath] = {
    id: notificationsPath,
    filename: notificationsPath,
    loaded: true,
    exports: {
      __esModule: true,
      sendNewInquiryChefEmail: async () => {
        notificationCalls.chef += 1
      },
      sendInquiryReceivedEmail: async () => {
        notificationCalls.client += 1
      },
      sendBookingConfirmationEmail: async () => {
        notificationCalls.client += 1
      },
      default: {
        sendNewInquiryChefEmail: async () => {
          notificationCalls.chef += 1
        },
        sendInquiryReceivedEmail: async () => {
          notificationCalls.client += 1
        },
        sendBookingConfirmationEmail: async () => {
          notificationCalls.client += 1
        },
      },
    },
  } as any

  require.cache[allergySyncPath] = {
    id: allergySyncPath,
    filename: allergySyncPath,
    loaded: true,
    exports: {
      __esModule: true,
      syncFlatToStructured: async () => {},
    },
  } as any

  require.cache[notificationsActionsPath] = {
    id: notificationsActionsPath,
    filename: notificationsActionsPath,
    loaded: true,
    exports: {
      __esModule: true,
      getChefAuthUserId: async () => null,
      createNotification: async () => {},
    },
  } as any

  require.cache[automationsEnginePath] = {
    id: automationsEnginePath,
    filename: automationsEnginePath,
    loaded: true,
    exports: {
      __esModule: true,
      evaluateAutomations: async () => {},
    },
  } as any

  require.cache[reactiveHooksPath] = {
    id: reactiveHooksPath,
    filename: reactiveHooksPath,
    loaded: true,
    exports: {
      __esModule: true,
      onInquiryCreated: async () => {},
    },
  } as any

  require.cache[autoResponsePath] = {
    id: autoResponsePath,
    filename: autoResponsePath,
    loaded: true,
    exports: {
      __esModule: true,
      triggerAutoResponse: async () => {},
    },
  } as any

  require.cache[inquiryCirclePath] = {
    id: inquiryCirclePath,
    filename: inquiryCirclePath,
    loaded: true,
    exports: {
      __esModule: true,
      createInquiryCircle: async () => ({ groupToken: 'group-token' }),
    },
  } as any

  delete require.cache[routePath]
  const mod = require(routePath)

  const restore = () => {
    if (originalAdmin) require.cache[adminPath] = originalAdmin
    else delete require.cache[adminPath]

    if (originalEmailValidator) require.cache[emailValidatorPath] = originalEmailValidator
    else delete require.cache[emailValidatorPath]

    if (originalRateLimit) require.cache[rateLimitPath] = originalRateLimit
    else delete require.cache[rateLimitPath]

    if (originalMatchChefs) require.cache[matchChefsPath] = originalMatchChefs
    else delete require.cache[matchChefsPath]

    if (originalOwnerAccount) require.cache[ownerAccountPath] = originalOwnerAccount
    else delete require.cache[ownerAccountPath]

    if (originalNotifications) require.cache[notificationsPath] = originalNotifications
    else delete require.cache[notificationsPath]

    if (originalAllergySync) require.cache[allergySyncPath] = originalAllergySync
    else delete require.cache[allergySyncPath]

    if (originalNotificationsActions)
      require.cache[notificationsActionsPath] = originalNotificationsActions
    else delete require.cache[notificationsActionsPath]

    if (originalAutomationsEngine) require.cache[automationsEnginePath] = originalAutomationsEngine
    else delete require.cache[automationsEnginePath]

    if (originalReactiveHooks) require.cache[reactiveHooksPath] = originalReactiveHooks
    else delete require.cache[reactiveHooksPath]

    if (originalAutoResponse) require.cache[autoResponsePath] = originalAutoResponse
    else delete require.cache[autoResponsePath]

    if (originalInquiryCircle) require.cache[inquiryCirclePath] = originalInquiryCircle
    else delete require.cache[inquiryCirclePath]

    delete require.cache[routePath]
  }

  return { mod, state, notificationCalls, restore }
}

test('open booking preserves dietary context through client, inquiry, and event creation', async () => {
  const { mod, state, notificationCalls, restore } = loadRouteModule()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/book', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify({
          full_name: 'Casey Client',
          email: 'casey@example.com',
          phone: '555-111-2222',
          location: 'Boston, MA',
          event_date: '2026-06-20',
          serve_time: '18:30',
          guest_count: 8,
          occasion: 'Birthday dinner',
          service_type: 'plated',
          budget_range: '$1,500-$2,000',
          dietary_restrictions: 'gluten-free, peanut allergy',
          additional_notes: 'No shellfish cross-contact',
          seasonal_intent: {
            source: 'seasonal_market_pulse',
            pulseId: 'public-seasonal-market-pulse-spring-20260421',
            season: 'Spring',
            leadIngredients: ['Asparagus', 'Sugar Snap Peas', 'Morels'],
            endingSoon: 'Rhubarb',
            comingNext: 'Strawberries',
            sourceMode: 'market-backed',
            scope: {
              label: 'United States',
              mode: 'national_fallback',
              source: 'default',
              isFallback: true,
            },
            provenance: {
              generatedAt: '2026-04-21T12:00:00.000Z',
              marketAsOf: '2026-04-21T10:00:00.000Z',
              marketStatus: 'fresh',
              fallbackReason: 'none',
            },
          },
        }),
      })
    )

    assert.equal(response.status, 200)
    const responseBody = await response.json()
    assert.equal(responseBody.booking_token, 'abc123def4567890')

    const clientInsert = state.inserts.clients?.[0]
    const inquiryInsert = state.inserts.inquiries?.[0]
    const bookingInsert = state.inserts.open_bookings?.[0]
    const bookingLinkInsert = state.inserts.open_booking_inquiries?.[0]
    assert.ok(clientInsert, 'client should be created')
    assert.ok(inquiryInsert, 'inquiry should be created')
    assert.ok(bookingInsert, 'parent booking should be created')
    assert.ok(bookingLinkInsert, 'inquiry should be linked to parent booking')
    assert.equal(state.inserts.events?.length ?? 0, 0, 'event should not be created at intake')

    assert.deepEqual(clientInsert.dietary_restrictions, ['gluten-free', 'peanut allergy'])
    assert.deepEqual(clientInsert.allergies, ['gluten-free', 'peanut allergy'])
    assert.equal(bookingInsert.status, 'sent')
    assert.equal(bookingInsert.budget_cents_per_person, 175000)
    assert.equal(bookingInsert.guest_count_range_label, '7-12 (dinner party)')
    assert.equal(bookingInsert.matched_chef_count, 1)
    assert.deepEqual(inquiryInsert.confirmed_dietary_restrictions, [
      'gluten-free',
      'peanut allergy',
    ])
    assert.equal(inquiryInsert.confirmed_budget_cents, 175000)
    assert.equal(inquiryInsert.unknown_fields.guest_count_range_label, '7-12 (dinner party)')
    assert.equal(bookingLinkInsert.booking_id, 'booking-1')
    assert.equal(bookingLinkInsert.inquiry_id, 'inquiry-1')
    assert.equal(inquiryInsert.unknown_fields.submission_source, 'open_booking')
    assert.equal(inquiryInsert.unknown_fields.seasonal_market_intent.scope.label, 'United States')
    assert.deepEqual(inquiryInsert.unknown_fields.seasonal_market_intent.leadIngredients, [
      'Asparagus',
      'Sugar Snap Peas',
      'Morels',
    ])
    assert.equal(
      inquiryInsert.unknown_fields.seasonal_market_intent.requestScope.label,
      'Boston, MA'
    )
    assert.equal(
      notificationCalls.chef,
      0,
      'chef email should be skipped when no chef email exists'
    )
    assert.equal(notificationCalls.client, 1, 'client confirmation email should still be attempted')
    assert.equal(
      state.updates.some((update) => update.table === 'inquiries'),
      false,
      'intake should not link inquiries to draft events before commitment'
    )
  } finally {
    restore()
  }
})
