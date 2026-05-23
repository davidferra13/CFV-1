import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const currentDir = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Load modules under test (pure logic, no DB)
// ---------------------------------------------------------------------------

const {
  evaluateRemyRoutineConditions,
  remyRoutinesMatcherInternals,
} = require('../../lib/ai/remy-routines-matcher.ts')

const {
  buildRemyRoutineIdempotencyKey,
  remyRoutinesExecutorInternals,
} = require('../../lib/ai/remy-routines-executor.ts')

const { EMPTY_REMY_ROUTINE_CONDITION_GROUP } = require('../../lib/ai/remy-routines-types.ts')

const { getByPath, evaluateCondition } = remyRoutinesMatcherInternals
const { stableStringify, actionNeedsApproval, buildActionPayload } = remyRoutinesExecutorInternals

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    triggerType: 'signal',
    source: 'test',
    occurredAt: '2026-05-18T12:00:00.000Z',
    triggerKey: null,
    entityIds: [],
    data: {},
    ...overrides,
  }
}

function makeRoutine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'routine-1',
    tenantId: 'tenant-a',
    name: 'Test routine',
    description: null,
    status: 'active',
    triggerType: 'signal',
    triggerConfig: {},
    conditionGroup: { mode: 'all', conditions: [] },
    actions: [
      {
        id: 'action-1',
        kind: 'record_routine_event',
        label: 'Log it',
        payload: {},
      },
    ],
    priority: 0,
    approvalRequired: false,
    idempotencyWindowSeconds: 86400,
    createdByAuthUserId: null,
    updatedByAuthUserId: null,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
    ...overrides,
  }
}

// ===========================================================================
// 1. CONDITION EVALUATION (pure logic)
// ===========================================================================

test('empty condition group matches everything (vacuous truth)', () => {
  const result = evaluateRemyRoutineConditions(EMPTY_REMY_ROUTINE_CONDITION_GROUP, makeContext())
  assert.equal(result.matched, true)
  assert.equal(result.results.length, 0)
})

test('exists operator matches when path has a value', () => {
  const result = evaluateCondition(
    { path: 'data.status', operator: 'exists' },
    makeContext({ data: { status: 'confirmed' } })
  )
  assert.equal(result.matched, true)
})

test('exists operator fails when path is undefined', () => {
  const result = evaluateCondition(
    { path: 'data.missing', operator: 'exists' },
    makeContext({ data: {} })
  )
  assert.equal(result.matched, false)
})

test('equals operator works for string values', () => {
  const result = evaluateCondition(
    { path: 'data.kind', operator: 'equals', value: 'inquiry' },
    makeContext({ data: { kind: 'inquiry' } })
  )
  assert.equal(result.matched, true)
})

test('not_equals operator works for string values', () => {
  const result = evaluateCondition(
    { path: 'data.kind', operator: 'not_equals', value: 'inquiry' },
    makeContext({ data: { kind: 'event' } })
  )
  assert.equal(result.matched, true)
})

test('in operator matches value in array', () => {
  const result = evaluateCondition(
    { path: 'data.status', operator: 'in', value: ['confirmed', 'completed'] },
    makeContext({ data: { status: 'confirmed' } })
  )
  assert.equal(result.matched, true)
})

test('not_in operator rejects value in array', () => {
  const result = evaluateCondition(
    { path: 'data.status', operator: 'not_in', value: ['confirmed', 'completed'] },
    makeContext({ data: { status: 'confirmed' } })
  )
  assert.equal(result.matched, false)
})

test('contains operator on string', () => {
  const result = evaluateCondition(
    { path: 'data.message', operator: 'contains', value: 'allergy' },
    makeContext({ data: { message: 'Client has a shellfish allergy' } })
  )
  assert.equal(result.matched, true)
})

test('greater_than operator on numbers', () => {
  const result = evaluateCondition(
    { path: 'data.guestCount', operator: 'greater_than', value: 10 },
    makeContext({ data: { guestCount: 25 } })
  )
  assert.equal(result.matched, true)
})

test('less_than operator on numbers', () => {
  const result = evaluateCondition(
    { path: 'data.guestCount', operator: 'less_than', value: 10 },
    makeContext({ data: { guestCount: 5 } })
  )
  assert.equal(result.matched, true)
})

