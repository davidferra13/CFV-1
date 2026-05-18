import { createServerClient } from '@/lib/db/server'
import { toSafeJsonb } from '@/lib/ai/remy-action-audit-core'
import type {
  RemyRoutine,
  RemyRoutineCondition,
  RemyRoutineConditionGroup,
  RemyRoutineMatchConditionResult,
  RemyRoutineMatchResult,
  RemyRoutineTriggerContext,
} from '@/lib/ai/remy-routines-types'

interface RawRoutineRow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: RemyRoutine['status']
  trigger_type: RemyRoutine['triggerType']
  trigger_config: Record<string, unknown> | null
  condition_group: RemyRoutineConditionGroup | null
  actions: RemyRoutine['actions'] | null
  priority: number | null
  approval_required: boolean | null
  idempotency_window_seconds: number | null
  created_by_auth_user_id: string | null
  updated_by_auth_user_id: string | null
  created_at: string
  updated_at: string
}

function routineFromRow(row: RawRoutineRow): RemyRoutine {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerType: row.trigger_type,
    triggerConfig: row.trigger_config ?? {},
    conditionGroup: row.condition_group ?? { mode: 'all', conditions: [] },
    actions: row.actions ?? [],
    priority: row.priority ?? 0,
    approvalRequired: Boolean(row.approval_required),
    idempotencyWindowSeconds: row.idempotency_window_seconds ?? 86400,
    createdByAuthUserId: row.created_by_auth_user_id,
    updatedByAuthUserId: row.updated_by_auth_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getByPath(source: unknown, path: string): unknown {
  if (!path || path.includes('__proto__') || path.includes('constructor')) return undefined

  let current: unknown = source
  for (const segment of path.split('.')) {
    if (!segment) return undefined
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function compareNumbers(actual: unknown, expected: unknown): [number, number] | null {
  const actualNumber = typeof actual === 'number' ? actual : Number(actual)
  const expectedNumber = typeof expected === 'number' ? expected : Number(expected)
  if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) return null
  return [actualNumber, expectedNumber]
}

function evaluateCondition(
  condition: RemyRoutineCondition,
  context: RemyRoutineTriggerContext
): RemyRoutineMatchConditionResult {
  const actual = getByPath(context, condition.path)
  const expected = condition.value
  let matched = false

  switch (condition.operator) {
    case 'exists':
      matched = actual !== undefined && actual !== null
      break
    case 'not_exists':
      matched = actual === undefined || actual === null
      break
    case 'equals':
      matched = actual === expected
      break
    case 'not_equals':
      matched = actual !== expected
      break
    case 'in':
      matched = Array.isArray(expected) && expected.includes(actual)
      break
    case 'not_in':
      matched = Array.isArray(expected) && !expected.includes(actual)
      break
    case 'contains':
      matched =
        (typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)) ||
        (Array.isArray(actual) && actual.includes(expected))
      break
    case 'not_contains':
      matched =
        (typeof actual === 'string' &&
          typeof expected === 'string' &&
          !actual.includes(expected)) ||
        (Array.isArray(actual) && !actual.includes(expected))
      break
    case 'greater_than': {
      const pair = compareNumbers(actual, expected)
      matched = pair ? pair[0] > pair[1] : false
      break
    }
    case 'greater_than_or_equal': {
      const pair = compareNumbers(actual, expected)
      matched = pair ? pair[0] >= pair[1] : false
      break
    }
    case 'less_than': {
      const pair = compareNumbers(actual, expected)
      matched = pair ? pair[0] < pair[1] : false
      break
    }
    case 'less_than_or_equal': {
      const pair = compareNumbers(actual, expected)
      matched = pair ? pair[0] <= pair[1] : false
      break
    }
    case 'starts_with':
      matched =
        typeof actual === 'string' && typeof expected === 'string' && actual.startsWith(expected)
      break
    case 'ends_with':
      matched =
        typeof actual === 'string' && typeof expected === 'string' && actual.endsWith(expected)
      break
  }

  return {
    path: condition.path,
    operator: condition.operator,
    expected,
    actual,
    matched,
  }
}

export function evaluateRemyRoutineConditions(
  group: RemyRoutineConditionGroup,
  context: RemyRoutineTriggerContext
): { matched: boolean; results: RemyRoutineMatchConditionResult[] } {
  const conditionResults = group.conditions.map((condition) =>
    evaluateCondition(condition, context)
  )
  const groupResults =
    group.groups?.map((child) => evaluateRemyRoutineConditions(child, context)) ?? []
  const booleans = [
    ...conditionResults.map((result) => result.matched),
    ...groupResults.map((result) => result.matched),
  ]
  const matched = group.mode === 'any' ? booleans.some(Boolean) : booleans.every(Boolean)

  return {
    matched: booleans.length === 0 ? true : matched,
    results: [...conditionResults, ...groupResults.flatMap((result) => result.results)],
  }
}

async function auditMatchAttempt(input: {
  tenantId: string
  authUserId?: string | null
  routineId: string | null
  context: RemyRoutineTriggerContext
  matched: boolean
  reason: string
  conditionResults: RemyRoutineMatchConditionResult[]
}): Promise<string | null> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_routine_match_audit')
    .insert({
      tenant_id: input.tenantId,
      routine_id: input.routineId,
      auth_user_id: input.authUserId ?? null,
      trigger_type: input.context.triggerType,
      trigger_source: input.context.source,
      trigger_key: input.context.triggerKey ?? null,
      matched: input.matched,
      reason: input.reason,
      condition_results: toSafeJsonb(input.conditionResults),
      trigger_context: toSafeJsonb(input.context),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to audit Remy routine match: ${error.message}`)
  }

  return (data?.id as string | undefined) ?? null
}

export async function matchRemyRoutinesForTenant(input: {
  tenantId: string
  authUserId?: string | null
  context: RemyRoutineTriggerContext
  limit?: number
}): Promise<RemyRoutineMatchResult[]> {
  const db: any = createServerClient()
  const limit = Math.min(Math.max(Math.floor(input.limit ?? 50), 1), 200)

  const { data, error } = await db
    .from('remy_routines')
    .select(
      'id, tenant_id, name, description, status, trigger_type, trigger_config, condition_group, actions, priority, approval_required, idempotency_window_seconds, created_by_auth_user_id, updated_by_auth_user_id, created_at, updated_at'
    )
    .eq('tenant_id', input.tenantId)
    .eq('status', 'active')
    .eq('trigger_type', input.context.triggerType)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to load Remy routines for matching: ${error.message}`)
  }

  const rows = (data ?? []) as RawRoutineRow[]

  if (rows.length === 0) {
    await auditMatchAttempt({
      tenantId: input.tenantId,
      authUserId: input.authUserId,
      routineId: null,
      context: input.context,
      matched: false,
      reason: 'No active routines for trigger type',
      conditionResults: [],
    })
    return []
  }

  const results: RemyRoutineMatchResult[] = []

  for (const row of rows) {
    const routine = routineFromRow(row)
    const evaluation = evaluateRemyRoutineConditions(routine.conditionGroup, input.context)
    const reason = evaluation.matched ? 'Conditions matched' : 'Conditions did not match'
    const matchAuditId = await auditMatchAttempt({
      tenantId: input.tenantId,
      authUserId: input.authUserId,
      routineId: routine.id,
      context: input.context,
      matched: evaluation.matched,
      reason,
      conditionResults: evaluation.results,
    })

    results.push({
      routine,
      matched: evaluation.matched,
      reason,
      conditionResults: evaluation.results,
      matchAuditId,
    })
  }

  return results.filter((result) => result.matched)
}

export async function matchRoutines(
  context: RemyRoutineTriggerContext,
  chefId: string
): Promise<RemyRoutineMatchResult[]> {
  return matchRemyRoutinesForTenant({
    tenantId: chefId,
    context,
  })
}

export const remyRoutinesMatcherInternals = {
  getByPath,
  evaluateCondition,
  auditMatchAttempt,
  routineFromRow,
}
