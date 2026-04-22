import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import {
  buildCulinaryProfileVector,
  type ClientProfileSourceBundle,
} from '@/lib/clients/client-profile-service'

const require = createRequire(import.meta.url)

type Filter = { column: string; value: unknown }
type DbResult = { data: any; error: any }

class QueryBuilder {
  private readonly filters: Filter[] = []

  constructor(
    private readonly table: string,
    private readonly resolver: (table: string, filters: Filter[]) => DbResult
  ) {}

  select(_columns?: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  limit(_value: number) {
    return this
  }

  single() {
    return Promise.resolve(this.resolver(this.table, this.filters))
  }

  maybeSingle() {
    return Promise.resolve(this.resolver(this.table, this.filters))
  }
}

function makeBaseBundle(
  overrides: Partial<ClientProfileSourceBundle> = {}
): ClientProfileSourceBundle {
  return {
    tenantId: 'tenant-1',
    client: {
      id: 'client-1',
      full_name: 'Jordan Avery',
      preferred_name: 'Jordan',
      dietary_restrictions: [],
      dietary_protocols: [],
      allergies: [],
      dislikes: [],
      spice_tolerance: 'mild',
      favorite_cuisines: [],
      favorite_dishes: [],
      preferred_service_style: 'family_style',
      updated_at: '2026-04-22T10:00:00.000Z',
    },
    allergyRecords: [],
    tasteProfile: null,
    preferences: [],
    servedDishes: [],
    mealRequests: [],
    events: [],
    inquiries: [],
    messages: [],
    communicationLogs: [],
    feedbackRequests: [],
    feedbackResponses: [],
    households: [],
    householdMembers: [],
    linkedClients: [],
    managedSubjects: [],
    ...overrides,
  }
}

function loadQuickProposalActions(options: {
  profileTableMissing?: boolean
  vector?: Awaited<ReturnType<typeof buildCulinaryProfileVector>> | null
}) {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const serverDbPath = require.resolve('../../lib/db/server.ts')
  const adminDbPath = require.resolve('../../lib/db/admin.ts')
  const profileServicePath = require.resolve('../../lib/clients/client-profile-service.ts')
  const actionsPath = require.resolve('../../lib/quotes/quick-proposal-actions.ts')

  const originalAuth = require.cache[authPath] ?? null
  const originalServerDb = require.cache[serverDbPath] ?? null
  const originalAdminDb = require.cache[adminDbPath] ?? null
  const originalProfileService = require.cache[profileServicePath] ?? null

  let profileLookupCalls = 0

  const eventRecord = {
    id: 'event-1',
    event_date: '2026-06-20',
    occasion: 'Birthday Dinner',
    guest_count: 8,
    service_style: 'plated',
    serve_time: '18:30',
    location_address: '123 Market St',
    location_city: 'Boston',
    location_state: 'MA',
    special_requests: 'Window table preferred',
    dietary_restrictions: ['gluten-free'],
    allergies: ['peanut'],
    pricing_model: 'flat_rate',
    quoted_price_cents: 240000,
    pricing_notes: 'Includes groceries and service',
    menu_id: 'menu-1',
    client_id: 'client-1',
  }

  const serverDb = {
    from(table: string) {
      return new QueryBuilder(table, (currentTable, filters) => {
        const byColumn = (column: string) =>
          filters.find((filter) => filter.column === column)?.value

        switch (currentTable) {
          case 'events':
            if (byColumn('id') === 'event-1' && byColumn('tenant_id') === 'tenant-1') {
              return { data: eventRecord, error: null }
            }
            return { data: null, error: { message: 'missing event' } }
          case 'clients':
            if (byColumn('id') === 'client-1') {
              return {
                data: {
                  full_name: 'Jordan Avery',
                  email: 'jordan@example.com',
                  phone: '555-111-2222',
                },
                error: null,
              }
            }
            return { data: null, error: { message: 'missing client' } }
          case 'chefs':
            if (byColumn('id') === 'tenant-1') {
              return {
                data: {
                  business_name: 'ChefFlow Test Kitchen',
                  email: 'chef@example.com',
                  phone: '555-222-3333',
                },
                error: null,
              }
            }
            return { data: null, error: { message: 'missing chef' } }
          case 'menus':
            if (byColumn('id') === 'menu-1' && byColumn('tenant_id') === 'tenant-1') {
              return {
                data: {
                  name: 'Spring Supper',
                  description: 'Three-course seasonal menu',
                  simple_mode_content: 'First course\nMain course\nDessert',
                  cuisine_type: 'Italian',
                },
                error: null,
              }
            }
            return { data: null, error: null }
          case 'quotes':
            return { data: null, error: null }
          default:
            return { data: null, error: null }
        }
      })
    },
  }

  const adminDb = {
    from(table: string) {
      return new QueryBuilder(table, () => {
        if (table === 'client_profile_vectors') {
          if (options.profileTableMissing) {
            return {
              data: null,
              error: {
                code: '42P01',
                message: 'relation "client_profile_vectors" does not exist',
              },
            }
          }
          return { data: null, error: null }
        }

        return { data: null, error: null }
      })
    },
  }

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireChef: async () => ({ tenantId: 'tenant-1', id: 'user-1' }),
    },
  } as any

  require.cache[serverDbPath] = {
    id: serverDbPath,
    filename: serverDbPath,
    loaded: true,
    exports: {
      createServerClient: () => serverDb,
    },
  } as any

  require.cache[adminDbPath] = {
    id: adminDbPath,
    filename: adminDbPath,
    loaded: true,
    exports: {
      createAdminClient: () => adminDb,
    },
  } as any

  require.cache[profileServicePath] = {
    id: profileServicePath,
    filename: profileServicePath,
    loaded: true,
    exports: {
      getClientProfileVectorForTenant: async () => {
        profileLookupCalls += 1
        return options.vector ?? null
      },
    },
  } as any

  delete require.cache[actionsPath]
  const mod = require(actionsPath)

  const restore = () => {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalServerDb) require.cache[serverDbPath] = originalServerDb
    else delete require.cache[serverDbPath]

    if (originalAdminDb) require.cache[adminDbPath] = originalAdminDb
    else delete require.cache[adminDbPath]

    if (originalProfileService) require.cache[profileServicePath] = originalProfileService
    else delete require.cache[profileServicePath]

    delete require.cache[actionsPath]
  }

  return { mod, restore, getProfileLookupCalls: () => profileLookupCalls }
}