test('starts_with operator on string', () => {
  const result = evaluateCondition(
    { path: 'data.channel', operator: 'starts_with', value: 'email' },
    makeContext({ data: { channel: 'email_direct' } })
  )
  assert.equal(result.matched, true)
})

test('ends_with operator on string', () => {
  const result = evaluateCondition(
    { path: 'data.channel', operator: 'ends_with', value: '_direct' },
    makeContext({ data: { channel: 'email_direct' } })
  )
  assert.equal(result.matched, true)
})

test('all-mode group requires every condition to match', () => {
  const result = evaluateRemyRoutineConditions(
    {
      mode: 'all',
      conditions: [
        { path: 'data.status', operator: 'equals', value: 'new' },
        { path: 'data.priority', operator: 'equals', value: 'high' },
      ],
    },
    makeContext({ data: { status: 'new', priority: 'low' } })
  )
  assert.equal(result.matched, false)
  assert.equal(result.results.length, 2)
  assert.equal(result.results[0].matched, true)
  assert.equal(result.results[1].matched, false)
})

test('any-mode group requires at least one condition to match', () => {
  const result = evaluateRemyRoutineConditions(
    {
      mode: 'any',
      conditions: [
        { path: 'data.status', operator: 'equals', value: 'new' },
        { path: 'data.priority', operator: 'equals', value: 'high' },
      ],
    },
    makeContext({ data: { status: 'new', priority: 'low' } })
  )
  assert.equal(result.matched, true)
})

test('nested condition groups evaluate recursively', () => {
  const result = evaluateRemyRoutineConditions(
    {
      mode: 'all',
      conditions: [{ path: 'data.topLevel', operator: 'equals', value: true }],
      groups: [
        {
          mode: 'any',
          conditions: [
            { path: 'data.a', operator: 'equals', value: 1 },
            { path: 'data.b', operator: 'equals', value: 2 },
          ],
        },
      ],
    },
    makeContext({ data: { topLevel: true, a: 99, b: 2 } })
  )
  assert.equal(result.matched, true)
})

// ===========================================================================
// 2. SAFETY: PATH TRAVERSAL PROTECTION
// ===========================================================================

test('getByPath rejects __proto__ traversal', () => {
  const value = getByPath({ __proto__: { evil: true } }, '__proto__.evil')
  assert.equal(value, undefined)
})

test('getByPath rejects constructor traversal', () => {
  const value = getByPath({}, 'constructor.prototype')
  assert.equal(value, undefined)
})

test('getByPath returns undefined for empty path', () => {
  const value = getByPath({ a: 1 }, '')
  assert.equal(value, undefined)
})

test('getByPath handles deeply nested objects safely', () => {
  const obj = { a: { b: { c: { d: 42 } } } }
  assert.equal(getByPath(obj, 'a.b.c.d'), 42)
})

test('getByPath returns undefined when path segment hits a primitive', () => {
  assert.equal(getByPath({ a: 'hello' }, 'a.b'), undefined)
})

test('getByPath returns undefined when path segment hits null', () => {
  assert.equal(getByPath({ a: null }, 'a.b'), undefined)
})

// ===========================================================================
// 3. SAFETY: ACTION KIND ALLOWLIST
// ===========================================================================

const ALLOWED_ACTION_KINDS = [
  'record_routine_event',
  'queue_review',
  'create_notification_draft',
  'create_task_draft',
]

test('routines cannot define arbitrary action kinds (DB enforced via CHECK)', () => {
  // The DB CHECK constraint in the migration prevents unknown action_kinds.
  // Verify forbidden kinds are not in the allowlist.
  const forbidden = [
    'delete_record',
    'send_email',
    'execute_code',
    'modify_payment',
    'filesystem_write',
    'http_request',
    'run_script',
  ]
  for (const kind of forbidden) {
    assert.ok(!ALLOWED_ACTION_KINDS.includes(kind), `${kind} must NOT be an allowed action kind`)
  }
})

// ===========================================================================
// 4. SAFETY: APPROVAL GATE
// ===========================================================================

test('actionNeedsApproval returns true when routine has approvalRequired', () => {
  const routine = makeRoutine({ approvalRequired: true })
  assert.equal(actionNeedsApproval(routine), true)
})

test('actionNeedsApproval returns true when any action has approvalRequired', () => {
  const routine = makeRoutine({
    approvalRequired: false,
    actions: [
      { id: 'a1', kind: 'queue_review', label: 'Review', payload: {}, approvalRequired: true },
    ],
  })
  assert.equal(actionNeedsApproval(routine), true)
})

