// Workflow Server Actions
// Chef-facing CRUD for workflow templates, steps, executions, and logs.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowExecution,
  WorkflowExecutionLog,
} from './workflow-types'

// ─── Validation Schemas ─────────────────────────────────────────────────────

const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name required').max(200),
  description: z.string().max(1000).optional(),
  trigger_type: z.enum([
    'event_stage_changed',
    'inquiry_created',
    'quote_sent',
    'quote_viewed',
    'contract_signed',
    'payment_received',
    'days_before_event',
    'days_after_event',
  ]),
  trigger_config: z.record(z.string(), z.unknown()).default({}),
  steps: z
    .array(
      z.object({
        step_order: z.number().int().min(1),
        delay_hours: z.number().int().min(0).default(0),
        condition: z
          .object({
            type: z.string(),
            negate: z.boolean().optional(),
          })
          .nullable()
          .optional(),
        action_type: z.enum([
          'send_email',
          'create_task',
          'create_notification',
          'update_event_status',
          'send_feedback_request',
          'send_payment_reminder',
        ]),
        action_config: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .min(1, 'At least one step required'),
})

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
})

// ─── List Workflows ─────────────────────────────────────────────────────────

export async function listWorkflows(): Promise<
  (WorkflowTemplate & { workflow_steps: WorkflowStep[]; _execution_count: number })[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: templates, error } = await supabase
    .from('workflow_templates' as any)
    .select('*, workflow_steps(*)')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listWorkflows] Error:', error)
    return []
  }

  // Get execution counts for each template
  const templateIds = (templates || []).map((t: any) => t.id)
  const { data: execCounts } = await supabase
    .from('workflow_executions' as any)
    .select('template_id')
    .eq('chef_id', user.tenantId!)
    .in('template_id', templateIds.length > 0 ? templateIds : ['__none__'])

  const countMap: Record<string, number> = {}
  for (const exec of (execCounts || []) as any[]) {
    countMap[exec.template_id] = (countMap[exec.template_id] || 0) + 1
  }

  return ((templates || []) as any[]).map((t) => ({
    ...(t as unknown as WorkflowTemplate),
    workflow_steps: ((t.workflow_steps || []) as unknown as WorkflowStep[]).sort(
      (a, b) => a.step_order - b.step_order
    ),
    _execution_count: countMap[t.id] || 0,
  }))
}

// ─── Create Workflow ────────────────────────────────────────────────────────

export async function createWorkflow(
  input: z.infer<typeof CreateWorkflowSchema>
): Promise<{ success: boolean; workflow?: WorkflowTemplate; error?: string }> {
  const user = await requireChef()
  const validated = CreateWorkflowSchema.parse(input)
  const supabase: any = createServerClient()

  // Create the template
  const { data: template, error: templateErr } = await supabase
    .from('workflow_templates' as any)
    .insert({
      chef_id: user.tenantId!,
      name: validated.name,
      description: validated.description || null,
      is_active: true,
      is_system: false,
      trigger_type: validated.trigger_type,
      trigger_config: validated.trigger_config,
    })
    .select()
    .single()

  if (templateErr) {
    console.error('[createWorkflow] Template error:', templateErr)
    return { success: false, error: 'Failed to create workflow' }
  }

  // Create the steps
  const stepPayload = validated.steps.map((step) => ({
    template_id: (template as any).id,
    step_order: step.step_order,
    delay_hours: step.delay_hours,
    condition: step.condition || null,
    action_type: step.action_type,
    action_config: step.action_config,
  }))

  const { error: stepsErr } = await supabase.from('workflow_steps' as any).insert(stepPayload)

  if (stepsErr) {
    console.error('[createWorkflow] Steps error:', stepsErr)
    // Clean up the template
    await supabase
      .from('workflow_templates' as any)
      .delete()
      .eq('id', (template as any).id)
    return { success: false, error: 'Failed to create workflow steps' }
  }

  revalidatePath('/settings/automations')
  return { success: true, workflow: template as unknown as WorkflowTemplate }
}

// ─── Update Workflow ────────────────────────────────────────────────────────

export async function updateWorkflow(
  workflowId: string,
  input: z.infer<typeof UpdateWorkflowSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = UpdateWorkflowSchema.parse(input)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('workflow_templates' as any)
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workflowId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateWorkflow] Error:', error)
    return { success: false, error: 'Failed to update workflow' }
  }

  revalidatePath('/settings/automations')
  return { success: true }
}

// ─── Toggle Workflow ────────────────────────────────────────────────────────

