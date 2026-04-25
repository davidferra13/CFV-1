import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INTERACTION_LAYERS,
  INTERACTION_REGISTRY,
  createExecuteInteractionAction,
  createInteractionExecutor,
} from '@/lib/interactions'
import { getInteractionResponseStatus } from '../../app/api/interactions/route'

class MockQuery {
  private filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' }> = []
  private insertPayload: Record<string, unknown> | null = null
  private wantsSingle = false
  private wantsMaybeSingle = false

  constructor(
    private table: string,
    private store: Record<string, Array<Record<string, any>>>
  ) {}

  select() {
    return this
  }

  insert(payload: Record<string, unknown>) {
    this.insertPayload = payload
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value, op: 'eq' })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, value, op: 'gte' })
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  single() {
    this.wantsSingle = true
    return this.run()
  }

  maybeSingle() {
    this.wantsMaybeSingle = true
    return this.run()
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.run().then(onfulfilled, onrejected)
  }

  private async run() {
    if (this.insertPayload) {
      const row = {
        id: this.insertPayload.id ?? `interaction_${this.store[this.table].length + 1}`,
        ...this.insertPayload,
      }
      this.store[this.table].push(row)
      return { data: this.wantsSingle ? row : [row], error: null }
    }

    const rows = (this.store[this.table] ?? []).filter((row) =>
      this.filters.every((filter) => {
        if (filter.op === 'gte') return String(row[filter.column]) >= String(filter.value)
        return row[filter.column] === filter.value
      })
    )

    if (this.wantsSingle || this.wantsMaybeSingle) {
      return { data: rows[0] ?? null, error: null }
    }

    return { data: rows, error: null }
  }
}

function createMockDb(initial: Record<string, Array<Record<string, any>>> = {}) {
  const store = {
    interaction_events: [],
    events: [],
    ...initial,
  }

  return {
    store,
    from(table: string) {
      if (!store[table]) store[table] = []
      return new MockQuery(table, store)
    },
  }
}

test('registry supports all 13 required interaction layers and action types', () => {
  assert.equal(INTERACTION_LAYERS.length, 13)

  for (const action of [
    'like',
    'follow',
    'send_message',
    'search',
    'create_menu',
    'disable_comments',
    'pin',
    'set_online',
    'update_preferences',
    'create_event',
    'send_inquiry',
    'i_would_eat_this',
    'auto_followup',
  ]) {
    assert.ok(INTERACTION_REGISTRY[action], `${action} should be registered`)
  }
})

