import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryContext = {
  table: string
  filters: Array<{ type: 'eq' | 'ilike'; column: string; value: unknown }>
}

class QueryBuilder implements PromiseLike<{ data: any; error: null }> {
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => { data: any; error: null }
  private readonly filters: QueryContext['filters'] = []

  constructor(table: string, resolve: (ctx: QueryContext) => { data: any; error: null }) {
    this.table = table
    this.resolve = resolve
  }

  select(_columns: string) {
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

  maybeSingle() {
    return this
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(
      this.resolve({
        table: this.table,
        filters: [...this.filters],
      })
    ).then(onfulfilled, onrejected)
  }
}

function getFilter(
  ctx: QueryContext,
  type: QueryContext['filters'][number]['type'],
  column: string
) {
  return ctx.filters.find((filter) => filter.type === type && filter.column === column)?.value
}

function loadRouteModule(clientRow: { id: string } | null) {
  const adminPath = require.resolve('../../lib/supabase/admin.ts')
  const chefLookupPath = require.resolve('../../lib/profile/public-chef.ts')
  const rateLimitPath = require.resolve('../../lib/rateLimit.ts')
  const routePath = require.resolve('../../app/api/public/client-lookup/route.ts')

  require(adminPath)
  require(chefLookupPath)
  require(rateLimitPath)

  const originalAdmin = require.cache[adminPath]!.exports
  const originalChefLookup = require.cache[chefLookupPath]!.exports
  const originalRateLimit = require.cache[rateLimitPath]!.exports
  const rateLimitCalls: string[] = []

  require.cache[adminPath]!.exports = {
    createAdminClient: () => ({
      from(table: string) {
        return new QueryBuilder(table, (ctx) => {
          assert.equal(ctx.table, 'clients')
          assert.equal(getFilter(ctx, 'eq', 'tenant_id'), 'chef-1')
          assert.equal(getFilter(ctx, 'ilike', 'email'), 'client@example.com')
          return { data: clientRow, error: null }
        })
      },
    }),
  }

  require.cache[chefLookupPath]!.exports = {
    findChefByPublicSlug: async () => ({ data: { id: 'chef-1' }, error: null }),
  }

  require.cache[rateLimitPath]!.exports = {
    checkRateLimit: async (key: string) => {
      rateLimitCalls.push(key)
    },
  }

  delete require.cache[routePath]
  const mod = require(routePath)

  const restore = () => {
    require.cache[adminPath]!.exports = originalAdmin
    require.cache[chefLookupPath]!.exports = originalChefLookup
    require.cache[rateLimitPath]!.exports = originalRateLimit
    delete require.cache[routePath]
  }

  return { mod, rateLimitCalls, restore }
}

test('public client lookup only returns existence and never returns prefill fields', async () => {
  const { mod, rateLimitCalls, restore } = loadRouteModule({ id: 'client-1' })

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/public/client-lookup', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
        body: JSON.stringify({ email: 'client@example.com', chefSlug: 'chef-demo' }),
      })
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { found: true })
    assert.equal(rateLimitCalls.length, 2)
    assert.ok(rateLimitCalls[0].startsWith('public-client-lookup:ip:'))
    assert.ok(
      rateLimitCalls[1].startsWith('public-client-lookup:email:chef-demo:client@example.com')
    )
  } finally {
    restore()
  }
})

test('public client lookup returns found=false when no matching client exists', async () => {
  const { mod, restore } = loadRouteModule(null)

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/public/client-lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'client@example.com', chefSlug: 'chef-demo' }),
      })
    )

    assert.deepEqual(await response.json(), { found: false })
  } finally {
    restore()
  }
})
