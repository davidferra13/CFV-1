'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  archiveConstraintFact,
  confirmConstraintFact,
  deleteConstraintFact,
  normalizeQuickConstraintCapture,
  normalizeStructuredConstraintCapture,
  renewConstraintFact,
  type ChefLifeConstraintDomain,
  type ChefLifeConstraintFact,
  type ChefLifeConstraintVisibility,
  type QuickConstraintCaptureInput,
  type StructuredConstraintCaptureInput,
} from './chef-life-constraint-capture-contract'

const TABLE = 'chef_life_private_constraints'

type ConstraintRow = {
  id: string
  tenant_id: string
  chef_id: string
  domain: ChefLifeConstraintDomain
  kind: string
  label: string
  value: string
  private_notes: string | null
  state: ChefLifeConstraintFact['state']
  visibility: ChefLifeConstraintVisibility
  source: ChefLifeConstraintFact['source']
  confidence: ChefLifeConstraintFact['confidence']
  freshness: ChefLifeConstraintFact['freshness']
  last_confirmed_at: string | null
  stale_after: string | null
  evidence_attachments: ChefLifeConstraintFact['evidence'] | null
  overshare_warnings: string[] | null
  archived_at: string | null
  deleted_at: string | null
}

export async function quickCaptureChefLifeConstraint(
  note: string,
  domain?: ChefLifeConstraintDomain
): Promise<ChefLifeConstraintFact> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId || tenantId
  const db: any = createServerClient()
  const fact = normalizeQuickConstraintCapture({
    tenantId,
    chefId,
    note,
    domain,
  } satisfies QuickConstraintCaptureInput)

  const { data, error } = await db.from(TABLE).insert(toInsertRow(fact)).select().single()
  if (error) throw new Error('Failed to quick-capture chef life constraint')

  revalidatePath('/capture')
  return mapConstraintRow(data)
}

export async function createStructuredChefLifeConstraint(
  input: Omit<StructuredConstraintCaptureInput, 'tenantId' | 'chefId'>
): Promise<ChefLifeConstraintFact> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId || tenantId
  const db: any = createServerClient()
  const fact = normalizeStructuredConstraintCapture({
    ...input,
    tenantId,
    chefId,
  })

  const { data, error } = await db.from(TABLE).insert(toInsertRow(fact)).select().single()
  if (error) throw new Error('Failed to create chef life constraint')

  revalidatePath('/capture')
  return mapConstraintRow(data)
}

export async function getChefLifeConstraints(
  input: {
    domain?: ChefLifeConstraintDomain
    includeArchived?: boolean
    includeDeleted?: boolean
    limit?: number
  } = {}
): Promise<ChefLifeConstraintFact[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let query = db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(input.limit ?? 100)

  if (input.domain) query = query.eq('domain', input.domain)
  if (!input.includeArchived) query = query.neq('state', 'archived')
  if (!input.includeDeleted) query = query.neq('state', 'deleted')

  const { data, error } = await query
  if (error) throw new Error('Failed to load chef life constraints')
  return (data ?? []).map(mapConstraintRow)
}

export async function confirmChefLifeConstraint(id: string): Promise<ChefLifeConstraintFact> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const current = await getTenantScopedConstraint(id, tenantId)
  const fact = confirmConstraintFact(current)
  return updateTenantScopedConstraint(fact, tenantId)
}

export async function renewChefLifeConstraint(
  id: string,
  input: { value?: string | null; privateNotes?: string | null; staleAfter?: string | null }
): Promise<ChefLifeConstraintFact> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const current = await getTenantScopedConstraint(id, tenantId)
  const fact = renewConstraintFact(current, input)
  return updateTenantScopedConstraint(fact, tenantId)
}

export async function archiveChefLifeConstraint(
  id: string,
  reason?: string
): Promise<ChefLifeConstraintFact> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const current = await getTenantScopedConstraint(id, tenantId)
  const fact = archiveConstraintFact(current, { reason })
  return updateTenantScopedConstraint(fact, tenantId)
}

export async function deleteChefLifeConstraint(
  id: string,
  confirmation: string
): Promise<ChefLifeConstraintFact> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const current = await getTenantScopedConstraint(id, tenantId)
  const fact = deleteConstraintFact(current, { confirmation })
  return updateTenantScopedConstraint(fact, tenantId)
}

async function getTenantScopedConstraint(
  id: string,
  tenantId: string
): Promise<ChefLifeConstraintFact> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) throw new Error('Chef life constraint not found')
  return mapConstraintRow(data)
}

async function updateTenantScopedConstraint(
  fact: ChefLifeConstraintFact,
  tenantId: string
): Promise<ChefLifeConstraintFact> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from(TABLE)
    .update(toUpdateRow(fact))
    .eq('id', fact.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error || !data) throw new Error('Failed to update chef life constraint')
  revalidatePath('/capture')
  return mapConstraintRow(data)
}

function toInsertRow(fact: ChefLifeConstraintFact): Record<string, unknown> {
  return {
    tenant_id: fact.tenantId,
    chef_id: fact.chefId,
    domain: fact.domain,
    kind: fact.kind,
    label: fact.label,
    value: fact.value,
    private_notes: fact.privateNotes,
    state: fact.state,
    visibility: fact.visibility,
    source: fact.source,
    confidence: fact.confidence,
    freshness: fact.freshness,
    last_confirmed_at: fact.lastConfirmedAt,
    stale_after: fact.staleAfter,
    evidence_attachments: fact.evidence,
    overshare_warnings: fact.overshareWarnings,
    archived_at: fact.archivedAt,
    deleted_at: fact.deletedAt,
  }
}

function toUpdateRow(fact: ChefLifeConstraintFact): Record<string, unknown> {
  return {
    domain: fact.domain,
    kind: fact.kind,
    label: fact.label,
    value: fact.value,
    private_notes: fact.privateNotes,
    state: fact.state,
    visibility: fact.visibility,
    source: fact.source,
    confidence: fact.confidence,
    freshness: fact.freshness,
    last_confirmed_at: fact.lastConfirmedAt,
    stale_after: fact.staleAfter,
    evidence_attachments: fact.evidence,
    overshare_warnings: fact.overshareWarnings,
    archived_at: fact.archivedAt,
    deleted_at: fact.deletedAt,
    updated_at: new Date().toISOString(),
  }
}

function mapConstraintRow(row: ConstraintRow): ChefLifeConstraintFact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    chefId: row.chef_id,
    domain: row.domain,
    kind: row.kind,
    label: row.label,
    value: row.value,
    privateNotes: row.private_notes,
    state: row.state,
    visibility: row.visibility,
    source: row.source,
    confidence: row.confidence,
    freshness: row.freshness,
    lastConfirmedAt: row.last_confirmed_at,
    staleAfter: row.stale_after,
    evidence: row.evidence_attachments ?? [],
    overshareWarnings: row.overshare_warnings ?? [],
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
  }
}
