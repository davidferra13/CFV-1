'use server'

// Remy Draft Boundary Actions
// Enforces: Remy suggests, chef decides. No auto-execution of lifecycle transitions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { EventStatus } from '@/lib/events/fsm'
import type {
  DraftedTransition,
  DraftBoundaryConfig,
  DraftBoundaryOverride,
  DraftBoundaryResult,
} from './draft-boundary-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapDraft(row: any): DraftedTransition {
  return {
    id: row.id,
    eventId: row.event_id,
    chefId: row.chef_id,
    fromState: row.from_state as EventStatus,
    toState: row.to_state as EventStatus,
    reason: row.reason ?? '',
    remyConfidence: parseFloat(row.remy_confidence) || 0,
    evidence: Array.isArray(row.evidence) ? row.evidence : JSON.parse(row.evidence || '[]'),
    draftStatus: row.draft_status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
  }
}

// ---------------------------------------------------------------------------
// 1. createDraftTransition - Remy creates a draft (does NOT execute)
// ---------------------------------------------------------------------------
export async function createDraftTransition(
  eventId: string,
  toState: string,
  reason: string,
  confidence: number,
  evidence: string[]
): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Fetch event to get current state and verify ownership
  const { data: event, error: fetchErr } = await db
    .from('events')
    .select('id, status, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId)
    .single()

  if (fetchErr || !event) {
    return { success: false, error: 'Event not found or not owned by this chef' }
  }

  const fromState = event.status as string

  // Clamp confidence to 0-1
  const clampedConfidence = Math.max(0, Math.min(1, confidence))

  const { data, error } = await db
    .from('remy_drafted_transitions')
    .insert({
      event_id: eventId,
      chef_id: chef.tenantId,
      from_state: fromState,
      to_state: toState,
      reason: reason || '',
      remy_confidence: clampedConfidence,
      evidence: JSON.stringify(evidence || []),
      draft_status: 'pending',
    })
    .select('*')
    .single()

  if (error) {
    return { success: false, error: `Failed to create draft: ${error.message}` }
  }

  return { success: true, draft: mapDraft(data) }
}

// ---------------------------------------------------------------------------
// 2. getPendingDrafts - list pending drafts for chef review
// ---------------------------------------------------------------------------
export async function getPendingDrafts(eventId?: string): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('remy_drafted_transitions')
    .select('*')
    .eq('chef_id', chef.tenantId)
    .eq('draft_status', 'pending')
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: `Failed to fetch drafts: ${error.message}` }
  }

  return { success: true, drafts: (data || []).map(mapDraft) }
}

