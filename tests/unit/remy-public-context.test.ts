import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('loadRemyPublicContext queries culinary profiles by chef_id', async () => {
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const serviceInternalPath = require.resolve('../../lib/chef-services/service-config-internal.ts')
  const serviceActionsPath = require.resolve('../../lib/chef-services/service-config-actions.ts')
  const contextPath = require.resolve('../../lib/ai/remy-public-context.ts')

  const originalAdmin = require.cache[adminPath]
  const originalServiceInternal = require.cache[serviceInternalPath]
  const originalServiceActions = require.cache[serviceActionsPath]
  const originalContext = require.cache[contextPath]

  const eqCalls: Array<{ table: string; column: string; value: string }> = []

  require.cache[adminPath] = {
    exports: {
      createAdminClient: () => ({
        from(table: string) {
          return {
            select() {
              return {
                eq(column: string, value: string) {
                  eqCalls.push({ table, column, value })

                  if (table === 'chefs') {
                    return {
                      single: async () => ({
                        data: {
                          display_name: 'Chef Test',
                          business_name: 'Test Kitchen',
                          tagline: null,
                          bio: null,
                        },
                      }),
                    }
                  }

                  if (table === 'chef_directory_listings') {
                    return {
                      maybeSingle: async () => ({ data: null }),
                    }
                  }

                  if (table === 'chef_culinary_profiles') {
                    return Promise.resolve({
                      data: [
                        {
                          question_key: 'cooking_philosophy',
                          answer: 'Seasonal and ingredient-led.',
                        },
                      ],
                    })
                  }

                  throw new Error(`unexpected table ${table}`)
                },
              }
            },
          }
        },
      }),
    },
  } as NodeJS.Module

  require.cache[serviceInternalPath] = {
    exports: {
      getServiceConfigForTenant: async () => null,
    },
  } as NodeJS.Module

  require.cache[serviceActionsPath] = {
    exports: {
      formatServiceConfigForPrompt: async () => '',
    },
  } as NodeJS.Module

  delete require.cache[contextPath]

  try {
    const { loadRemyPublicContext } = require(contextPath)
    const context = await loadRemyPublicContext('chef-123')

    assert.ok(context.culinaryProfile?.includes('cooking philosophy'))
    assert.ok(
      eqCalls.some(
        (call) =>
          call.table === 'chef_culinary_profiles' &&
          call.column === 'chef_id' &&
          call.value === 'chef-123'
      )
    )
    assert.equal(
      eqCalls.some(
        (call) => call.table === 'chef_culinary_profiles' && call.column === 'tenant_id'
      ),
      false
    )
  } finally {
    if (originalAdmin) require.cache[adminPath] = originalAdmin
    else delete require.cache[adminPath]

    if (originalServiceInternal) require.cache[serviceInternalPath] = originalServiceInternal
    else delete require.cache[serviceInternalPath]

    if (originalServiceActions) require.cache[serviceActionsPath] = originalServiceActions
    else delete require.cache[serviceActionsPath]

    if (originalContext) require.cache[contextPath] = originalContext
    else delete require.cache[contextPath]
  }
})
