import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

class QueryBuilder implements PromiseLike<{ data: any; error: null }> {
  select(_columns?: string) {
    return this
  }

  in(_column: string, _value: unknown[]) {
    return this
  }

  not(_column: string, _operator: string, _value: unknown) {
    return this
  }

  eq(_column: string, _value: unknown) {
    return Promise.resolve({ data: [], error: null })
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected)
  }
}

function loadSitemapModule(
  ingredientSlugs: Array<{ slug: string; enrichedAt: string }>,
  ingredientCategories: Array<{ category: string; label: string; count: number }> = []
) {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const ingredientQueriesPath =
    require.resolve('../../lib/openclaw/ingredient-knowledge-queries.ts')
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
      from(_table: string) {
        return new QueryBuilder()
      },
    }),
  }

  require.cache[ingredientQueriesPath]!.exports = {
    ...originalIngredientQueries,
    getEnrichedIngredientSlugs: async () => ingredientSlugs,
    getIngredientCategories: async () => ingredientCategories,
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

test('ingredient sitemap excludes obvious non-food slugs like duck-tape', async () => {
  const { mod, restore } = loadSitemapModule([
    { slug: 'olive-oil', enrichedAt: '2026-04-20T00:00:00.000Z' },
    { slug: 'duck-tape', enrichedAt: '2026-04-20T00:00:00.000Z' },
    { slug: 'duck-duct-tape', enrichedAt: '2026-04-20T00:00:00.000Z' },
  ])

  try {
    const routes = await mod.default()
    const urls = routes.map((route: { url: string }) => route.url)

    assert.ok(urls.some((url: string) => url.endsWith('/ingredient/olive-oil')))
    assert.ok(!urls.some((url: string) => url.endsWith('/ingredient/duck-tape')))
    assert.ok(!urls.some((url: string) => url.endsWith('/ingredient/duck-duct-tape')))
  } finally {
    restore()
  }
})
