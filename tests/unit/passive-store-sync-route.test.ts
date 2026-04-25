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

test('passive store scheduled sync route runs monitored dirty-store worker', async () => {
  const cronAuthPath = require.resolve('../../lib/auth/cron-auth.ts')
  const monitorPath = require.resolve('../../lib/cron/monitor.ts')
  const syncStatePath = require.resolve('../../lib/passive-store/sync-state.ts')
  const routePath = require.resolve('../../app/api/scheduled/passive-store-sync/route.ts')

  let cronName: string | null = null
  let requestedLimit: number | null = null

  const restoreCronAuth = installModule(cronAuthPath, {
    verifyCronAuth: () => null,
  })
  const restoreMonitor = installModule(monitorPath, {
    runMonitoredCronJob: async (name: string, job: () => Promise<unknown>) => {
      cronName = name
      return job()
    },
  })
  const restoreSyncState = installModule(syncStatePath, {
    syncDirtyPassiveStores: async (limit: number) => {
      requestedLimit = limit
      return {
        scanned: 2,
        synced: 1,
        failed: 1,
        results: [{ chefId: 'chef-1', productCount: 3 }],
        errors: [{ chefId: 'chef-2', error: 'boom' }],
      }
    },
  })
  delete require.cache[routePath]

  try {
    const { GET } = require(routePath)
    const response = await GET(
      new Request('http://localhost/api/scheduled/passive-store-sync', {
        headers: { authorization: 'Bearer test' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(cronName, 'passive-store-sync')
    assert.equal(requestedLimit, 25)
    assert.equal(body.ok, true)
    assert.equal(body.scanned, 2)
    assert.equal(body.synced, 1)
    assert.equal(body.failed, 1)
  } finally {
    restoreCronAuth()
    restoreMonitor()
    restoreSyncState()
    delete require.cache[routePath]
  }
})
