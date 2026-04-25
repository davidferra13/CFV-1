import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { reopenMenuDraftWithContext, transitionMenuWithContext } from '@/lib/menus/menu-lifecycle'

type RecordedQuery = {
  table: string
  action: string
  filters: Array<{ column: string; value: unknown }>
  payload?: unknown
}

function createLifecycleDb(input: {
  menuStatus: string
  dishes?: Array<{ id: string }>
  updateError?: { message: string } | null
}) {
  const state = {
    menu: { status: input.menuStatus, deleted_at: null as string | null },
    dishes: input.dishes ?? [{ id: 'dish-1' }],
    updates: [] as Array<Record<string, unknown>>,
    transitions: [] as Array<Record<string, unknown>>,
    queries: [] as RecordedQuery[],
  }

  class Query {
    private action = 'select'
    private filters: Array<{ column: string; value: unknown }> = []
    private payload: unknown

    constructor(private table: string) {}

    select() {
      this.action = 'select'
      return this
    }

    update(payload: unknown) {
      this.action = 'update'
      this.payload = payload
      return this
    }

    insert(payload: unknown) {
      this.action = 'insert'
      this.payload = payload
      return this.execute()
    }

    eq(column: string, value: unknown) {
      this.filters.push({ column, value })
      return this
    }

    is(column: string, value: unknown) {
      this.filters.push({ column, value })
      return this
    }

    limit() {
      return this
    }

    single() {
      return this.execute()
    }

    then(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) {
      return Promise.resolve(this.execute()).then(resolve, reject)
    }

    private execute() {
      state.queries.push({
        table: this.table,
        action: this.action,
        filters: this.filters,
        payload: this.payload,
      })

      if (this.action === 'select') {
        if (this.table === 'menus') {
          return { data: state.menu, error: null }
        }

        if (this.table === 'dishes') {
          return { data: state.dishes, error: null }
        }

        return { data: null, error: null }
      }

      if (this.action === 'update') {
        if (input.updateError) {
          return { data: null, error: input.updateError }
        }

        if (this.table === 'menus') {
          const payload = this.payload as Record<string, unknown>
          state.updates.push(payload)
          state.menu.status = String(payload.status)
        }

        return { data: null, error: null }
      }

      if (this.action === 'insert') {
        if (this.table === 'menu_state_transitions') {
          state.transitions.push(this.payload as Record<string, unknown>)
        }

        return { data: null, error: null }
      }

      return { data: null, error: null }
    }
  }

  return {
    db: {
      from(table: string) {
        return new Query(table)
      },
    },
    state,
  }
}

const quietSideEffects = {
  revalidate: false,
  activityLog: false,
  circleNotifications: false,
  dishIndexBridge: false,
}

test('shared lifecycle rejects empty menus by checking real dishes rows', async () => {
  const { db, state } = createLifecycleDb({ menuStatus: 'draft', dishes: [] })

  await assert.rejects(
    () =>
      transitionMenuWithContext({
        db,
        menuId: 'menu-1',
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        toStatus: 'shared',
        reason: 'test',
        sideEffects: quietSideEffects,
      }),
    /Cannot share or lock a menu with no dishes/
  )

  assert.equal(
    state.queries.some((query) => query.table === 'dishes'),
    true
  )
  assert.equal(
    state.queries.some((query) => query.table === 'menu_dishes'),
    false
  )
  assert.equal(state.updates.length, 0)
  assert.equal(state.transitions.length, 0)
})

test('Dinner Circle lock path can share then lock through the shared lifecycle', async () => {
  const { db, state } = createLifecycleDb({ menuStatus: 'draft' })

  await transitionMenuWithContext({
    db,
    menuId: 'menu-1',
    tenantId: 'tenant-1',
    actorUserId: 'user-1',
    toStatus: 'shared',
    reason: 'Dinner Circle final menu selections ready to lock',
    source: 'dinner_circle_menu_polling',
    sideEffects: quietSideEffects,
  })

  await transitionMenuWithContext({
    db,
    menuId: 'menu-1',
    tenantId: 'tenant-1',
    actorUserId: 'user-1',
    toStatus: 'locked',
    reason: 'Dinner Circle final menu selections locked',
    source: 'dinner_circle_menu_polling',
    sideEffects: quietSideEffects,
  })

  assert.equal(state.menu.status, 'locked')
  assert.deepEqual(
    state.transitions.map((transition) => ({
      from: transition.from_status,
      to: transition.to_status,
      source: (transition.metadata as Record<string, unknown>).source,
    })),
    [
      { from: 'draft', to: 'shared', source: 'dinner_circle_menu_polling' },
      { from: 'shared', to: 'locked', source: 'dinner_circle_menu_polling' },
    ]
  )
  assert.deepEqual(
    state.updates.map((update) => update.status),
    ['shared', 'locked']
  )
})