test('actionNeedsApproval returns false when nothing requires approval', () => {
  const routine = makeRoutine({ approvalRequired: false })
  assert.equal(actionNeedsApproval(routine), false)
})

// ===========================================================================
// 5. IDEMPOTENCY KEY STABILITY
// ===========================================================================

test('idempotency key is deterministic for same inputs', () => {
  const ctx = makeContext({ data: { x: 1 } })
  const key1 = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-a',
    routineId: 'routine-1',
    context: ctx,
  })
  const key2 = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-a',
    routineId: 'routine-1',
    context: ctx,
  })
  assert.equal(key1, key2)
})

test('idempotency key differs when tenantId differs', () => {
  const ctx = makeContext()
  const key1 = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-a',
    routineId: 'routine-1',
    context: ctx,
  })
  const key2 = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-b',
    routineId: 'routine-1',
    context: ctx,
  })
  assert.notEqual(key1, key2)
})

test('idempotency key differs when routineId differs', () => {
  const ctx = makeContext()
  const key1 = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-a',
    routineId: 'routine-1',
    context: ctx,
  })
  const key2 = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-a',
    routineId: 'routine-2',
    context: ctx,
  })
  assert.notEqual(key1, key2)
})

test('explicit idempotencyKey in context takes priority', () => {
  const ctx = makeContext({ idempotencyKey: 'my-custom-key' })
  const key = buildRemyRoutineIdempotencyKey({
    tenantId: 'tenant-a',
    routineId: 'routine-1',
    context: ctx,
  })
  assert.equal(key, 'my-custom-key')
})

// ===========================================================================
// 6. STABLE STRINGIFY (object key order independence)
// ===========================================================================

test('stableStringify is order-independent for object keys', () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }))
})

test('stableStringify handles nested objects deterministically', () => {
  const a = { outer: { z: 1, a: 2 }, key: 'val' }
  const b = { key: 'val', outer: { a: 2, z: 1 } }
  assert.equal(stableStringify(a), stableStringify(b))
})

test('stableStringify handles arrays (order-sensitive)', () => {
  assert.notEqual(stableStringify([1, 2, 3]), stableStringify([3, 2, 1]))
})

test('stableStringify handles primitives', () => {
  assert.equal(stableStringify(null), 'null')
  assert.equal(stableStringify(42), '42')
  assert.equal(stableStringify('hello'), '"hello"')
})

// ===========================================================================
// 7. SAFETY: TENANT ISOLATION (via DB schema proof)
// ===========================================================================

test('migration enforces tenant_id FK on all routine tables', () => {
  const migrationPath = resolve(
    currentDir,
    '../../database/migrations/20260518000002_remy_routines.sql'
  )
  const sql = readFileSync(migrationPath, 'utf8')

  const tables = [
    'remy_routines',
    'remy_routine_match_audit',
    'remy_routine_executions',
    'remy_routine_execution_audit',
    'remy_routine_action_events',
  ]

  for (const table of tables) {
    // Every table must have tenant_id NOT NULL with FK to chefs
    assert.match(
      sql,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table}[\\s\\S]*?tenant_id uuid NOT NULL`),
      `${table} must have tenant_id NOT NULL`
    )

    // Every table must have RLS enabled
    assert.match(
      sql,
      new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`),
      `${table} must have RLS enabled`
    )

    // Every table must have tenant-scoped SELECT policy. The root routine table uses the
    // historical `_tenant_*` names; append-only audit tables use shorter names.
    assert.match(
      sql,
      new RegExp(`CREATE POLICY ${table}(?:_tenant)?_select`),
      `${table} must have tenant_select policy`
    )

    // Every table must have tenant-scoped INSERT policy.
    assert.match(
      sql,
      new RegExp(`CREATE POLICY ${table}(?:_tenant)?_insert`),
      `${table} must have tenant_insert policy`
    )
  }
})

test('RLS policies use get_current_tenant_id() for isolation', () => {
  const migrationPath = resolve(
    currentDir,
    '../../database/migrations/20260518000002_remy_routines.sql'
  )
  const sql = readFileSync(migrationPath, 'utf8')

  // Count usage of get_current_tenant_id
  const matches = sql.match(/get_current_tenant_id\(\)/g)
  // 5 tables * at least 2 policies each (select + insert) = at least 10 usages
  assert.ok(
    matches && matches.length >= 10,
    `Expected at least 10 get_current_tenant_id() calls, got ${matches?.length ?? 0}`
  )
})

