'use server'

// Remy Skill Proposals - Server Actions
// Generate, review, and list skill proposals from high-frequency routines.
// All operations auth-gated and tenant-scoped.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SkillProposal,
  SkillProposalCandidate,
  SkillProposalStatus,
  SkillTemplate,
} from './skill-proposal-types'

const USAGE_THRESHOLD = 5

// ---- Generate Skill Proposal ----

/**
 * Extract a routine pattern (used 5+ times successfully) into a skill template.
 * Creates a pending proposal for chef review.
 */
export async function generateSkillProposal(
  routineId: string
): Promise<{ success: boolean; proposal?: SkillProposal; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify routine belongs to tenant
  const { data: routine, error: routineErr } = await db
    .from('remy_routines')
    .select('*')
    .eq('id', routineId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (routineErr || !routine) {
    return { success: false, error: 'Routine not found or access denied.' }
  }

  // Count successful executions
  const { count, error: countErr } = await db
    .from('remy_routine_executions')
    .select('*', { count: 'exact', head: true })
    .eq('routine_id', routineId)
    .eq('tenant_id', user.tenantId)
    .eq('status', 'success')

  if (countErr) {
    return { success: false, error: `Failed to count executions: ${countErr.message}` }
  }

  if ((count ?? 0) < USAGE_THRESHOLD) {
    return {
      success: false,
      error: `Routine has ${count ?? 0} successful uses. Needs at least ${USAGE_THRESHOLD}.`,
    }
  }

  // Check for existing pending proposal for this routine
  const { data: existing } = await db
    .from('remy_skill_proposals')
    .select('id')
    .eq('routine_id', routineId)
    .eq('tenant_id', user.tenantId)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, error: 'A pending proposal already exists for this routine.' }
  }

  // Build skill template from routine
  const template: SkillTemplate = {
    name: routine.name,
    description: routine.description || `Skill extracted from routine "${routine.name}"`,
    trigger_type: routine.trigger_type,
    trigger_config: routine.trigger_config ?? {},
    condition_group: routine.condition_group ?? { mode: 'all', conditions: [] },
    actions: (routine.actions ?? []).map((a: Record<string, unknown>) => ({
      kind: a.kind ?? 'record_routine_event',
      label: a.label ?? '',
      payload: a.payload ?? {},
    })),
    source_routine_id: routineId,
    extracted_at: new Date().toISOString(),
  }

  const { data: proposal, error: insertErr } = await db
    .from('remy_skill_proposals')
    .insert({
      routine_id: routineId,
      skill_template: template,
      usage_count: count ?? 0,
      status: 'pending',
      tenant_id: user.tenantId,
    })
    .select('*')
    .single()

  if (insertErr) {
    return { success: false, error: `Failed to create proposal: ${insertErr.message}` }
  }

  return { success: true, proposal }
}

// ---- Review Skill Proposal ----

/**
 * Chef approves or rejects a skill proposal.
 */
export async function reviewSkillProposal(
  proposalId: string,
  decision: 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_skill_proposals')
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', proposalId)
    .eq('tenant_id', user.tenantId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    return { success: false, error: `Failed to update proposal: ${error.message}` }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Proposal not found, already reviewed, or access denied.' }
  }

  return { success: true }
}

// ---- Get Proposal Candidates ----

/**
 * List routines that meet the 5+ successful executions threshold
 * and do not already have a pending proposal.
 */
export async function getProposalCandidates(): Promise<SkillProposalCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all active routines for this tenant
  const { data: routines, error: routinesErr } = await db
    .from('remy_routines')
    .select('id, name')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'active')

  if (routinesErr || !routines || routines.length === 0) return []

  // Get execution counts per routine (successful only)
  const routineIds: string[] = routines.map((r: { id: string }) => r.id)

  const { data: executions, error: execErr } = await db
    .from('remy_routine_executions')
    .select('routine_id, finished_at')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'success')
    .in('routine_id', routineIds)

  if (execErr) return []

  // Count per routine
  const countMap = new Map<string, { count: number; lastAt: string | null }>()
  for (const exec of executions ?? []) {
    const entry = countMap.get(exec.routine_id) ?? { count: 0, lastAt: null }
    entry.count++
    if (!entry.lastAt || (exec.finished_at && exec.finished_at > entry.lastAt)) {
      entry.lastAt = exec.finished_at
    }
    countMap.set(exec.routine_id, entry)
  }

  // Filter to threshold
  const qualified = routines
    .filter((r: { id: string }) => {
      const entry = countMap.get(r.id)
      return entry && entry.count >= USAGE_THRESHOLD
    })
    .map((r: { id: string; name: string }) => {
      const entry = countMap.get(r.id)!
      return {
        routine_id: r.id,
        routine_name: r.name,
        successful_executions: entry.count,
        last_executed_at: entry.lastAt,
      }
    })

  // Exclude routines that already have a pending proposal
  if (qualified.length === 0) return []

  const qualifiedIds = qualified.map((q: SkillProposalCandidate) => q.routine_id)
  const { data: existingProposals } = await db
    .from('remy_skill_proposals')
    .select('routine_id')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'pending')
    .in('routine_id', qualifiedIds)

  const pendingSet = new Set(
    (existingProposals ?? []).map((p: { routine_id: string }) => p.routine_id)
  )

  return qualified.filter((q: SkillProposalCandidate) => !pendingSet.has(q.routine_id))
}

// ---- Get Skill Proposals ----

/**
 * List all proposals with optional status filter.
 */
export async function getSkillProposals(
  statusFilter?: SkillProposalStatus
): Promise<SkillProposal[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('remy_skill_proposals')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch skill proposals: ${error.message}`)
  }

  return data ?? []
}
