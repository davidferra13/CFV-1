import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

class QueryBuilder implements PromiseLike<{ data: any; error: null }> {
  constructor(
    private readonly table: string,
    private readonly fixtures: Record<string, any[]>
  ) {}

  select(_columns?: string) {
    return this
  }

  not(_column: string, _operator: string, _value: unknown) {
    return this
  }

  eq(_column: string, _value: unknown) {
    return this
  }

  in(_column: string, _value: unknown[]) {
    return this
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.fixtures[this.table] ?? [], error: null }).then(
      onfulfilled,
      onrejected
    )
  }
}

function loadSitemapModule(directoryListings: any[]) {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const ingredientQueriesPath = require.resolve('../../lib/openclaw/ingredient-knowledge-queries.ts')
  const comparePagesPath = require.resolve('../../lib/marketing/compare-pages.ts')
  const sitemapPath = require.resolve('../../app/sitemap.ts')

  require(adminPath)
  require(ingredientQueriesPath)
  require(comparePagesPath)

  const originalAdmin = require.cache[adminPath]!.exports
  const originalIngredientQueries = require.cache[ingredientQueriesPath]!.exports
  const originalComparePages = require.cache[comparePagesPath]!.exports

  require.cache[adminPath]!.exports = {
    createAdminClient: () => ({
      from(table: string) {
        return new QueryBuilder(table, {
          chefs: [],
          directory_listings: directoryListings,
        })
      },
    }),
  }

  require.cache[ingredientQueriesPath]!.exports = {
    ...originalIngredientQueries,
    getEnrichedIngredientSlugs: async () => [],
    getIngredientCategories: async () => [],
  }

  require.cache[comparePagesPath]!.exports = {
    COMPARE_PAGES: [],
  }

  delete require.cache[sitemapPath]
  const mod = require(sitemapPath)

  const restore = () => {
    require.cache[adminPath]!.exports = originalAdmin
    require.cache[ingredientQueriesPath]!.exports = originalIngredientQueries
    require.cache[comparePagesPath]!.exports = originalComparePages
    delete require.cache[sitemapPath]
  }

  return { mod, restore }
}

test('nearby sitemap includes only detail pages that pass the indexing threshold', async () => {
  const { mod, restore } = loadSitemapModule([
    {
      slug: 'verified-ready',
      status: 'verified',
      claimed_at: '2026-04-10T00:00:00.000Z',
      updated_at: '2026-04-18T00:00:00.000Z',
      city: 'Boston',
      state: 'MA',
      address: '123 Main St',
      phone: '555-123-4567',
      email: null,
      website_url: 'https://example.com',
      description: null,
      hours: { Monday: '9 AM - 5 PM' },
      photo_urls: [],
      menu_url: null,
      price_range: null,
    },
    {
      slug: 'claimed-ready',
      status: 'claimed',
      claimed_at: '2026-04-10T00:00:00.000Z',
      updated_at: '2026-04-18T00:00:00.000Z',
      city: 'Boston',
      state: 'MA',
      address: '456 Main St',
      phone: null,
      email: null,
      website_url: 'https://claimed.example.com',
      description: 'Seasonal seafood and pasta in a small dining room.',
      hours: { Monday: '9 AM - 5 PM' },
      photo_urls: ['https://example.com/photo.jpg'],
      menu_url: 'https://claimed.example.com/menu',
      price_range: '$$',
    },
    {
      slug: 'claimed-stale',
      status: 'claimed',
      claimed_at: '2025-09-10T00:00:00.000Z',
      updated_at: '2025-09-10T00:00:00.000Z',
      city: 'Boston',
      state: 'MA',
      address: '789 Main St',
      phone: '555-000-9999',
      email: null,
      website_url: 'https://stale.example.com',
      description: 'Still looks filled out, but the owner has not updated it recently.',
      hours: { Monday: '9 AM - 5 PM' },
      photo_urls: ['https://example.com/photo.jpg'],
      menu_url: 'https://stale.example.com/menu',
      price_range: '$$',
    },
  ])

  try {
    const routes = await mod.default()
    const urls = routes.map((route: { url: string }) => route.url)

    assert.ok(urls.some((url: string) => url.endsWith('/nearby/collections')))
    assert.ok(
      urls.some((url: string) => url.endsWith('/nearby/collections/best-bakeries-boston'))
    )
    assert.ok(urls.some((url: string) => url.endsWith('/nearby/verified-ready')))
    assert.ok(urls.some((url: string) => url.endsWith('/nearby/claimed-ready')))
    assert.ok(!urls.some((url: string) => url.endsWith('/nearby/claimed-stale')))
  } finally {
    restore()
  }
})