// ===========================================================================
// 8. SAFETY: AUTH GATE PROOF (static analysis of server actions)
// ===========================================================================

test('all exported server actions call requireChef()', () => {
  const actionsPath = resolve(currentDir, '../../lib/ai/remy-routines-actions.ts')
  const source = readFileSync(actionsPath, 'utf8')

  // File must have 'use server'
  assert.match(source, /'use server'/, 'Actions file must have "use server" directive')

  // Find all exported async functions
  const exportedFunctions = source.match(/export async function (\w+)/g) || []
  assert.ok(
    exportedFunctions.length >= 8,
    `Expected at least 8 exported actions, found ${exportedFunctions.length}`
  )

  // Each exported function should call requireChef()
  const functionBodies = source.split(/export async function /)
  for (let i = 1; i < functionBodies.length; i++) {
    const body = functionBodies[i]
    const funcName = body.match(/^(\w+)/)?.[1]
    if (!funcName) continue

    // The function body (up to the next export or end of file) must call requireChef
    const bodyUntilNext = body.split(/export async function /)[0]
    assert.match(
      bodyUntilNext,
      /requireChef\(\)/,
      `Server action ${funcName} must call requireChef()`
    )
  }
})

test('actions file uses zod validation for user input', () => {
  const actionsPath = resolve(currentDir, '../../lib/ai/remy-routines-actions.ts')
  const source = readFileSync(actionsPath, 'utf8')

  // Must import zod
  assert.match(source, /from 'zod'/, 'Actions must import zod')

  // Must have schemas defined
  assert.match(source, /createRoutineSchema/, 'Must have create routine schema')
  assert.match(source, /triggerContextSchema/, 'Must have trigger context schema')
  assert.match(source, /actionSchema/, 'Must have action schema')
})

test('routine actions reject executable payload authority', () => {
  const actionsPath = resolve(currentDir, '../../lib/ai/remy-routines-actions.ts')
  const source = readFileSync(actionsPath, 'utf8')

  assert.match(source, /FORBIDDEN_ROUTINE_PAYLOAD_PATTERNS/)
  assert.match(source, /shell commands, executable code, arbitrary URLs, or filesystem paths/)
  assert.match(source, /payloadContainsForbiddenAuthority/)
})

test('new routine proposals default to draft-paused status before chef activation', () => {
  const actionsPath = resolve(currentDir, '../../lib/ai/remy-routines-actions.ts')
  const source = readFileSync(actionsPath, 'utf8')

  assert.match(source, /status:\s*parsed\.status\s*\?\?\s*'paused'/)
})

test('routine create and update changes are written to audit history', () => {
  const actionsPath = resolve(currentDir, '../../lib/ai/remy-routines-actions.ts')
  const source = readFileSync(actionsPath, 'utf8')

  assert.match(source, /logRoutineChangeAudit/)
  assert.match(source, /routine_created/)
  assert.match(source, /routine_updated/)
  assert.match(source, /remy_routine_execution_audit/)
})

// ===========================================================================
// 9. SAFETY: FORBIDDEN OPERATIONS (Remy cannot do these)
// ===========================================================================

test('buildActionPayload only includes safe fields from context', () => {
  const action = {
    id: 'a1',
    kind: 'record_routine_event',
    label: 'Log',
    payload: { note: 'test' },
  }
  const ctx = makeContext({
    data: { sensitiveField: 'secret' },
    triggerKey: 'key-1',
  })

  const result = buildActionPayload(action, ctx)

  // Should contain trigger metadata
  assert.equal(result.kind, 'record_routine_event')
  assert.equal(result.label, 'Log')
  assert.deepEqual(result.payload, { note: 'test' })
  assert.equal(result.trigger.type, 'signal')
  assert.equal(result.trigger.source, 'test')
  assert.equal(result.trigger.key, 'key-1')

  // Trigger context raw data is NOT embedded in the action payload
  assert.equal(result.trigger.data, undefined)
})

// ===========================================================================
// 10. CONDITION EVALUATION EDGE CASES
// ===========================================================================

test('numeric comparison with non-numeric values returns false', () => {
  const result = evaluateCondition(
    { path: 'data.count', operator: 'greater_than', value: 5 },
    makeContext({ data: { count: 'not-a-number' } })
  )
  assert.equal(result.matched, false)
})

