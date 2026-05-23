// Workflow Trail Server Actions
// Stop/resume state persistence for chef workflows.
// Saves exact position (page, step, form data, scroll) when chef stops mid-workflow.
// Resume picks up exactly where they left off.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ============================================
// TYPES
// ============================================

export type WorkflowType =
  | 'recipe_edit'
  | 'menu_build'
  | 'event_setup'
  | 'inquiry_response'
  | 'quote_draft'

export type TrailStatus = 'paused' | 'resumed' | 'completed' | 'abandoned'

export type WorkflowTrail = {
  id: string
  workflowType: WorkflowType
  entityId: string | null
  entityType: string | null
  activePath: string
  activeStep: string | null
  stepIndex: number
  scrollY: number
  formState: Record<string, unknown>
  metadata: Record<string, unknown>
  status: TrailStatus
  pausedAt: string
  resumedAt: string | null
  completedAt: string | null
}

export type PauseWorkflowInput = {
  workflowType: WorkflowType
  entityId?: string
  entityType?: string
  activePath: string
  activeStep?: string
  stepIndex?: number
  scrollY?: number
  formState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// ============================================
// 1. PAUSE WORKFLOW (save position)
// ============================================

/**
 * Save the chef's current position in a workflow.
 * Upserts: one active trail per workflow_type + entity_id per tenant.
 */
export async function pauseWorkflow(
  input: PauseWorkflowInput
): Promise<{ success: boolean; trailId?: string; error?: string }> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    const { data, error } = await db
      .from('workflow_trails')
      .upsert(
        {
          tenant_id: user.tenantId!,
          actor_id: user.id,
          workflow_type: input.workflowType,
          entity_id: input.entityId || null,
          entity_type: input.entityType || null,
          active_path: input.activePath,
          active_step: input.activeStep || null,
          step_index: input.stepIndex ?? 0,
          scroll_y: input.scrollY ?? 0,
          form_state: input.formState ?? {},
          metadata: input.metadata ?? {},
          status: 'paused',
          paused_at: new Date().toISOString(),
          resumed_at: null,
          completed_at: null,
        },
        { onConflict: 'tenant_id,workflow_type,entity_id' }
      )
      .select('id')
      .single()

    if (error) {
      console.error('[pauseWorkflow] Error:', error)
      return { success: false, error: 'Failed to save workflow position.' }
    }

    return { success: true, trailId: data?.id }
  } catch (err: any) {
    console.error('[pauseWorkflow]', err)
    return { success: false, error: 'Failed to save workflow position.' }
  }
}

// ============================================
// 2. RESUME WORKFLOW (mark as resumed)
// ============================================

/**
 * Mark a workflow trail as resumed. Returns the saved position data.
 */
export async function resumeWorkflow(trailId: string): Promise<{
  success: boolean
  trail?: WorkflowTrail
  error?: string
}> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    const { data: trail, error: fetchError } = await db
      .from('workflow_trails')
      .select('*')
      .eq('id', trailId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (fetchError || !trail) {
      return { success: false, error: 'Trail not found.' }
    }

    // Mark as resumed
    await db
      .from('workflow_trails')
      .update({
        status: 'resumed',
        resumed_at: new Date().toISOString(),
      })
      .eq('id', trailId)
      .eq('tenant_id', user.tenantId!)

    return {
      success: true,
      trail: mapTrailRow(trail),
    }
  } catch (err: any) {
    console.error('[resumeWorkflow]', err)
    return { success: false, error: 'Failed to resume workflow.' }
  }
}

// ============================================
// 3. COMPLETE WORKFLOW (mark as done)
// ============================================

/**
 * Mark a workflow trail as completed. Cleans up the saved state.
 */
export async function completeWorkflow(
  workflowType: WorkflowType,
  entityId?: string
): Promise<{ success: boolean }> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    let query = db
      .from('workflow_trails')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('tenant_id', user.tenantId!)
      .eq('workflow_type', workflowType)

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    await query
    return { success: true }
  } catch (err: any) {
    console.error('[completeWorkflow]', err)
    return { success: false }
  }
}

// ============================================
// 4. GET ACTIVE TRAILS (paused workflows)
// ============================================

/**
 * Get all paused workflows for the current chef.
 * Used by the dashboard "Pick up where you left off" section.
 */
export async function getActiveTrails(): Promise<WorkflowTrail[]> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    const { data, error } = await db
      .from('workflow_trails')
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'paused')
      .order('paused_at', { ascending: false })
      .limit(20)

    if (error || !data) return []

    return (data as any[]).map(mapTrailRow)
  } catch {
    return []
  }
}

// ============================================
// 5. GET TRAIL FOR ENTITY
// ============================================

/**
 * Check if a specific entity has a paused workflow trail.
 * Used when navigating to a recipe/menu/event to offer "resume" option.
 */
export async function getTrailForEntity(
  workflowType: WorkflowType,
  entityId: string
): Promise<WorkflowTrail | null> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    const { data, error } = await db
      .from('workflow_trails')
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('workflow_type', workflowType)
      .eq('entity_id', entityId)
      .eq('status', 'paused')
      .single()

    if (error || !data) return null

    return mapTrailRow(data)
  } catch {
    return null
  }
}

// ============================================
// 6. ABANDON TRAIL
// ============================================

/**
 * Mark a workflow trail as abandoned (chef chose to start fresh).
 */
export async function abandonTrail(trailId: string): Promise<{ success: boolean }> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    await db
      .from('workflow_trails')
      .update({ status: 'abandoned' })
      .eq('id', trailId)
      .eq('tenant_id', user.tenantId!)

    return { success: true }
  } catch {
    return { success: false }
  }
}

// ============================================
// HELPERS
// ============================================

function mapTrailRow(row: any): WorkflowTrail {
  return {
    id: row.id,
    workflowType: row.workflow_type,
    entityId: row.entity_id,
    entityType: row.entity_type,
    activePath: row.active_path,
    activeStep: row.active_step,
    stepIndex: row.step_index ?? 0,
    scrollY: row.scroll_y ?? 0,
    formState: row.form_state ?? {},
    metadata: row.metadata ?? {},
    status: row.status,
    pausedAt: row.paused_at,
    resumedAt: row.resumed_at,
    completedAt: row.completed_at,
  }
}