// ---------------------------------------------------------------------------
// 3. approveDraft - chef approves, then executes the actual transition
// ---------------------------------------------------------------------------
export async function approveDraft(draftId: string, reason?: string): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Fetch draft and verify ownership + pending status
  const { data: draft, error: fetchErr } = await db
    .from('remy_drafted_transitions')
    .select('*')
    .eq('id', draftId)
    .eq('chef_id', chef.tenantId)
    .single()

  if (fetchErr || !draft) {
    return { success: false, error: 'Draft not found or not owned by this chef' }
  }

  if (draft.draft_status !== 'pending') {
    return { success: false, error: `Draft is already ${draft.draft_status}, cannot approve` }
  }

  // Check expiration
  if (new Date(draft.expires_at) < new Date()) {
    await db.from('remy_drafted_transitions').update({ draft_status: 'expired' }).eq('id', draftId)
    return { success: false, error: 'Draft has expired' }
  }

  // Execute the actual lifecycle transition
  try {
    const { transitionEvent } = await import('@/lib/events/transitions')
    const transitionResult = await transitionEvent({
      eventId: draft.event_id,
      toStatus: draft.to_state as EventStatus,
      metadata: {
        source: 'remy_draft_approved',
        draft_id: draftId,
        remy_confidence: parseFloat(draft.remy_confidence),
        remy_reason: draft.reason,
        approval_reason: reason || null,
      },
    })

    // Check if transition succeeded
    if (transitionResult && typeof transitionResult === 'object' && 'success' in transitionResult) {
      if (!transitionResult.success) {
        return {
          success: false,
          error: `Transition failed: ${'error' in transitionResult ? transitionResult.error : 'unknown error'}`,
        }
      }
    }
  } catch (err) {
    return {
      success: false,
      error: `Transition execution failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // Mark draft as approved
  const { data: updated, error: updateErr } = await db
    .from('remy_drafted_transitions')
    .update({
      draft_status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: chef.id,
    })
    .eq('id', draftId)
    .select('*')
    .single()

  if (updateErr) {
    // Transition succeeded but draft status update failed; log but don't error
    return { success: true, draft: mapDraft(draft) }
  }

  return { success: true, draft: mapDraft(updated) }
}

// ---------------------------------------------------------------------------
// 4. rejectDraft - chef rejects
// ---------------------------------------------------------------------------
export async function rejectDraft(draftId: string, reason: string): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: draft, error: fetchErr } = await db
    .from('remy_drafted_transitions')
    .select('*')
    .eq('id', draftId)
    .eq('chef_id', chef.tenantId)
    .single()

  if (fetchErr || !draft) {
    return { success: false, error: 'Draft not found or not owned by this chef' }
  }

  if (draft.draft_status !== 'pending') {
    return { success: false, error: `Draft is already ${draft.draft_status}, cannot reject` }
  }

  const { data: updated, error: updateErr } = await db
    .from('remy_drafted_transitions')
    .update({
      draft_status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: chef.id,
      reason: `${draft.reason}\n[Rejected: ${reason}]`,
    })
    .eq('id', draftId)
    .select('*')
    .single()

  if (updateErr) {
    return { success: false, error: `Failed to reject draft: ${updateErr.message}` }
  }

  return { success: true, draft: mapDraft(updated) }
}

// ---------------------------------------------------------------------------
// 5. expireOldDrafts - mark expired drafts (>24h old by default)
// ---------------------------------------------------------------------------
export async function expireOldDrafts(): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_drafted_transitions')
    .update({ draft_status: 'expired' })
    .eq('chef_id', chef.tenantId)
    .eq('draft_status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('*')

  if (error) {
    return { success: false, error: `Failed to expire drafts: ${error.message}` }
  }

  return { success: true, drafts: (data || []).map(mapDraft) }
}

// ---------------------------------------------------------------------------
// 6. getDraftHistory - full audit trail of drafts for an event
// ---------------------------------------------------------------------------
export async function getDraftHistory(eventId: string): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_drafted_transitions')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', chef.tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: `Failed to fetch draft history: ${error.message}` }
  }

  return { success: true, drafts: (data || []).map(mapDraft) }
}

// ---------------------------------------------------------------------------
// 7. getDraftBoundaryConfig - get which transitions need draft approval
// ---------------------------------------------------------------------------
export async function getDraftBoundaryConfig(): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('draft_boundary_config')
    .select('*')
    .eq('chef_id', chef.tenantId)
    .order('transition_from')

  if (error) {
    return { success: false, error: `Failed to fetch config: ${error.message}` }
  }

  const overrides: DraftBoundaryOverride[] = (data || []).map((row: any) => ({
    transitionFrom: row.transition_from as EventStatus,
    transitionTo: row.transition_to as EventStatus,
    requiresApproval: row.requires_approval,
  }))

  return {
    success: true,
    config: {
      chefId: chef.tenantId!,
      overrides,
    },
  }
}

// ---------------------------------------------------------------------------
// 8. updateDraftBoundaryConfig - chef configures which transitions need approval
// ---------------------------------------------------------------------------
export async function updateDraftBoundaryConfig(
  overrides: Array<{ transitionFrom: string; transitionTo: string; requiresApproval: boolean }>
): Promise<DraftBoundaryResult> {
  const chef = await requireChef()
  const db: any = createServerClient()

  for (const override of overrides) {
    const { error } = await db.from('draft_boundary_config').upsert(
      {
        chef_id: chef.tenantId,
        transition_from: override.transitionFrom,
        transition_to: override.transitionTo,
        requires_approval: override.requiresApproval,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id,transition_from,transition_to' }
    )

    if (error) {
      return { success: false, error: `Failed to update config: ${error.message}` }
    }
  }

  // Return updated config
  return getDraftBoundaryConfig()
}

// ---------------------------------------------------------------------------
// 9. isDraftRequired - check if a specific transition needs draft approval
// ---------------------------------------------------------------------------
export async function isDraftRequired(fromState: string, toState: string): Promise<boolean> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Check chef's boundary config for this specific transition
  const { data } = await db
    .from('draft_boundary_config')
    .select('requires_approval')
    .eq('chef_id', chef.tenantId)
    .eq('transition_from', fromState)
    .eq('transition_to', toState)
    .maybeSingle()

  // If chef has configured this transition, use their setting
  if (data !== null && data !== undefined) {
    return data.requires_approval
  }

  // Default: ALL Remy-initiated transitions require approval (safe default)
  return true
}