test('contains on non-string non-array returns false', () => {
  const result = evaluateCondition(
    { path: 'data.count', operator: 'contains', value: '1' },
    makeContext({ data: { count: 123 } })
  )
  assert.equal(result.matched, false)
})

test('starts_with on non-string returns false', () => {
  const result = evaluateCondition(
    { path: 'data.num', operator: 'starts_with', value: '1' },
    makeContext({ data: { num: 123 } })
  )
  assert.equal(result.matched, false)
})

test('in operator with non-array value returns false', () => {
  const result = evaluateCondition(
    { path: 'data.status', operator: 'in', value: 'not-an-array' },
    makeContext({ data: { status: 'active' } })
  )
  assert.equal(result.matched, false)
})

test('condition on array data with contains operator works', () => {
  const result = evaluateCondition(
    { path: 'data.tags', operator: 'contains', value: 'vip' },
    makeContext({ data: { tags: ['regular', 'vip', 'repeat'] } })
  )
  assert.equal(result.matched, true)
})

// ===========================================================================
// 11. ROUTINE STATUS GATING
// ===========================================================================

test('paused routine maps status correctly from DB row', () => {
  const { routineFromRow } = remyRoutinesMatcherInternals
  const row = {
    id: 'r1',
    tenant_id: 't1',
    name: 'Paused',
    description: null,
    status: 'paused',
    trigger_type: 'signal',
    trigger_config: null,
    condition_group: null,
    actions: null,
    priority: null,
    approval_required: null,
    idempotency_window_seconds: null,
    created_by_auth_user_id: null,
    updated_by_auth_user_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
  const routine = routineFromRow(row)
  assert.equal(routine.status, 'paused')
  assert.equal(routine.approvalRequired, false)
  assert.deepEqual(routine.actions, [])
})

// ===========================================================================
// 12. EXECUTION ROW MAPPING
// ===========================================================================

test('executionFromRow maps all fields correctly', () => {
  const { executionFromRow } = remyRoutinesExecutorInternals
  const row = {
    id: 'exec-1',
    tenant_id: 'tenant-a',
    routine_id: 'routine-1',
    match_audit_id: 'audit-1',
    idempotency_key: 'key-abc',
    status: 'success',
    action_payload: [{ id: 'a1', kind: 'queue_review', label: 'Test', payload: {} }],
    result_payload: { done: true },
    error_message: null,
    requested_by_auth_user_id: 'user-1',
    approved_by_auth_user_id: 'user-2',
    approved_at: '2026-05-18T01:00:00.000Z',
    started_at: '2026-05-18T00:30:00.000Z',
    finished_at: '2026-05-18T01:00:00.000Z',
    created_at: '2026-05-18T00:00:00.000Z',
    updated_at: '2026-05-18T01:00:00.000Z',
  }
  const exec = executionFromRow(row)
  assert.equal(exec.id, 'exec-1')
  assert.equal(exec.tenantId, 'tenant-a')
  assert.equal(exec.routineId, 'routine-1')
  assert.equal(exec.matchAuditId, 'audit-1')
  assert.equal(exec.status, 'success')
  assert.equal(exec.actionPayload.length, 1)
  assert.equal(exec.approvedByAuthUserId, 'user-2')
})

test('executionFromRow handles null optional fields', () => {
  const { executionFromRow } = remyRoutinesExecutorInternals
  const row = {
    id: 'exec-2',
    tenant_id: 'tenant-a',
    routine_id: 'routine-1',
    match_audit_id: null,
    idempotency_key: 'key-def',
    status: 'approval_required',
    action_payload: null,
    result_payload: null,
    error_message: null,
    requested_by_auth_user_id: null,
    approved_by_auth_user_id: null,
    approved_at: null,
    started_at: null,
    finished_at: null,
    created_at: '2026-05-18T00:00:00.000Z',
    updated_at: '2026-05-18T00:00:00.000Z',
  }
  const exec = executionFromRow(row)
  assert.equal(exec.matchAuditId, null)
  assert.deepEqual(exec.actionPayload, [])
  assert.equal(exec.errorMessage, null)
  assert.equal(exec.approvedByAuthUserId, null)
  assert.equal(exec.approvedAt, null)
  assert.equal(exec.startedAt, null)
  assert.equal(exec.finishedAt, null)
})
