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
  const routePath = require.resolve('../../app/api/book/route.ts')

  const originalAdmin = require.cache[adminPath] ?? null
  const originalEmailValidator = require.cache[emailValidatorPath] ?? null
  const originalRateLimit = require.cache[rateLimitPath] ?? null
  const originalMatchChefs = require.cache[matchChefsPath] ?? null
  const originalOwnerAccount = require.cache[ownerAccountPath] ?? null
  const originalNotifications = require.cache[notificationsPath] ?? null

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
      default: {
        sendNewInquiryChefEmail: async () => {
          notificationCalls.chef += 1
        },
        sendInquiryReceivedEmail: async () => {
          notificationCalls.client += 1
        },
      },
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
        }),
      })
    )

    assert.equal(response.status, 200)

    const clientInsert = state.inserts.clients?.[0]
    const inquiryInsert = state.inserts.inquiries?.[0]
    const eventInsert = state.inserts.events?.[0]

    assert.ok(clientInsert, 'client should be created')
    assert.ok(inquiryInsert, 'inquiry should be created')
    assert.ok(eventInsert, 'event should be created')

    assert.deepEqual(clientInsert.dietary_restrictions, ['gluten-free', 'peanut allergy'])
    assert.deepEqual(clientInsert.allergies, ['gluten-free', 'peanut allergy'])
    assert.deepEqual(inquiryInsert.confirmed_dietary_restrictions, [
      'gluten-free',
      'peanut allergy',
    ])
    assert.deepEqual(eventInsert.dietary_restrictions, ['gluten-free', 'peanut allergy'])
    assert.deepEqual(eventInsert.allergies, ['gluten-free', 'peanut allergy'])
    assert.equal(
      notificationCalls.chef,
      0,
      'chef email should be skipped when no chef email exists'
    )
    assert.equal(notificationCalls.client, 1, 'client confirmation email should still be attempted')
    assert.ok(
      state.updates.some(
        (update) =>
          update.table === 'inquiries' &&
          update.values.converted_to_event_id === 'event-1' &&
          update.filters.some((filter) => filter.column === 'id' && filter.value === 'inquiry-1')
      ),
      'created event should be linked back to the inquiry'
    )
  } finally {
    restore()
  }
})
