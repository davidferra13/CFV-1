import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  __resetOwnerIdentityCacheForTests,
  resolveOwnerIdentity,
  resolveOwnerChefId,
} from '@/lib/platform/owner-account'

type MockConfig = {
  founderChefId: string | null
  ownerAuthUserId: string | null
}

function createDbMock(config: MockConfig) {
  const calls = {
    chefLookup: 0,
    roleLookup: 0,
  }

  const db = {
    from(table: string) {
      const filters: Record<string, string> = {}
      const ilikeFilters: Record<string, string> = {}

      return {
        select() {
          return this
        },
        ilike(column: string, value: string) {
          ilikeFilters[column] = value
          return this
        },
        eq(column: string, value: string) {
          filters[column] = value
          return this
        },
        async maybeSingle() {
          if (table === 'chefs') {
            calls.chefLookup += 1
            if (ilikeFilters.email === 'davidferra13@gmail.com' && config.founderChefId) {
              return { data: { id: config.founderChefId }, error: null }
            }
            return { data: null, error: null }
          }

          if (table === 'user_roles') {
            calls.roleLookup += 1
            if (
              filters.role === 'chef' &&
              filters.entity_id === config.founderChefId &&
              config.ownerAuthUserId
            ) {
              return { data: { auth_user_id: config.ownerAuthUserId }, error: null }
            }
            return { data: null, error: null }
          }

          return { data: null, error: null }
        },
      }
    },
  }

  return { db, calls }
}

const originalOwnerChefEnv = process.env.PLATFORM_OWNER_CHEF_ID

describe('owner-account resolver', () => {
  beforeEach(() => {
    __resetOwnerIdentityCacheForTests()
    delete process.env.PLATFORM_OWNER_CHEF_ID
  })

  afterEach(() => {
    __resetOwnerIdentityCacheForTests()
    if (originalOwnerChefEnv) process.env.PLATFORM_OWNER_CHEF_ID = originalOwnerChefEnv
    else delete process.env.PLATFORM_OWNER_CHEF_ID
  })

  it('resolves founder chef and auth user IDs from canonical founder email', async () => {
    const { db } = createDbMock({
      founderChefId: 'chef-founder-123',
      ownerAuthUserId: 'auth-founder-123',
    })

    const identity = await resolveOwnerIdentity(db)

    assert.equal(identity.ownerChefId, 'chef-founder-123')
    assert.equal(identity.ownerAuthUserId, 'auth-founder-123')
    assert.deepEqual(identity.warnings, [])
  })

  it('ignores mismatched env owner ID and emits warning', async () => {
    process.env.PLATFORM_OWNER_CHEF_ID = 'legacy-mismatched-id'
    const { db } = createDbMock({
      founderChefId: 'chef-founder-xyz',
      ownerAuthUserId: 'auth-founder-xyz',
    })

    const identity = await resolveOwnerIdentity(db)

    assert.equal(identity.ownerChefId, 'chef-founder-xyz')
    assert.ok(identity.warnings.includes('owner_env_mismatch_ignored'))
  })

  it('uses resolver cache for repeated owner lookups', async () => {
    const { db, calls } = createDbMock({
      founderChefId: 'chef-cache-1',
      ownerAuthUserId: 'auth-cache-1',
    })

    const first = await resolveOwnerChefId(db)
    const second = await resolveOwnerChefId(db)

    assert.equal(first, 'chef-cache-1')
    assert.equal(second, 'chef-cache-1')
    assert.equal(calls.chefLookup, 1)
    assert.equal(calls.roleLookup, 1)
  })
})