test('Dinner Circle reopen moves a locked menu to draft through the canonical lifecycle row', async () => {
  const { db, state } = createLifecycleDb({ menuStatus: 'locked' })

  await reopenMenuDraftWithContext({
    db,
    menuId: 'menu-1',
    tenantId: 'tenant-1',
    actorUserId: 'user-1',
    reason: 'Reopened for Dinner Circle menu polling iteration',
    source: 'dinner_circle_menu_polling',
    sideEffects: quietSideEffects,
  })

  assert.equal(state.menu.status, 'draft')
  assert.equal(state.updates.length, 1)
  assert.deepEqual(
    {
      status: state.updates[0].status,
      locked_at: state.updates[0].locked_at,
      archived_at: state.updates[0].archived_at,
      updated_by: state.updates[0].updated_by,
    },
    {
      status: 'draft',
      locked_at: null,
      archived_at: null,
      updated_by: 'user-1',
    }
  )
  assert.equal(state.transitions.length, 1)
  assert.deepEqual(
    {
      from_status: state.transitions[0].from_status,
      to_status: state.transitions[0].to_status,
      source: (state.transitions[0].metadata as Record<string, unknown>).source,
    },
    {
      from_status: 'locked',
      to_status: 'draft',
      source: 'dinner_circle_menu_polling',
    }
  )
})

test('Dinner Circle reopen moves an archived menu to draft through the canonical lifecycle row', async () => {
  const { db, state } = createLifecycleDb({ menuStatus: 'archived' })

  await reopenMenuDraftWithContext({
    db,
    menuId: 'menu-1',
    tenantId: 'tenant-1',
    actorUserId: 'user-1',
    reason: 'Reopened for Dinner Circle menu polling iteration',
    source: 'dinner_circle_menu_polling',
    sideEffects: quietSideEffects,
  })

  assert.equal(state.menu.status, 'draft')
  assert.equal(state.updates.length, 1)
  assert.deepEqual(
    {
      status: state.updates[0].status,
      locked_at: state.updates[0].locked_at,
      archived_at: state.updates[0].archived_at,
      updated_by: state.updates[0].updated_by,
    },
    {
      status: 'draft',
      locked_at: null,
      archived_at: null,
      updated_by: 'user-1',
    }
  )
  assert.equal(state.transitions.length, 1)
  assert.deepEqual(
    {
      from_status: state.transitions[0].from_status,
      to_status: state.transitions[0].to_status,
      source: (state.transitions[0].metadata as Record<string, unknown>).source,
    },
    {
      from_status: 'archived',
      to_status: 'draft',
      source: 'dinner_circle_menu_polling',
    }
  )
})

test('Dinner Circle finalization uses the shared menu lifecycle helper', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'lib/hub/menu-poll-actions.ts'), 'utf8')

  assert.equal(source.includes('setMenuLockedState'), false)
  assert.match(source, /transitionMenuWithContext\(\{/)
  assert.match(source, /source:\s*'dinner_circle_menu_polling'/)
})

test('Dinner Circle poll iteration reopen delegates lifecycle state changes to the helper', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'lib/hub/menu-poll-actions.ts'), 'utf8')
  const branchStart = source.indexOf("if (menu.status === 'locked' || menu.status === 'archived')")
  const branchEnd = source.indexOf('if (event.menu_id !== menu.id)', branchStart)
  const branch = source.slice(branchStart, branchEnd)

  assert.notEqual(branchStart, -1)
  assert.notEqual(branchEnd, -1)
  assert.match(branch, /reopenMenuDraftWithContext\(\{/)
  assert.doesNotMatch(branch, /\.from\('menus'\)[\s\S]*?\.update\(\{[\s\S]*?status:\s*'draft'/)
  assert.doesNotMatch(branch, /\.from\('menu_state_transitions'\)[\s\S]*?\.insert\(/)
})
