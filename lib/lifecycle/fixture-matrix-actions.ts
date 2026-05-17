'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  GateCriterion,
  GateResult,
  FinishGate,
  FixtureMatrixSummary,
  CheckType,
  GateStatus,
} from './fixture-matrix-types'

// ---- helpers ----

function fromGateCriteria(db: any): any {
  return (db as any).from('gate_criteria')
}

function fromGateResults(db: any): any {
  return (db as any).from('gate_results')
}

function fromFinishGates(db: any): any {
  return (db as any).from('finish_gates')
}

// ---- actions ----

export async function getGateCriteria(lifecycleStage?: string): Promise<GateCriterion[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromGateCriteria(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })

  if (lifecycleStage) {
    query = query.eq('lifecycle_stage', lifecycleStage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load gate criteria: ${error.message}`)
  return (data ?? []).map(mapCriterion)
}

export async function upsertGateCriterion(params: {
  lifecycleStage: string
  criterionName: string
  description?: string
  checkType?: CheckType
  required?: boolean
  sortOrder?: number
}): Promise<GateCriterion> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    lifecycle_stage: params.lifecycleStage,
    criterion_name: params.criterionName,
  }
  if (params.description !== undefined) payload.description = params.description
  if (params.checkType !== undefined) payload.check_type = params.checkType
  if (params.required !== undefined) payload.required = params.required
  if (params.sortOrder !== undefined) payload.sort_order = params.sortOrder

  const { data, error } = await fromGateCriteria(db)
    .upsert(payload, { onConflict: 'tenant_id,lifecycle_stage,criterion_name' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert gate criterion: ${error.message}`)
  return mapCriterion(data)
}

export async function getGateResults(
  eventId: string,
  lifecycleStage?: string
): Promise<GateResult[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromGateResults(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .order('checked_at', { ascending: false })

  if (lifecycleStage) {
    // Join through criterion to filter by stage
    query = fromGateResults(db)
      .select('gate_results.*, gate_criteria!inner(lifecycle_stage)')
      .eq('gate_results.tenant_id', user.tenantId)
      .eq('gate_results.event_id', eventId)
      .eq('gate_criteria.lifecycle_stage', lifecycleStage)
      .order('checked_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load gate results: ${error.message}`)
  return (data ?? []).map(mapResult)
}

export async function recordGateResult(params: {
  eventId: string
  criterionId: string
  passed: boolean
  evidence?: Record<string, unknown>
  notes?: string
}): Promise<GateResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    criterion_id: params.criterionId,
    passed: params.passed,
    checked_by: user.id,
    checked_at: new Date().toISOString(),
  }
  if (params.evidence !== undefined) payload.evidence = params.evidence
  if (params.notes !== undefined) payload.notes = params.notes

  const { data, error } = await fromGateResults(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to record gate result: ${error.message}`)
  return mapResult(data)
}

export async function getFinishGates(eventId?: string): Promise<FinishGate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromFinishGates(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load finish gates: ${error.message}`)
  return (data ?? []).map(mapGate)
}

export async function evaluateFinishGate(params: {
  eventId: string
  lifecycleStage: string
}): Promise<FinishGate> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all criteria for this stage
  const { data: criteria, error: critErr } = await fromGateCriteria(db)
    .select('id, required')
    .eq('tenant_id', user.tenantId)
    .eq('lifecycle_stage', params.lifecycleStage)

  if (critErr) throw new Error(`Failed to load criteria for evaluation: ${critErr.message}`)

  const criteriaIds = (criteria ?? []).map((c: any) => c.id)
  const totalCriteria = criteriaIds.length

  // Get results for these criteria on this event
  const { data: results, error: resErr } = await fromGateResults(db)
    .select('criterion_id, passed')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', params.eventId)
    .in('criterion_id', criteriaIds.length > 0 ? criteriaIds : ['__none__'])

  if (resErr) throw new Error(`Failed to load results for evaluation: ${resErr.message}`)

  const passedSet = new Set(
    (results ?? []).filter((r: any) => r.passed).map((r: any) => r.criterion_id)
  )
  const passedCriteria = passedSet.size

  // Check if all required criteria passed
  const requiredIds = (criteria ?? []).filter((c: any) => c.required).map((c: any) => c.id)
  const allRequiredPassed = requiredIds.every((id: string) => passedSet.has(id))

  let status: GateStatus = 'open'
  if (totalCriteria > 0 && passedCriteria === totalCriteria) {
    status = 'passed'
  } else if (totalCriteria > 0 && !allRequiredPassed && passedCriteria > 0) {
    status = 'failed'
  }

  const payload = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    lifecycle_stage: params.lifecycleStage,
    total_criteria: totalCriteria,
    passed_criteria: passedCriteria,
    status,
    evaluated_at: new Date().toISOString(),
  }

  const { data, error } = await fromFinishGates(db)
    .upsert(payload, { onConflict: 'tenant_id,event_id,lifecycle_stage' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to evaluate finish gate: ${error.message}`)
  return mapGate(data)
}

export async function getFixtureMatrixSummary(): Promise<FixtureMatrixSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all gates
  const { data: gates, error: gateErr } = await fromFinishGates(db)
    .select('status')
    .eq('tenant_id', user.tenantId)

  if (gateErr) throw new Error(`Failed to load gate summary: ${gateErr.message}`)

  const allGates = gates ?? []
  const passedGates = allGates.filter((g: any) => g.status === 'passed').length
  const failedGates = allGates.filter((g: any) => g.status === 'failed').length
  const waivedGates = allGates.filter((g: any) => g.status === 'waived').length

  // Get criteria counts by stage
  const { data: criteria, error: critErr } = await fromGateCriteria(db)
    .select('lifecycle_stage')
    .eq('tenant_id', user.tenantId)

  if (critErr) throw new Error(`Failed to load criteria summary: ${critErr.message}`)

  const criteriaByStage: Record<string, number> = {}
  for (const c of criteria ?? []) {
    criteriaByStage[c.lifecycle_stage] = (criteriaByStage[c.lifecycle_stage] || 0) + 1
  }

  return {
    totalGates: allGates.length,
    passedGates,
    failedGates,
    waivedGates,
    criteriaByStage,
  }
}

// ---- mappers ----

function mapCriterion(row: any): GateCriterion {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    criterionName: row.criterion_name,
    description: row.description ?? null,
    checkType: row.check_type,
    required: row.required ?? true,
    sortOrder: row.sort_order ?? 0,
    createdAt: new Date(row.created_at),
  }
}

function mapResult(row: any): GateResult {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    criterionId: row.criterion_id,
    passed: row.passed,
    evidence: row.evidence ?? null,
    checkedBy: row.checked_by ?? null,
    checkedAt: new Date(row.checked_at),
    notes: row.notes ?? null,
    createdAt: new Date(row.created_at),
  }
}

function mapGate(row: any): FinishGate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    lifecycleStage: row.lifecycle_stage,
    totalCriteria: row.total_criteria,
    passedCriteria: row.passed_criteria,
    status: row.status,
    evaluatedAt: row.evaluated_at ? new Date(row.evaluated_at) : null,
    createdAt: new Date(row.created_at),
  }
}
