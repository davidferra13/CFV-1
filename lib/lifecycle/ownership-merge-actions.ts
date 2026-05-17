'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  OwnershipAssignment,
  MergePlan,
  HandoffRule,
  OwnershipSummary,
  OwnerRole,
  MergeStrategy,
} from './ownership-merge-types'

// ---- helpers ----

function fromOwnershipAssignments(db: any): any {
  return (db as any).from('ownership_assignments')
}

function fromMergePlans(db: any): any {
  return (db as any).from('merge_plans')
}

function fromHandoffRules(db: any): any {
  return (db as any).from('handoff_rules')
}

// ---- actions ----

export async function getOwnershipAssignments(eventId?: string): Promise<OwnershipAssignment[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromOwnershipAssignments(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('assigned_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load ownership assignments: ${error.message}`)
  return (data ?? []).map(mapAssignment)
}

export async function upsertOwnershipAssignment(params: {
  eventId: string
  lifecycleStage: string
  ownerId: string
  ownerName: string
  role?: OwnerRole
  active?: boolean
}): Promise<OwnershipAssignment> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    lifecycle_stage: params.lifecycleStage,
    owner_id: params.ownerId,
    owner_name: params.ownerName,
  }
  if (params.role !== undefined) payload.role = params.role
  if (params.active !== undefined) payload.active = params.active

  const { data, error } = await fromOwnershipAssignments(db)
    .upsert(payload, { onConflict: 'tenant_id,event_id,lifecycle_stage,owner_id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert ownership assignment: ${error.message}`)
  return mapAssignment(data)
}

export async function getMergePlans(eventId?: string): Promise<MergePlan[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromMergePlans(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load merge plans: ${error.message}`)
  return (data ?? []).map(mapMergePlan)
}

export async function createMergePlan(params: {
  eventId: string
  title: string
  sourceStages: string[]
  targetStage: string
  strategy?: MergeStrategy
}): Promise<MergePlan> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    title: params.title,
    source_stages: params.sourceStages,
    target_stage: params.targetStage,
  }
  if (params.strategy !== undefined) payload.strategy = params.strategy

  const { data, error } = await fromMergePlans(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to create merge plan: ${error.message}`)
  return mapMergePlan(data)
}

export async function getHandoffRules(): Promise<HandoffRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromHandoffRules(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load handoff rules: ${error.message}`)
  return (data ?? []).map(mapHandoffRule)
}

export async function getOwnershipSummary(eventId: string): Promise<OwnershipSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Count assignments
  const { data: assignments, error: assignErr } = await fromOwnershipAssignments(db)
    .select('id, active')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)

  if (assignErr) throw new Error(`Failed to load assignment summary: ${assignErr.message}`)

  const allAssignments = assignments ?? []
  const activeOwners = allAssignments.filter((a: any) => a.active).length

  // Count active merge plans
  const { data: plans, error: planErr } = await fromMergePlans(db)
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .eq('status', 'active')

  if (planErr) throw new Error(`Failed to load merge plan summary: ${planErr.message}`)

  // Count pending handoffs (rules without a matching active assignment in to_stage)
  const { data: rules, error: ruleErr } = await fromHandoffRules(db)
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('requires_approval', true)

  if (ruleErr) throw new Error(`Failed to load handoff summary: ${ruleErr.message}`)

  return {
    eventId,
    totalAssignments: allAssignments.length,
    activeOwners,
    pendingHandoffs: (rules ?? []).length,
    mergePlansActive: (plans ?? []).length,
  }
}

// ---- mappers ----

function mapAssignment(row: any): OwnershipAssignment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    lifecycleStage: row.lifecycle_stage,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    role: row.role,
    active: row.active ?? true,
    assignedAt: row.assigned_at,
    createdAt: row.created_at,
  }
}

function mapMergePlan(row: any): MergePlan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    title: row.title,
    sourceStages: row.source_stages ?? [],
    targetStage: row.target_stage,
    strategy: row.strategy,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  }
}

function mapHandoffRule(row: any): HandoffRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    requiresApproval: row.requires_approval ?? false,
    checklist: row.checklist ?? {},
    autoAssignTo: row.auto_assign_to ?? null,
    createdAt: row.created_at,
  }
}
