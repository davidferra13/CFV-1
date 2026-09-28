import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire, Module } from 'node:module'

const require = createRequire(import.meta.url)

type VisitorMockOptions = {
  recentAlert?: Record<string, unknown> | null
  prefs?: { visitor_alerts_enabled: boolean } | null
  chef?: { auth_user_id?: string } | null
  client?: { full_name?: string } | null
}

class VisitorQueryBuilder {
  private table: string
  private options: VisitorMockOptions

  constructor(table: string, options: VisitorMockOptions) {
    this.table = table
    this.options = options
  }

  select() {
    return this
  }

  eq() {
    return this
  }

  gte() {
    return this
  }

  limit() {
    return this
  }

  maybeSingle() {
    if (this.table === 'notifications')
      return Promise.resolve({ data: this.options.recentAlert ?? null, error: null })
    if (this.table === 'chef_preferences')
      return Promise.resolve({ data: this.options.prefs ?? null, error: null })
    return Promise.resolve({ data: null, error: null })
  }

  single() {
    if (this.table === 'chefs')
      return Promise.resolve({ data: this.options.chef ?? null, error: null })
    if (this.table === 'clients')
      return Promise.resolve({ data: this.options.client ?? null, error: null })
    return Promise.resolve({ data: null, error: null })
  }
}

function createVisitorDb(options: VisitorMockOptions) {
  return {
    from(table: string) {
      return new VisitorQueryBuilder(table, options)
    },
  }
}

function loadVisitorAlertWithMocks(input: {
  createServerClient: () => unknown
  sendNotification: (payload: any) => Promise<void>
}) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const dbPath = require.resolve('../../lib/db/server.ts')
  const sendPath = require.resolve('../../lib/notifications/send.ts')
  const notificationIndexPath = require.resolve('../../lib/notifications/index.ts')
  const visitorPath = require.resolve('../../lib/activity/visitor-alert.ts')
  const originalDbModule = require.cache[dbPath]
  const originalSendModule = require.cache[sendPath]
  const originalNotificationIndex = require.cache[notificationIndexPath]

  // Install module mocks before importing the subject: loading the real send
  // module also loads the database client and can leave open handles.
  const dbMock = new Module(dbPath)
  dbMock.filename = dbPath
  dbMock.loaded = true
  dbMock.exports = { createServerClient: input.createServerClient }
  require.cache[dbPath] = dbMock

  const sendMock = new Module(sendPath)
  sendMock.filename = sendPath
  sendMock.loaded = true
  sendMock.exports = { sendNotification: input.sendNotification }
  require.cache[sendPath] = sendMock

  // visitor-alert imports the barrel; refresh its cached re-export too.
  delete require.cache[visitorPath]
  delete require.cache[notificationIndexPath]
  const { triggerVisitorAlert } = require(visitorPath)

  const restore = () => {
    delete require.cache[visitorPath]
    if (originalDbModule) require.cache[dbPath] = originalDbModule
    else delete require.cache[dbPath]
    if (originalSendModule) require.cache[sendPath] = originalSendModule
    else delete require.cache[sendPath]
    if (originalNotificationIndex) require.cache[notificationIndexPath] = originalNotificationIndex
    else delete require.cache[notificationIndexPath]
  }

  return { triggerVisitorAlert, restore }
}

test('triggerVisitorAlert skips non-alertable events before DB work', async () => {
  let createCalls = 0
  let sendCalls = 0
  const { triggerVisitorAlert, restore } = loadVisitorAlertWithMocks({
    createServerClient: () => {
      createCalls++
      return createVisitorDb({})
    },
    sendNotification: async () => {
      sendCalls++
    },
  })

  try {
    await triggerVisitorAlert({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      clientName: 'Alex',
      eventType: 'page_viewed',
    })
  } finally {
    restore()
  }

  assert.equal(createCalls, 0)
  assert.equal(sendCalls, 0)
})

test('triggerVisitorAlert skips when debounce finds a recent alert', async () => {
  let sendCalls = 0
  const { triggerVisitorAlert, restore } = loadVisitorAlertWithMocks({
    createServerClient: () =>
      createVisitorDb({
        recentAlert: { id: 'notif-1' },
        prefs: { visitor_alerts_enabled: true },
        chef: { auth_user_id: 'chef-auth-1' },
      }),
    sendNotification: async () => {
      sendCalls++
    },
  })

  try {
    await triggerVisitorAlert({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      clientName: 'Alex',
      eventType: 'portal_login',
    })
  } finally {
    restore()
  }

  assert.equal(sendCalls, 0)
})

test('triggerVisitorAlert respects visitor_alerts_enabled=false preference', async () => {
  let sendCalls = 0
  const { triggerVisitorAlert, restore } = loadVisitorAlertWithMocks({
    createServerClient: () =>
      createVisitorDb({
        recentAlert: null,
        prefs: { visitor_alerts_enabled: false },
        chef: { auth_user_id: 'chef-auth-1' },
      }),
    sendNotification: async () => {
      sendCalls++
    },
  })

  try {
    await triggerVisitorAlert({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      clientName: 'Alex',
      eventType: 'portal_login',
    })
  } finally {
    restore()
  }

  assert.equal(sendCalls, 0)
})

test('triggerVisitorAlert sends high-intent payload with resolved client name', async () => {
  const sent: any[] = []
  const { triggerVisitorAlert, restore } = loadVisitorAlertWithMocks({
    createServerClient: () =>
      createVisitorDb({
        recentAlert: null,
        prefs: { visitor_alerts_enabled: true },
        chef: { auth_user_id: 'chef-auth-1' },
        client: { full_name: 'Taylor Brooks' },
      }),
    sendNotification: async (payload: any) => {
      sent.push(payload)
    },
  })

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
  assert.equal(sent[0].recipientId, 'chef-auth-1')
  assert.match(sent[0].title, /Taylor Brooks/)
  assert.match(sent[0].title, /🔥/)
  assert.match(sent[0].message, /High-intent signal/)
  assert.equal(sent[0].metadata.eventType, 'payment_page_visited')
  assert.equal(sent[0].metadata.isHighIntent, true)
})

test('triggerVisitorAlert swallows sendNotification errors (non-blocking)', async () => {
  const { triggerVisitorAlert, restore } = loadVisitorAlertWithMocks({
    createServerClient: () =>
      createVisitorDb({
        recentAlert: null,
        prefs: { visitor_alerts_enabled: true },
        chef: { auth_user_id: 'chef-auth-1' },
      }),
    sendNotification: async () => {
      throw new Error('simulated downstream notification error')
    },
  })

  try {
    await triggerVisitorAlert({
      tenantId: 'tenant-1',
      clientId: 'client-1',
      clientName: 'Alex',
      eventType: 'portal_login',
    })
  } finally {
    restore()
  }

  assert.ok(true)
})
