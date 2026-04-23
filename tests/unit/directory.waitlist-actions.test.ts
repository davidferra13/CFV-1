import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const ACTIONS_PATH = require.resolve('../../lib/directory/waitlist-actions.ts')
const DB_ADMIN_PATH = require.resolve('../../lib/db/admin.ts')
const EMAIL_PATH = require.resolve('../../lib/email/send.ts')

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

function loadWaitlistActions(db: any) {
  const originals = {
    actions: require.cache[ACTIONS_PATH],
    dbAdmin: require.cache[DB_ADMIN_PATH],
    email: require.cache[EMAIL_PATH],
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

  delete require.cache[ACTIONS_PATH]
  const mod = require(ACTIONS_PATH)

  const restore = () => {
    restoreModule(ACTIONS_PATH, originals.actions)
    restoreModule(DB_ADMIN_PATH, originals.dbAdmin)
    restoreModule(EMAIL_PATH, originals.email)
  }

  return { mod, restore }
}

test('submitNearbyUnmetDemand normalizes and persists structured nearby requests', async () => {
  const calls: Array<{ payload: any; options: any }> = []
  const db = {
    from(table: string) {
      assert.equal(table, 'directory_waitlist')
      return {
        upsert: async (payload: any, options: any) => {
          calls.push({ payload, options })
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
      cuisine: 'thai',
      notes: ' Need weekday family-style pickup ',
      source: mod.NEARBY_NO_RESULTS_WAITLIST_SOURCE,
    })

    assert.equal(result.success, true)
    assert.equal(result.location, 'Austin, TX')
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].options, { onConflict: 'lower(email), lower(location)' })
    assert.equal(calls[0].payload.email, 'visitor@example.com')
    assert.equal(calls[0].payload.location, 'Austin, TX')
    assert.equal(calls[0].payload.city, 'Austin')
    assert.equal(calls[0].payload.state, 'TX')
    assert.equal(calls[0].payload.business_type, 'caterer')
    assert.equal(calls[0].payload.cuisine, 'thai')
    assert.equal(calls[0].payload.notes, 'Need weekday family-style pickup')
    assert.equal(calls[0].payload.source, mod.NEARBY_NO_RESULTS_WAITLIST_SOURCE)
    assert.equal(calls[0].payload.notified_at, null)
  } finally {
    restore()
  }
})

test('submitNearbyUnmetDemand rejects invalid state and skips persistence', async () => {
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
      source: mod.NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
    })

    assert.equal(result.success, false)
    assert.equal(result.error, 'Select a valid state.')
    assert.equal(upsertCount, 0)
  } finally {
    restore()
  }
})

test('isDirectoryWaitlistSweepEligible excludes nearby unmet-demand rows', async () => {
  const db = {
    from() {
      throw new Error('DB should not be used in this test')
    },
  }

  const { mod, restore } = loadWaitlistActions(db)

  try {
    assert.equal(mod.isDirectoryWaitlistSweepEligible(null), true)
    assert.equal(mod.isDirectoryWaitlistSweepEligible(mod.DEFAULT_DIRECTORY_WAITLIST_SOURCE), true)
    assert.equal(mod.isDirectoryWaitlistSweepEligible(mod.NEARBY_LOW_DENSITY_WAITLIST_SOURCE), false)
    assert.equal(mod.isDirectoryWaitlistSweepEligible(mod.NEARBY_NO_RESULTS_WAITLIST_SOURCE), false)
  } finally {
    restore()
  }
})
