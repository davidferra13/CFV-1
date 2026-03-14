import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryContext = {
  table: string
  selectColumns: string
  selectOptions: Record<string, unknown> | undefined
  filters: Array<{ type: 'eq' | 'lt' | 'not' | 'in' | 'is'; column: string; value: unknown }>
  orderBy: { column: string; ascending: boolean } | null
  limitValue: number | null
}

class SupabaseQueryBuilder
  implements PromiseLike<{ data: any; error: { message: string } | null; count?: number | null }>
{
  private readonly table: string
  private readonly resolve: (
    ctx: QueryContext
  ) => { data: any; error: { message: string } | null; count?: number | null }
  private selectColumns = '*'
  private selectOptions: Record<string, unknown> | undefined
  private filters: QueryContext['filters'] = []
  private orderBy: QueryContext['orderBy'] = null
  private limitValue: number | null = null

  constructor(
    table: string,
    resolve: (
      ctx: QueryContext
    ) => { data: any; error: { message: string } | null; count?: number | null }
  ) {
    this.table = table
    this.resolve = resolve
  }

  select(columns = '*', options?: Record<string, unknown>) {
    this.selectColumns = columns
    this.selectOptions = options
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  lt(column: string, value: unknown) {
    this.filters.push({ type: 'lt', column, value })
    return this
  }

  not(column: string, _operator: string, value: unknown) {
    this.filters.push({ type: 'not', column, value })
    return this
  }

  in(column: string, value: unknown) {
    this.filters.push({ type: 'in', column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ type: 'is', column, value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(value: number) {
    this.limitValue = value
    return this
  }

  then<
    TResult1 = { data: any; error: { message: string } | null; count?: number | null },
    TResult2 = never,
  >(
    onfulfilled?:
      | ((
          value: { data: any; error: { message: string } | null; count?: number | null }
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute() {
    return this.resolve({
      table: this.table,
      selectColumns: this.selectColumns,
      selectOptions: this.selectOptions,
      filters: [...this.filters],
      orderBy: this.orderBy,
      limitValue: this.limitValue,
    })
  }
}

function getFilter(ctx: QueryContext, type: QueryContext['filters'][number]['type'], column: string) {
  return ctx.filters.find((filter) => filter.type === type && filter.column === column)?.value
}

function loadAdminPublicDataModule(
  resolve: (
    ctx: QueryContext
  ) => { data: any; error: { message: string } | null; count?: number | null }
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const adminPath = require.resolve('../../lib/supabase/admin.ts')
  const mediaPath = require.resolve('../../lib/commerce/product-media.ts')
  const modulePath = require.resolve('../../lib/admin/public-data.ts')

  require(adminPath)
  require(mediaPath)

  const originalAdmin = require.cache[adminPath]!.exports
  const originalMedia = require.cache[mediaPath]!.exports

  require.cache[adminPath]!.exports = {
    createAdminClient: () => ({
      from(table: string) {
        return new SupabaseQueryBuilder(table, resolve)
      },
    }),
  }

  require.cache[mediaPath]!.exports = {
    ...originalMedia,
    isMissingProductPublicMediaLinkTableError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error ?? '')
      return message.includes('product_public_media_links')
    },
  }

  delete require.cache[modulePath]
  const mod = require(modulePath)

  const restore = () => {
    require.cache[adminPath]!.exports = originalAdmin
    require.cache[mediaPath]!.exports = originalMedia
    delete require.cache[modulePath]
  }

  return { mod, restore }
}

test('getPublicDataHealthStats counts only approved linked media toward product image coverage', async () => {
  const { mod, restore } = loadAdminPublicDataModule((ctx) => {
    const isHeadCount = ctx.selectOptions?.head === true

    if (ctx.table === 'product_projections' && getFilter(ctx, 'not', 'image_url') === null) {
      return {
        data: [{ id: 'product-direct' }, { id: 'product-approved-link' }],
        error: null,
      }
    }

    if (ctx.table === 'product_public_media_links' && ctx.selectColumns === 'product_id, public_media_asset_id') {
      return {
        data: [
          { product_id: 'product-approved-link', public_media_asset_id: 'asset-approved' },
          { product_id: 'product-rejected-link', public_media_asset_id: 'asset-rejected' },
        ],
        error: null,
      }
    }

    if (
      ctx.table === 'public_media_assets' &&
      ctx.selectColumns === 'id' &&
      getFilter(ctx, 'eq', 'approval_status') === 'approved' &&
      Array.isArray(getFilter(ctx, 'in', 'id'))
    ) {
      return {
        data: [{ id: 'asset-approved' }],
        error: null,
      }
    }

    if (ctx.table === 'public_data_source_logs' && ctx.limitValue === 50) {
      return { data: [], error: null }
    }

    if (
      ctx.table === 'public_media_assets' &&
      ctx.selectColumns.includes('search_query') &&
      ctx.limitValue === 20
    ) {
      return { data: [], error: null }
    }

    if (!isHeadCount) {
      throw new Error(`Unexpected query: ${ctx.table}:${ctx.selectColumns}`)
    }

    const countByTable = new Map<string, number>([
      ['public_ingredient_references', 10],
      ['public_product_references', 8],
      ['public_location_references', 6],
      ['public_weather_risk_snapshots', 4],
      ['public_food_recall_snapshots', 2],
      ['public_media_assets', getFilter(ctx, 'eq', 'approval_status') === 'pending' ? 3 : 1],
      ['ingredients:not', 7],
      ['ingredients:is', 2],
      ['product_projections:barcode', 9],
    ])

    if (ctx.table === 'ingredients' && getFilter(ctx, 'not', 'nutrition_source') === null) {
      return { data: null, error: null, count: countByTable.get('ingredients:not') ?? 0 }
    }

    if (ctx.table === 'ingredients' && getFilter(ctx, 'is', 'nutrition_source') === null) {
      return { data: null, error: null, count: countByTable.get('ingredients:is') ?? 0 }
    }

    if (ctx.table === 'product_projections' && getFilter(ctx, 'not', 'barcode') === null) {
      return { data: null, error: null, count: countByTable.get('product_projections:barcode') ?? 0 }
    }

    return {
      data: null,
      error: null,
      count: countByTable.get(ctx.table) ?? 0,
    }
  })

  try {
    const stats = await mod.getPublicDataHealthStats()

    assert.equal(stats.productsWithImageCount, 2)
    assert.equal(stats.approvedMediaAssetCount, 1)
    assert.equal(stats.pendingMediaAssetCount, 3)
  } finally {
    restore()
  }
})