export async function toggleWorkflow(
  workflowId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('workflow_templates' as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', workflowId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[toggleWorkflow] Error:', error)
    return { success: false, error: 'Failed to toggle workflow' }
  }

  revalidatePath('/settings/automations')
  return { success: true }
}

// ─── Delete Workflow ────────────────────────────────────────────────────────
// Only custom workflows can be deleted. System workflows can be deactivated.

export async function deleteWorkflow(
  workflowId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Check if it's a system workflow
  const { data: template } = await supabase
    .from('workflow_templates' as any)
    .select('is_system')
    .eq('id', workflowId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (template && (template as any).is_system) {
    return { success: false, error: 'System workflows cannot be deleted. Deactivate them instead.' }
  }

  const { error } = await supabase
    .from('workflow_templates' as any)
    .delete()
    .eq('id', workflowId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteWorkflow] Error:', error)
    return { success: false, error: 'Failed to delete workflow' }
  }

  revalidatePath('/settings/automations')
  return { success: true }
}

// ─── Get Workflow Execution Log ─────────────────────────────────────────────

export async function getWorkflowExecutionLog(options?: {
  workflowId?: string
  executionId?: string
  limit?: number
}): Promise<(WorkflowExecutionLog & { _template_name?: string })[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('workflow_execution_log' as any)
    .select('*, execution:workflow_executions(template:workflow_templates(name))')
    .eq('chef_id', user.tenantId!)
    .order('executed_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.executionId) {
    query = query.eq('execution_id', options.executionId)
  }

  if (options?.workflowId) {
    // Filter by template via executions
    const { data: execIds } = await supabase
      .from('workflow_executions' as any)
      .select('id')
      .eq('template_id', options.workflowId)
      .eq('chef_id', user.tenantId!)

    const ids = (execIds || []).map((e: any) => e.id)
    if (ids.length === 0) return []
    query = query.in('execution_id', ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getWorkflowExecutionLog] Error:', error)
    return []
  }

  return ((data || []) as any[]).map((log) => ({
    ...(log as unknown as WorkflowExecutionLog),
    _template_name: (log.execution as any)?.template?.name || null,
  }))
}

// ─── Get Active Executions ──────────────────────────────────────────────────

export async function getActiveWorkflowExecutions(): Promise<
  (WorkflowExecution & { _template_name: string; _step_count: number })[]
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('workflow_executions' as any)
    .select('*, template:workflow_templates(name, workflow_steps(id))')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('started_at', { ascending: false })

  if (error) {
    console.error('[getActiveWorkflowExecutions] Error:', error)
    return []
  }

  return ((data || []) as any[]).map((exec) => ({
    ...(exec as unknown as WorkflowExecution),
    _template_name: (exec.template as any)?.name || 'Unknown',
    _step_count: (exec.template as any)?.workflow_steps?.length || 0,
  }))
}

// ─── Process Event Trigger ──────────────────────────────────────────────────
// Convenience wrapper called from event transitions and other server actions.
// Non-blocking: catches all errors internally.

export async function processEventTrigger(
  chefId: string,
  triggerType: 'event_stage_changed' | 'inquiry_created' | 'quote_sent' | 'payment_received',
  context: {
    entityId: string
    entityType: string
    fields: Record<string, unknown>
  }
): Promise<void> {
  try {
    const { processWorkflowTrigger } = await import('./workflow-engine')
    const result = await processWorkflowTrigger(chefId, triggerType, context)

    if (result.errors.length > 0) {
      console.error('[processEventTrigger] Workflow errors:', result.errors)
    }
  } catch (err) {
    // Non-blocking: workflow failures should never break the main flow
    console.error('[processEventTrigger] Error (non-fatal):', err)
  }
}

// ─── Seed Defaults ──────────────────────────────────────────────────────────
// Seeds default workflows for the current chef. Safe to call multiple times.

export async function seedMyDefaultWorkflows(): Promise<{
  success: boolean
  created: number
  skipped: number
}> {
  const user = await requireChef()

  try {
    const { seedDefaultWorkflows } = await import('./default-workflows')
    const result = await seedDefaultWorkflows(user.tenantId!)

    revalidatePath('/settings/automations')
    return { success: true, ...result }
  } catch (err) {
    console.error('[seedMyDefaultWorkflows] Error:', err)
    return { success: false, created: 0, skipped: 0 }
  }
}

// ─── Cancel Execution ───────────────────────────────────────────────────────

export async function cancelExecution(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  try {
    const { cancelWorkflowExecution } = await import('./workflow-engine')
    await cancelWorkflowExecution(executionId, user.tenantId!)
    revalidatePath('/settings/automations')
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
