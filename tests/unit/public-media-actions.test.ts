import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryContext = {
  table: string
  payload: unknown
  filters: Array<{ column: string; value: unknown }>
}

class SupabaseQueryBuilder implements PromiseLike<{ error: { message: string } | null }> {
  private readonly table: string
  private readonly tracker: Tracker
  private payload: unknown = null
  private filters: Array<{ column: string; value: unknown }> = []

  constructor(table: string, tracker: Tracker) {
    this.table = table
    this.tracker = tracker
  }

  update(payload: unknown) {
    this.payload = payload
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  then<TResult1 = { error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute() {
    this.tracker.queries.push({
      table: this.table,
      payload: this.payload,
      filters: [...this.filters],
    })

    return {
      error: null,
    }
  }
}

type Tracker = {
  queries: QueryContext[]
  revalidatedPaths: string[]
  searchCalls: Array<{ query: string; options: Record<string, unknown> }>
  requireAdminCalls: number
}

function createMockSupabase(tracker: Tracker) {
  return {
    from(table: string) {
      return new SupabaseQueryBuilder(table, tracker)
    },
  }
}

function loadPublicMediaActionsWithMocks(tracker: Tracker) {
  const authPath = require.resolve('../../lib/auth/admin.ts')
  const cachePath = require.resolve('next/cache')
  const catalogPath = require.resolve('../../lib/public-assets/catalog.ts')
  const supabasePath = require.resolve('../../lib/supabase/admin.ts')
  const actionsPath = require.resolve('../../lib/admin/public-media-actions.ts')

  require(authPath)
  require(cachePath)
  require(catalogPath)
  require(supabasePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalCache = require.cache[cachePath]!.exports
  const originalCatalog = require.cache[catalogPath]!.exports
  const originalSupabase = require.cache[supabasePath]!.exports

  require.cache[authPath]!.exports = {
    requireAdmin: async () => {
      tracker.requireAdminCalls += 1
      return { id: 'admin-user-1' }
    },
  }
  require.cache[cachePath]!.exports = {
    revalidatePath: (path: string) => tracker.revalidatedPaths.push(path),
  }
  require.cache[catalogPath]!.exports = {
    searchPublicMediaAssets: async (query: string, options: Record<string, unknown>) => {
      tracker.searchCalls.push({ query, options })
      return []
    },
  }
  require.cache[supabasePath]!.exports = {
    createAdminClient: () => createMockSupabase(tracker),
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[cachePath]!.exports = originalCache
    require.cache[catalogPath]!.exports = originalCatalog
    require.cache[supabasePath]!.exports = originalSupabase
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

function buildFormData(values: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }
  return formData
}

test('setPublicMediaAssetApproval rejects invalid approval statuses before update', async () => {
  const tracker: Tracker = {
    queries: [],
    revalidatedPaths: [],
    searchCalls: [],
    requireAdminCalls: 0,
  }
  const { actions, restore } = loadPublicMediaActionsWithMocks(tracker)

  try {
    await assert.rejects(
      async () =>
        actions.setPublicMediaAssetApproval(
          buildFormData({
            assetId: 'asset-1',
            approvalStatus: 'maybe',
          })
        ),
      /Invalid approval status/
    )

    assert.equal(tracker.queries.length, 0)
    assert.equal(tracker.revalidatedPaths.length, 0)
  } finally {
    restore()
  }
})

test('setPublicMediaAssetApproval updates the asset and revalidates the admin page', async () => {
  const tracker: Tracker = {
    queries: [],
    revalidatedPaths: [],
    searchCalls: [],
    requireAdminCalls: 0,
  }
  const { actions, restore } = loadPublicMediaActionsWithMocks(tracker)

  try {
    await actions.setPublicMediaAssetApproval(
      buildFormData({
        assetId: 'asset-1',
        approvalStatus: 'approved',
      })
    )

    assert.equal(tracker.requireAdminCalls, 1)
    assert.equal(tracker.queries.length, 1)
    assert.deepEqual(tracker.queries[0], {
      table: 'public_media_assets',
      payload: { approval_status: 'approved' },
      filters: [{ column: 'id', value: 'asset-1' }],
    })
    assert.deepEqual(tracker.revalidatedPaths, ['/admin/system/public-data'])
  } finally {
    restore()
  }
})

test('refreshPublicMediaAssetQuery forces a refresh and revalidates the admin page', async () => {
  const tracker: Tracker = {
    queries: [],
    revalidatedPaths: [],
    searchCalls: [],
    requireAdminCalls: 0,
  }
  const { actions, restore } = loadPublicMediaActionsWithMocks(tracker)

  try {
    await actions.refreshPublicMediaAssetQuery(
      buildFormData({
        query: 'tomato soup',
      })
    )

    assert.equal(tracker.requireAdminCalls, 1)
    assert.deepEqual(tracker.searchCalls, [
      {
        query: 'tomato soup',
        options: {
          forceRefresh: true,
          limit: 6,
        },
      },
    ])
    assert.deepEqual(tracker.revalidatedPaths, ['/admin/system/public-data'])
  } finally {
    restore()
  }
})
