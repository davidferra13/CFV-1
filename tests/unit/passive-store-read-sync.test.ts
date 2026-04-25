import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function installModule(path: string, exports: Record<string, unknown>) {
  const original = require.cache[path]
  require.cache[path] = { exports } as NodeJS.Module
  return () => {
    if (original) require.cache[path] = original
    else delete require.cache[path]
  }
}

function passiveProduct(overrides?: Record<string, unknown>) {
  return {
    product_id: 'product-existing',
    chef_id: 'chef-1',
    source_type: 'menu',
    source_id: 'menu-1',
    product_type: 'digital',
    title: 'Existing Menu Pack',
    description: 'Existing product',
    price: 4900,
    fulfillment_type: 'download',
    status: 'active',
    product_key: 'menu:menu-1',
    preview_image_url: null,
    metadata: {},
    generated_payload: {},
    created_at: '2026-04-24T10:00:00.000Z',
    updated_at: '2026-04-24T10:00:00.000Z',
    ...overrides,
  }
}

function createPassiveStoreDb(opts: {
  activeProducts: Array<Record<string, unknown>>
  syncUpserts: Array<Array<Record<string, unknown>>>
}) {
  const chef = {
    id: 'chef-1',
    slug: 'chef-rowan',
    booking_slug: null,
    display_name: 'Chef Rowan',
    business_name: 'Rowan Kitchen',
    profile_image_url: null,
    booking_base_price_cents: 30000,
    booking_pricing_type: 'flat_rate',
    booking_deposit_type: 'percent',
    booking_deposit_percent: 30,
    booking_deposit_fixed_cents: null,
  }

  const now = '2026-04-24T10:30:00.000Z'

  return {
    chef,
    from(table: string) {
      if (table === 'chefs') {
        return {
          select() {
            return {
              eq() {
                return {
                  single() {
                    return Promise.resolve({ data: chef, error: null })
                  },
                }
              },
            }
          },
        }
      }

      if (table === 'menus') {
        return {
          select() {
            return {
              eq() {
                return {
                  neq() {
                    return {
                      order() {
                        return {
                          limit() {
                            return Promise.resolve({
                              data: [
                                {
                                  id: 'menu-1',
                                  name: 'Spring Tasting',
                                  description: 'A client-ready dinner.',
                                  cuisine_type: 'Seasonal American',
                                  service_style: 'Plated dinner',
                                  target_guest_count: 6,
                                  price_per_person_cents: 12000,
                                  times_used: 4,
                                  is_showcase: true,
                                  dishes: [
                                    {
                                      id: 'dish-1',
                                      name: 'Asparagus tart',
                                      course_name: 'Starter',
                                      course_number: 1,
                                      description: 'Spring vegetables.',
                                    },
                                  ],
                                },
                              ],
                              error: null,
                            })
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }

      if (table === 'recipes') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          limit() {
                            return Promise.resolve({
                              data: [
                                {
                                  id: 'recipe-1',
                                  name: 'Brown butter carrots',
                                  category: 'Side',
                                  description: 'Glazed carrots.',
                                  photo_url: null,
                                  times_cooked: 8,
                                  cuisine: 'Seasonal American',
                                  meal_type: 'Dinner',
                                  occasion_tags: ['spring'],
                                  total_cost_cents: 1800,
                                  cost_per_serving_cents: 450,
                                },
                              ],
                              error: null,
                            })
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }

      if (table === 'events') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          limit() {
                            return Promise.resolve({
                              data: [
                                {
                                  id: 'event-1',
                                  event_date: '2026-03-11',
                                  occasion: 'Anniversary Dinner',
                                  service_style: 'Plated dinner',
                                  guest_count: 6,
                                  quoted_price_cents: 36000,
                                  deposit_amount_cents: 12000,
                                  menu: { name: 'Spring Tasting' },
                                },
                              ],
                              error: null,
                            })
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }

      if (table === 'passive_products') {
        return {
          select(selection: string) {
            if (selection === '*') {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        order() {
                          return Promise.resolve({ data: opts.activeProducts, error: null })
                        },
                      }
                    },
                  }
                },
              }
            }

            assert.equal(selection, 'product_id, product_key, status')
            return {
              eq() {
                return Promise.resolve({ data: opts.activeProducts, error: null })
              },
            }
          },
          upsert(rows: Array<Record<string, unknown>>) {
            opts.syncUpserts.push(rows)
            opts.activeProducts.splice(
              0,
              opts.activeProducts.length,
              ...rows.map((row, index) =>
                passiveProduct({
                  ...row,
                  product_id: `synced-product-${index + 1}`,
                  created_at: now,
                  updated_at: now,
                })
              )
            )
            return {
              select() {
                return Promise.resolve({ data: opts.activeProducts, error: null })
              },
            }
          },
          update() {
            return {
              eq() {
                return Promise.resolve({ data: null, error: null })
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }
}

test('clean passive storefront read returns current products without syncing', async () => {
  const serverPath = require.resolve('../../lib/db/server.ts')
  const profilePath = require.resolve('../../lib/profile/public-chef.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const storePath = require.resolve('../../lib/passive-store/store.ts')
  const syncUpserts: Array<Array<Record<string, unknown>>> = []
  const db = createPassiveStoreDb({ activeProducts: [passiveProduct()], syncUpserts })

  const restoreServer = installModule(serverPath, { createServerClient: () => db })
  const restoreProfile = installModule(profilePath, {
    findChefByPublicSlug: async () => ({ data: db.chef, matchedOn: 'slug', error: null }),
    getPublicChefPathSlug: () => 'chef-rowan',
  })
  const restoreSyncState = installModule(syncStatePath, {
    getPassiveStoreSyncState: async () => ({ chef_id: 'chef-1', dirty: false }),
    markPassiveStoreSyncSuccess: async () => {
      throw new Error('clean read should not sync')
    },
    markPassiveStoreSyncFailure: async () => {
      throw new Error('clean read should not record sync failure')
    },
  })
  delete require.cache[storePath]

  try {
    const { getPassiveStorefrontBySlug } = require(storePath)
    const storefront = await getPassiveStorefrontBySlug('chef-rowan')

    assert.equal(storefront.products.length, 1)
    assert.equal(storefront.products[0].product_id, 'product-existing')
    assert.equal(syncUpserts.length, 0)
  } finally {
    restoreServer()
    restoreProfile()
    restoreSyncState()
    delete require.cache[storePath]
  }
})

test('dirty passive storefront read performs one inline fallback sync', async () => {
  const serverPath = require.resolve('../../lib/db/server.ts')
  const profilePath = require.resolve('../../lib/profile/public-chef.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const storePath = require.resolve('../../lib/passive-store/store.ts')
  const syncUpserts: Array<Array<Record<string, unknown>>> = []
  let successMarks = 0
  const db = createPassiveStoreDb({ activeProducts: [passiveProduct()], syncUpserts })

  const restoreServer = installModule(serverPath, { createServerClient: () => db })
  const restoreProfile = installModule(profilePath, {
    findChefByPublicSlug: async () => ({ data: db.chef, matchedOn: 'slug', error: null }),
    getPublicChefPathSlug: () => 'chef-rowan',
  })
  const restoreSyncState = installModule(syncStatePath, {
    getPassiveStoreSyncState: async () => ({ chef_id: 'chef-1', dirty: true }),
    markPassiveStoreSyncSuccess: async () => {
      successMarks += 1
    },
    markPassiveStoreSyncFailure: async () => {
      throw new Error('dirty read sync should succeed')
    },
  })
  delete require.cache[storePath]

  try {
    const { getPassiveStorefrontBySlug } = require(storePath)
    const storefront = await getPassiveStorefrontBySlug('chef-rowan')

    assert.equal(syncUpserts.length, 1)
    assert.equal(successMarks, 1)
    assert.ok(storefront.products.length > 0)
    assert.ok(
      storefront.products.every((product: Record<string, unknown>) => product.status === 'active')
    )
  } finally {
    restoreServer()
    restoreProfile()
    restoreSyncState()
    delete require.cache[storePath]
  }
})

test('missing sync-state row with existing products performs one inline fallback sync', async () => {
  const serverPath = require.resolve('../../lib/db/server.ts')
  const profilePath = require.resolve('../../lib/profile/public-chef.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const storePath = require.resolve('../../lib/passive-store/store.ts')
  const syncUpserts: Array<Array<Record<string, unknown>>> = []
  let successMarks = 0
  const db = createPassiveStoreDb({ activeProducts: [passiveProduct()], syncUpserts })

  const restoreServer = installModule(serverPath, { createServerClient: () => db })
  const restoreProfile = installModule(profilePath, {
    findChefByPublicSlug: async () => ({ data: db.chef, matchedOn: 'slug', error: null }),
    getPublicChefPathSlug: () => 'chef-rowan',
  })
  const restoreSyncState = installModule(syncStatePath, {
    getPassiveStoreSyncState: async () => null,
    markPassiveStoreSyncSuccess: async () => {
      successMarks += 1
    },
    markPassiveStoreSyncFailure: async () => {
      throw new Error('missing-state read sync should succeed')
    },
  })
  delete require.cache[storePath]

  try {
    const { getPassiveStorefrontBySlug } = require(storePath)
    const storefront = await getPassiveStorefrontBySlug('chef-rowan')

    assert.equal(syncUpserts.length, 1)
    assert.equal(successMarks, 1)
    assert.ok(storefront.products.length > 0)
    assert.ok(
      storefront.products.every((product: Record<string, unknown>) => product.status === 'active')
    )
  } finally {
    restoreServer()
    restoreProfile()
    restoreSyncState()
    delete require.cache[storePath]
  }
})
