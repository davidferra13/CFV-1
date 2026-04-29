import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryResponse = {
  data: Array<Record<string, unknown>> | null
  error: unknown
}

type QueryCall = {
  table: string
  method: string
  args: unknown[]
}

class StaffActivityQueryBuilder implements PromiseLike<QueryResponse> {
  private table: string
  private response: QueryResponse
  private calls: QueryCall[]

  constructor(table: string, response: QueryResponse, calls: QueryCall[]) {
    this.table = table
    this.response = response
    this.calls = calls
  }

  select(...args: unknown[]) {
    this.calls.push({ table: this.table, method: 'select', args })
    return this
  }

  eq(...args: unknown[]) {
    this.calls.push({ table: this.table, method: 'eq', args })
    return this
  }

  gte(...args: unknown[]) {
    this.calls.push({ table: this.table, method: 'gte', args })
    return this
  }

  in(...args: unknown[]) {
    this.calls.push({ table: this.table, method: 'in', args })
    return this
  }

  order(...args: unknown[]) {
    this.calls.push({ table: this.table, method: 'order', args })
    return this
  }

  limit(...args: unknown[]) {
    this.calls.push({ table: this.table, method: 'limit', args })
    return this
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected)
  }
}

function installModule(path: string, exports: Record<string, unknown>) {
  const original = require.cache[path]
  require.cache[path] = { exports } as NodeJS.Module

  return () => {
    if (original) require.cache[path] = original
    else delete require.cache[path]
  }
}

function createDb(responses: Partial<Record<string, QueryResponse>>, calls: QueryCall[]) {
  return {
    from(table: string) {
      const response = responses[table] ?? { data: [], error: null }
      return new StaffActivityQueryBuilder(table, response, calls)
    },
  }
}

function loadStaffActivityBoard(input: {
  responses: Partial<Record<string, QueryResponse>>
  calls: QueryCall[]
}) {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const activityBoardPath = require.resolve('../../lib/staff/activity-board.ts')

  const restoreAuth = installModule(authPath, {
    requireChef: async () => ({ tenantId: 'tenant-1' }),
  })
  const restoreDb = installModule(dbPath, {
    createServerClient: () => createDb(input.responses, input.calls),
  })

  delete require.cache[activityBoardPath]
  const actions = require(activityBoardPath)

  return {
    getStaffActivityBoard: actions.getStaffActivityBoard as () => Promise<unknown>,
    restore: () => {
      restoreAuth()
      restoreDb()
      delete require.cache[activityBoardPath]
    },
  }
}

test('returns an explicit error when the staff roster query fails', async () => {
  const calls: QueryCall[] = []
  const { getStaffActivityBoard, restore } = loadStaffActivityBoard({
    calls,
    responses: {
      staff_members: {
        data: null,
        error: { message: 'permission denied for staff_members' },
      },
    },
  })

  try {
    const result = await getStaffActivityBoard()

    assert.deepEqual(result, {
      success: false,
      error:
        'Unable to load staff activity from staff roster. Refresh the page or try again shortly.',
    })
    assert.equal(
      calls.some((call) => call.table === 'tasks'),
      false
    )
  } finally {
    restore()
  }
})

test('returns a valid empty state when there are no active staff members', async () => {
  const calls: QueryCall[] = []
  const { getStaffActivityBoard, restore } = loadStaffActivityBoard({
    calls,
    responses: {
      staff_members: { data: [], error: null },
    },
  })

  try {
    const result = await getStaffActivityBoard()

    assert.deepEqual(result, { success: true, data: [] })
    assert.equal(
      calls.some((call) => call.table === 'tasks'),
      false
    )
  } finally {
    restore()
  }
})

test('returns an explicit error when an aggregation query fails', async () => {
  const calls: QueryCall[] = []
  const { getStaffActivityBoard, restore } = loadStaffActivityBoard({
    calls,
    responses: {
      staff_members: {
        data: [{ id: 'staff-1', name: 'Sam', role: 'sous_chef' }],
        error: null,
      },
      tasks: {
        data: null,
        error: { message: 'task query timeout' },
      },
    },
  })

  try {
    const result = await getStaffActivityBoard()

    assert.deepEqual(result, {
      success: false,
      error: 'Unable to load staff activity from tasks. Refresh the page or try again shortly.',
    })
  } finally {
    restore()
  }
})

test('loads successful activity data through tenant-scoped staff queries', async () => {
  const calls: QueryCall[] = []
  const { getStaffActivityBoard, restore } = loadStaffActivityBoard({
    calls,
    responses: {
      staff_members: {
        data: [{ id: 'staff-1', name: 'Sam', role: 'sous_chef' }],
        error: null,
      },
      tasks: {
        data: [
          { id: 'task-1', assigned_to: 'staff-1', status: 'in_progress', title: 'Prep sauce' },
          { id: 'task-2', assigned_to: 'staff-1', status: 'done', title: 'Set station' },
        ],
        error: null,
      },
      task_completion_log: {
        data: [{ staff_member_id: 'staff-1', completed_at: new Date().toISOString() }],
        error: null,
      },
      ops_log: {
        data: [],
        error: null,
      },
      clipboard_entries: {
        data: [],
        error: null,
      },
    },
  })

  try {
    const result = await getStaffActivityBoard()

    assert.equal((result as { success: boolean }).success, true)
    const data = (result as { data: Array<Record<string, unknown>> }).data
    assert.equal(data.length, 1)
    assert.equal(data[0].currentTask, 'Prep sauce')
    assert.equal(data[0].tasksToday, 2)
    assert.equal(data[0].tasksDoneToday, 1)

    const tenantScopedTables = [
      'staff_members',
      'tasks',
      'task_completion_log',
      'ops_log',
      'clipboard_entries',
    ]

    for (const table of tenantScopedTables) {
      assert.equal(
        calls.some(
          (call) =>
            call.table === table &&
            call.method === 'eq' &&
            call.args[0] === 'chef_id' &&
            call.args[1] === 'tenant-1'
        ),
        true,
        `${table} must be scoped by chef_id`
      )
    }
  } finally {
    restore()
  }
})
