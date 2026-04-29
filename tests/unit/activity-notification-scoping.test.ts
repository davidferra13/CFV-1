import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryCall = {
  table: string
  op: 'select' | 'eq' | 'gte' | 'limit' | 'single' | 'maybeSingle'
  column?: string
  value?: unknown
}

class ActivityNotificationQueryBuilder {
  private table: string
  private calls: QueryCall[]

  constructor(table: string, calls: QueryCall[]) {
    this.table = table
    this.calls = calls
  }

  select() {
    this.calls.push({ table: this.table, op: 'select' })
    return this
  }

  eq(column: string, value: unknown) {
    this.calls.push({ table: this.table, op: 'eq', column, value })
    return this
  }

  gte(column: string, value: unknown) {
    this.calls.push({ table: this.table, op: 'gte', column, value })
    return this
  }

  limit(value: number) {
    this.calls.push({ table: this.table, op: 'limit', value })
    return this
  }

  maybeSingle() {
    this.calls.push({ table: this.table, op: 'maybeSingle' })

    if (this.table === 'user_roles') {
      return Promise.resolve({ data: { auth_user_id: 'chef-auth-1' }, error: null })
    }

    if (this.table === 'clients') {
      return Promise.resolve({ data: { full_name: 'Taylor Brooks' }, error: null })
    }

    if (this.table === 'quotes') {
      return Promise.resolve({
        data: {
          sent_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          quote_name: 'Spring dinner',
        },
        error: null,
      })
    }

    if (this.table === 'notifications') {
      return Promise.resolve({ data: null, error: null })
    }

    if (this.table === 'chef_preferences') {
      return Promise.resolve({ data: { visitor_alerts_enabled: true }, error: null })
    }

    return Promise.resolve({ data: null, error: null })
  }

  single() {
    this.calls.push({ table: this.table, op: 'single' })

    if (this.table === 'chefs') {
      return Promise.resolve({ data: { auth_user_id: 'chef-auth-1' }, error: null })
    }

    if (this.table === 'clients') {
      return Promise.resolve({ data: { full_name: 'Taylor Brooks' }, error: null })
    }

    return Promise.resolve({ data: null, error: null })
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected)
  }
}

function createActivityNotificationDb(calls: QueryCall[]) {
  return {
    from(table: string) {
      return new ActivityNotificationQueryBuilder(table, calls)
    },
  }
}

function hasEq(calls: QueryCall[], table: string, column: string, value: unknown) {
  return calls.some(
    (call) =>
      call.table === table && call.op === 'eq' && call.column === column && call.value === value
  )
}

function loadModuleWithMocks<T>(
  modulePath: string,
  mocks: Record<string, Record<string, unknown>>,
  readExport: (exports: Record<string, T>) => T
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const resolvedModulePath = require.resolve(modulePath)
  const originals = Object.entries(mocks).map(([path, exports]) => {
    const resolvedPath = require.resolve(path)
    require(resolvedPath)
    const originalExports = require.cache[resolvedPath]!.exports
    require.cache[resolvedPath]!.exports = exports
    return { resolvedPath, originalExports }
  })

  delete require.cache[resolvedModulePath]
  const loaded = readExport(require(resolvedModulePath))

  const restore = () => {
    for (const original of originals) {
      require.cache[original.resolvedPath]!.exports = original.originalExports
    }
    delete require.cache[resolvedModulePath]
  }

  return { loaded, restore }
}

test('intent notification admin reads stay tenant scoped', async () => {
  const calls: QueryCall[] = []
  const notifications: unknown[] = []
  const { loaded: checkAndFireIntentNotifications, restore } = loadModuleWithMocks(
    '../../lib/activity/intent-notifications.ts',
    {
      '../../lib/db/server.ts': {
        createServerClient: () => createActivityNotificationDb(calls),
      },
      '../../lib/notifications/actions.ts': {
        createNotification: async (payload: unknown) => {
          notifications.push(payload)
          return payload
        },
      },
    },
    (exports) => exports.checkAndFireIntentNotifications
  )

  try {
    await checkAndFireIntentNotifications({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      eventType: 'quote_viewed',
      entityId: 'quote-1',
      metadata: {},
    })
  } finally {
    restore()
  }

  assert.equal(notifications.length, 1)
  assert.equal((notifications[0] as { actionUrl?: string }).actionUrl, '/quotes/quote-1')
  assert.equal(hasEq(calls, 'user_roles', 'entity_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'notifications', 'tenant_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'clients', 'tenant_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'quotes', 'tenant_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'quotes', 'client_id', 'client-1'), true)
})

test('visitor alert admin reads stay tenant scoped and title stays ASCII', async () => {
  const calls: QueryCall[] = []
  const sent: Array<{ title: string }> = []
  const { loaded: triggerVisitorAlert, restore } = loadModuleWithMocks(
    '../../lib/activity/visitor-alert.ts',
    {
      '../../lib/db/server.ts': {
        createServerClient: () => createActivityNotificationDb(calls),
      },
      '../../lib/notifications/send.ts': {
        sendNotification: async (payload: { title: string }) => {
          sent.push(payload)
        },
      },
    },
    (exports) => exports.triggerVisitorAlert
  )

  try {
    await triggerVisitorAlert({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      clientName: 'A client',
      eventType: 'payment_page_visited',
    })
  } finally {
    restore()
  }

  assert.equal(sent.length, 1)
  assert.equal(hasEq(calls, 'notifications', 'tenant_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'chef_preferences', 'chef_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'chef_preferences', 'tenant_id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'chefs', 'id', 'tenant-1'), true)
  assert.equal(hasEq(calls, 'clients', 'tenant_id', 'tenant-1'), true)
  assert.equal(/[^\x00-\x7F]/.test(sent[0].title), false)
  assert.equal(sent[0].title, 'High intent: Taylor Brooks is viewing the payment page')
})