test('generateProposalFromEvent returns profile guidance when CP persistence is available', async () => {
  const vector = buildCulinaryProfileVector(
    makeBaseBundle({
      client: {
        id: 'client-1',
        full_name: 'Jordan Avery',
        preferred_name: 'Jordan',
        dietary_restrictions: [],
        dietary_protocols: [],
        allergies: ['peanut'],
        dislikes: [],
        spice_tolerance: 'hot',
        favorite_cuisines: ['Italian'],
        favorite_dishes: ['Cacio e Pepe'],
        preferred_service_style: 'plated',
        updated_at: '2026-04-22T10:00:00.000Z',
      },
      messages: [
        {
          id: 'msg-1',
          subject: 'Birthday dinner',
          body: 'We are excited to celebrate.',
          direction: 'inbound',
          created_at: '2026-04-21T10:00:00.000Z',
          sent_at: '2026-04-21T10:00:00.000Z',
        },
      ],
    })
  )

  const { mod, restore, getProfileLookupCalls } = loadQuickProposalActions({ vector })

  try {
    const result = await mod.generateProposalFromEvent('event-1')

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.data.clientName, 'Jordan Avery')
    assert.ok(result.data.profileGuidance)
    assert.ok(result.data.profileGuidance?.hardVetoes.includes('peanut'))
    assert.equal(result.data.profileGuidance?.serviceDepth, 'Formal Plated')
    assert.ok(result.data.profileGuidance?.confidenceSummary)
    assert.equal(getProfileLookupCalls(), 1)
  } finally {
    restore()
  }
})

test('generateProposalFromEvent returns null profile guidance when CP tables are unavailable', async () => {
  const { mod, restore, getProfileLookupCalls } = loadQuickProposalActions({
    profileTableMissing: true,
    vector: null,
  })

  try {
    const result = await mod.generateProposalFromEvent('event-1')

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.data.profileGuidance, null)
    assert.equal(getProfileLookupCalls(), 0)
  } finally {
    restore()
  }
})