test('unknown interactions return a typed error without writing', async () => {
  const db = createMockDb()
  const executeInteraction = createInteractionExecutor({
    db,
    getCurrentUser: async () => null,
    runSideEffects: async () => [],
  })

  const result = await executeInteraction({
    action_type: 'unknown_thing',
    actor_id: 'chef_1',
    actor: { role: 'chef', actorId: 'chef_1', tenantId: 'tenant_1' },
    target_type: 'system',
    target_id: 'target_1',
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'unknown_action')
  assert.equal(db.store.interaction_events.length, 0)
})

test('executeInteraction writes one normalized event and dedupes retries', async () => {
  const db = createMockDb()
  const executeInteraction = createInteractionExecutor({
    db,
    getCurrentUser: async () => null,
    runSideEffects: async () => [{ name: 'activity', ok: true }],
  })

  const input = {
    action_type: 'create_menu',
    actor_id: 'chef_1',
    actor: { role: 'chef' as const, actorId: 'chef_1', tenantId: 'tenant_1' },
    target_type: 'menu' as const,
    target_id: 'menu_1',
    metadata: { tenant_id: 'tenant_1' },
    idempotency_key: 'create_menu:menu_1',
  }

  const first = await executeInteraction(input)
  const second = await executeInteraction(input)

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (first.ok && second.ok) {
    assert.equal(first.duplicate, false)
    assert.equal(second.duplicate, true)
    assert.equal(first.event.action_type, 'create_menu')
    assert.equal(first.event.target_type, 'menu')
  }
  assert.equal(db.store.interaction_events.length, 1)
})

test('event-scoped permissions block clients from other client events', async () => {
  const db = createMockDb({
    events: [{ id: 'event_1', tenant_id: 'tenant_1', client_id: 'client_owner' }],
  })
  const executeInteraction = createInteractionExecutor({
    db,
    getCurrentUser: async () => null,
    runSideEffects: async () => [],
  })

  const result = await executeInteraction({
    action_type: 'accept_event',
    actor_id: 'client_other_auth',
    actor: {
      role: 'client',
      actorId: 'client_other_auth',
      entityId: 'client_other',
      tenantId: 'tenant_1',
    },
    target_type: 'event',
    target_id: 'event_1',
    context_type: 'event',
    context_id: 'event_1',
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'permission_denied')
  assert.equal(db.store.interaction_events.length, 0)
})

test('executeInteractionAction infers authenticated actor and returns ok for valid actions', async () => {
  const db = createMockDb()
  const executeInteraction = createInteractionExecutor({
    db,
    getCurrentUser: async () => null,
    runSideEffects: async () => [],
  })
  const executeInteractionAction = createExecuteInteractionAction({
    executeInteraction,
    getCurrentUser: async () => ({
      id: 'chef_auth_1',
      userId: 'chef_auth_1',
      authUserId: 'chef_auth_1',
      email: 'chef@example.com',
      role: 'chef',
      entityId: 'chef_1',
      tenantId: 'tenant_1',
    }),
  })

  const result = await executeInteractionAction({
    action_type: 'create_menu',
    target_type: 'menu',
    target_id: 'menu_1',
    metadata: { tenant_id: 'tenant_1' },
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.event.actor_id, 'chef_auth_1')
    assert.equal(result.event.permissions.actorRole, 'chef')
  }
  assert.equal(db.store.interaction_events.length, 1)
})

test('executeInteractionAction returns unknown action errors without throwing', async () => {
  const db = createMockDb()
  const executeInteractionAction = createExecuteInteractionAction({
    executeInteraction: createInteractionExecutor({
      db,
      getCurrentUser: async () => null,
      runSideEffects: async () => [],
    }),
    getCurrentUser: async () => ({
      id: 'chef_auth_1',
      userId: 'chef_auth_1',
      authUserId: 'chef_auth_1',
      email: 'chef@example.com',
      role: 'chef',
      entityId: 'chef_1',
      tenantId: 'tenant_1',
    }),
  })

  const result = await executeInteractionAction({
    action_type: 'not_registered',
    target_type: 'system',
    target_id: 'target_1',
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'unknown_action')
  assert.equal(db.store.interaction_events.length, 0)
})

test('permission denied gateway results map to 403 and do not write rows', async () => {
  const db = createMockDb({
    events: [{ id: 'event_1', tenant_id: 'tenant_1', client_id: 'client_owner' }],
  })
  const executeInteractionAction = createExecuteInteractionAction({
    executeInteraction: createInteractionExecutor({
      db,
      getCurrentUser: async () => null,
      runSideEffects: async () => [],
    }),
    getCurrentUser: async () => ({
      id: 'client_auth_other',
      userId: 'client_auth_other',
      authUserId: 'client_auth_other',
      email: 'client@example.com',
      role: 'client',
      entityId: 'client_other',
      tenantId: 'tenant_1',
    }),
  })

  const result = await executeInteractionAction({
    action_type: 'accept_event',
    target_type: 'event',
    target_id: 'event_1',
    context_type: 'event',
    context_id: 'event_1',
  })

  assert.equal(result.ok, false)
  assert.equal(getInteractionResponseStatus(result), 403)
  if (!result.ok) assert.equal(result.error.code, 'permission_denied')
  assert.equal(db.store.interaction_events.length, 0)
})

test('duplicate POST-style gateway execution reuses the existing interaction event', async () => {
  const db = createMockDb({
    events: [{ id: 'event_1', tenant_id: 'tenant_1', client_id: 'client_1' }],
  })
  const executeInteractionAction = createExecuteInteractionAction({
    executeInteraction: createInteractionExecutor({
      db,
      getCurrentUser: async () => null,
      runSideEffects: async () => [],
    }),
    getCurrentUser: async () => ({
      id: 'chef_auth_1',
      userId: 'chef_auth_1',
      authUserId: 'chef_auth_1',
      email: 'chef@example.com',
      role: 'chef',
      entityId: 'chef_1',
      tenantId: 'tenant_1',
    }),
  })

  const input = {
    action_type: 'save_for_event',
    target_type: 'menu' as const,
    target_id: 'menu_1',
    context_type: 'event' as const,
    context_id: 'event_1',
    idempotency_key: 'post:save_for_event:event_1:menu_1',
  }

  const first = await executeInteractionAction(input)
  const second = await executeInteractionAction(input)

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (first.ok && second.ok) {
    assert.equal(first.duplicate, false)
    assert.equal(second.duplicate, true)
    assert.equal(first.event.id, second.event.id)
  }
  assert.equal(db.store.interaction_events.length, 1)
})
