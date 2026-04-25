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

function createSyncStateDb(opts: {
  rows?: Array<Record<string, unknown>>
  upserts?: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }>
}) {
  return {
    from(table: string) {
      assert.equal(table, 'passive_product_sync_state')

      return {
        upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
          opts.upserts?.push({ payload, options })
          return Promise.resolve({ data: null, error: null })
        },
        select() {
          return {
            eq(column: string, value: unknown) {
              if (column === 'chef_id') {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: (opts.rows ?? []).find((row) => row.chef_id === value) ?? null,
                      error: null,
                    })
                  },
                }
              }

              assert.equal(column, 'dirty')
              assert.equal(value, true)
              return {
                order(columnName: string, orderOptions: Record<string, unknown>) {
                  assert.equal(columnName, 'last_requested_at')
                  assert.deepEqual(orderOptions, { ascending: true })
                  return {
                    limit(limit: number) {
                      return Promise.resolve({
                        data: (opts.rows ?? []).filter((row) => row.dirty === true).slice(0, limit),
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

test('passive store dirty helper upserts dirty sync state with source context', async () => {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const upserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = []

  const restoreAdmin = installModule(adminPath, {
    createAdminClient: () => createSyncStateDb({ upserts }),
  })
  delete require.cache[syncStatePath]

  try {
    const { markPassiveStoreDirty } = require(syncStatePath)
    await markPassiveStoreDirty({
      chefId: 'chef-1',
      reason: 'menu_source_changed',
      sourceType: 'menu',
      sourceId: 'menu-1',
    })

    assert.equal(upserts.length, 1)
    assert.equal(upserts[0].payload.chef_id, 'chef-1')
    assert.equal(upserts[0].payload.dirty, true)
    assert.equal(upserts[0].payload.last_reason, 'menu_source_changed')
    assert.equal(upserts[0].payload.last_source_type, 'menu')
    assert.equal(upserts[0].payload.last_source_id, 'menu-1')
    assert.deepEqual(upserts[0].options, { onConflict: 'chef_id' })
  } finally {
    restoreAdmin()
    delete require.cache[syncStatePath]
  }
})

test('passive store sync success clears dirty state and last error', async () => {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const upserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = []

  const restoreAdmin = installModule(adminPath, {
    createAdminClient: () => createSyncStateDb({ upserts }),
  })
  delete require.cache[syncStatePath]

  try {
    const { markPassiveStoreSyncSuccess } = require(syncStatePath)
    await markPassiveStoreSyncSuccess('chef-1')

    assert.equal(upserts.length, 1)
    assert.equal(upserts[0].payload.chef_id, 'chef-1')
    assert.equal(upserts[0].payload.dirty, false)
    assert.equal(upserts[0].payload.last_error, null)
    assert.equal(typeof upserts[0].payload.last_synced_at, 'string')
  } finally {
    restoreAdmin()
    delete require.cache[syncStatePath]
  }
})

test('syncDirtyPassiveStores processes dirty chefs and preserves failures in counts', async () => {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const serverPath = require.resolve('../../lib/db/server.ts')
  const storePath = require.resolve('../../lib/passive-store/store.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const upserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = []
  const rows = [
    {
      chef_id: 'chef-ok',
      dirty: true,
      last_requested_at: '2026-04-24T10:00:00.000Z',
      updated_at: '2026-04-24T10:00:00.000Z',
    },
    {
      chef_id: 'chef-fail',
      dirty: true,
      last_requested_at: '2026-04-24T10:01:00.000Z',
      updated_at: '2026-04-24T10:01:00.000Z',
    },
  ]

  const restoreAdmin = installModule(adminPath, {
    createAdminClient: () => createSyncStateDb({ rows, upserts }),
  })
  const restoreServer = installModule(serverPath, {
    createServerClient: () => ({
      from(table: string) {
        if (table === 'chefs') {
          return {
            select() {
              return {
                eq(_column: string, value: string) {
                  return {
                    single() {
                      if (value === 'chef-fail') {
                        return Promise.resolve({ data: null, error: { message: 'not found' } })
                      }
                      return Promise.resolve({
                        data: {
                          id: value,
                          slug: value,
                          booking_slug: null,
                          display_name: 'Chef Test',
                          business_name: 'Test Kitchen',
                          profile_image_url: null,
                          booking_base_price_cents: 30000,
                          booking_pricing_type: 'flat_rate',
                          booking_deposit_type: 'percent',
                          booking_deposit_percent: 30,
                          booking_deposit_fixed_cents: null,
                        },
                        error: null,
                      })
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
                          return { limit: () => Promise.resolve({ data: [], error: null }) }
                        },
                      }
                    },
                  }
                },
              }
            },
          }
        }

        if (table === 'recipes' || table === 'events') {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        order() {
                          return { limit: () => Promise.resolve({ data: [], error: null }) }
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
            select() {
              return {
                eq() {
                  return Promise.resolve({ data: [], error: null })
                },
              }
            },
            upsert(productRows: Array<Record<string, unknown>>) {
              return {
                select() {
                  return Promise.resolve({
                    data: productRows.map((row, index) => ({
                      ...row,
                      product_id: `product-${index + 1}`,
                      created_at: '2026-04-24T10:00:00.000Z',
                      updated_at: '2026-04-24T10:00:00.000Z',
                    })),
                    error: null,
                  })
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
    }),
  })
  delete require.cache[syncStatePath]
  delete require.cache[storePath]

  try {
    const { syncDirtyPassiveStores } = require(syncStatePath)
    const result = await syncDirtyPassiveStores(25)

    assert.equal(result.scanned, 2)
    assert.equal(result.synced, 1)
    assert.equal(result.failed, 1)
    assert.equal(result.results[0].chefId, 'chef-ok')
    assert.equal(result.results[0].productCount, 3)
    assert.equal(result.errors[0].chefId, 'chef-fail')
    assert.equal(result.errors[0].error, 'Chef not found')
    assert.ok(
      upserts.some((entry) => entry.payload.chef_id === 'chef-ok' && entry.payload.dirty === false)
    )
    assert.ok(
      upserts.some((entry) => entry.payload.chef_id === 'chef-fail' && entry.payload.dirty === true)
    )
  } finally {
    restoreAdmin()
    restoreServer()
    delete require.cache[syncStatePath]
    delete require.cache[storePath]
  }
})
