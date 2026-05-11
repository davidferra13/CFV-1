import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const ACTIONS_PATH = require.resolve('../../lib/directory/waitlist-actions.ts')
const WAITLIST_SHARED_PATH = require.resolve('../../lib/directory/waitlist-shared.ts')
const DB_ADMIN_PATH = require.resolve('../../lib/db/admin.ts')
const EMAIL_PATH = require.resolve('../../lib/email/send.ts')
const RATE_LIMIT_PATH = require.resolve('../../lib/rateLimit.ts')
const NEXT_HEADERS_PATH = require.resolve('next/headers')

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

function loadWaitlistActions(db: any) {
  const originals = {
    actions: require.cache[ACTIONS_PATH],
    dbAdmin: require.cache[DB_ADMIN_PATH],
    email: require.cache[EMAIL_PATH],
    rateLimit: require.cache[RATE_LIMIT_PATH],
    nextHeaders: require.cache[NEXT_HEADERS_PATH],
  }

  require.cache[DB_ADMIN_PATH] = {
    id: DB_ADMIN_PATH,
    filename: DB_ADMIN_PATH,
    loaded: true,
    exports: {
      createAdminClient: () => db,
    },
  } as NodeJS.Module

  require.cache[EMAIL_PATH] = {
    id: EMAIL_PATH,
    filename: EMAIL_PATH,
    loaded: true,
    exports: {
      sendEmail: async () => {},
    },
  } as NodeJS.Module

  require.cache[RATE_LIMIT_PATH] = {
    id: RATE_LIMIT_PATH,
    filename: RATE_LIMIT_PATH,
    loaded: true,
    exports: {
      checkRateLimit: async () => {},
    },
  } as NodeJS.Module

  require.cache[NEXT_HEADERS_PATH] = {
    id: NEXT_HEADERS_PATH,
    filename: NEXT_HEADERS_PATH,
    loaded: true,
    exports: {
      headers: async () => ({
        get: (name: string) => (name === 'x-forwarded-for' ? '127.0.0.1' : null),
      }),
    },
  } as NodeJS.Module

  delete require.cache[ACTIONS_PATH]
  const mod = require(ACTIONS_PATH)

  const restore = () => {
    restoreModule(ACTIONS_PATH, originals.actions)
    restoreModule(DB_ADMIN_PATH, originals.dbAdmin)
    restoreModule(EMAIL_PATH, originals.email)
    restoreModule(RATE_LIMIT_PATH, originals.rateLimit)
    restoreModule(NEXT_HEADERS_PATH, originals.nextHeaders)
  }

  return { mod, restore }
}

test('submitNearbyUnmetDemand normalizes and persists structured nearby requests', async () => {
  const shared = require(WAITLIST_SHARED_PATH)
  const inserts: any[] = []
  const preferenceUpserts: any[] = []
  const db = {
    from(table: string) {
      if (table === 'directory_email_preferences') {
        return {
          upsert: async (payload: any) => {
            preferenceUpserts.push(payload)
            return { error: null }
          },
        }
      }

      assert.equal(table, 'directory_waitlist')
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        insert: async (payload: any) => {
          inserts.push(payload)
          return { error: null }
        },
      }
    },
  }

  const { mod, restore } = loadWaitlistActions(db)

  try {
    const result = await mod.submitNearbyUnmetDemand({
      email: '  Visitor@Example.com ',
      city: ' Austin ',
      state: 'texas',
      businessType: 'caterer',
      cuisine: 'Thai',
      source: shared.NEARBY_NO_RESULTS_WAITLIST_SOURCE,
    })

    assert.equal(result.success, true)
    assert.equal(result.summaryLabel, 'Caterer | Thai | Austin, TX')
    assert.equal(inserts.length, 1)
    assert.equal(inserts[0].email, 'visitor@example.com')
    assert.equal(inserts[0].location, 'Austin, TX')
    assert.equal(inserts[0].city, 'Austin')
    assert.equal(inserts[0].state, 'TX')
    assert.equal(inserts[0].business_type, 'caterer')
    assert.equal(inserts[0].cuisine, 'thai')
    assert.equal(inserts[0].source, shared.NEARBY_NO_RESULTS_WAITLIST_SOURCE)
    assert.equal(inserts[0].notified_at, null)
    assert.equal(typeof inserts[0].saved_search_key, 'string')
    assert.equal(preferenceUpserts.length, 1)
  } finally {
    restore()
  }
})

test('submitNearbyUnmetDemand rejects invalid state and skips persistence', async () => {
  const shared = require(WAITLIST_SHARED_PATH)
  let upsertCount = 0
  const db = {
    from() {
      return {
        upsert: async () => {
          upsertCount += 1
          return { error: null }
        },
      }
    },
  }

  const { mod, restore } = loadWaitlistActions(db)

  try {
    const result = await mod.submitNearbyUnmetDemand({
      email: 'visitor@example.com',
      city: 'Austin',
      state: 'Atlantis',
      businessType: 'caterer',
      source: shared.NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
    })

    assert.equal(result.success, false)
    assert.equal(result.error, 'Select a valid state or clear the location filter.')
    assert.equal(upsertCount, 0)
  } finally {
    restore()
  }
})

test('isDirectoryWaitlistSweepEligible excludes nearby unmet-demand rows', async () => {
  const shared = require(WAITLIST_SHARED_PATH)

  assert.equal(shared.isDirectoryWaitlistSweepEligible(null), true)
  assert.equal(
    shared.isDirectoryWaitlistSweepEligible(shared.DEFAULT_DIRECTORY_WAITLIST_SOURCE),
    true
  )
  assert.equal(
    shared.isDirectoryWaitlistSweepEligible(shared.NEARBY_LOW_DENSITY_WAITLIST_SOURCE),
    false
  )
  assert.equal(
    shared.isDirectoryWaitlistSweepEligible(shared.NEARBY_NO_RESULTS_WAITLIST_SOURCE),
    false
  )
})
