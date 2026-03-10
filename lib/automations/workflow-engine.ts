// Workflow Engine
// Multi-step workflow execution engine tied to ChefFlow's 8-state event FSM.
// Handles trigger evaluation, step scheduling, condition checking, and action dispatch.
// Called as non-blocking side effects from event transitions, cron jobs, etc.
// Uses admin client (no user session required).

import { createServerClient } from '@/lib/supabase/server'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import { interpolate } from './workflow-utils'
import type {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowExecution,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowConditionType,
  WorkflowTriggerContext,
} from './workflow-types'

// ─── Trigger Entry Point ────────────────────────────────────────────────────
// Called when a trigger event occurs (e.g., event stage change, inquiry created).
// Finds all matching active workflows for the tenant and starts executions.

export async function processWorkflowTrigger(
  chefId: string,
  triggerType: WorkflowTriggerType,
  context: WorkflowTriggerContext
): Promise<{ started: number; errors: string[] }> {
  const errors: string[] = []
  let started = 0

  try {
    const supabase = createServerClient({ admin: true })

    // Find all active workflows matching this trigger type for this chef
    const { data: templates, error } = await supabase
      .from('workflow_templates' as any)
      .select('*, workflow_steps(*)')
      .eq('chef_id', chefId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true)

    if (error || !templates || templates.length === 0) return { started: 0, errors: [] }

    for (const templateRow of templates) {
      const template = templateRow as unknown as WorkflowTemplate & {
        workflow_steps: WorkflowStep[]
      }

      try {
        // Check trigger config filters (e.g., specific status transitions)
        if (!matchesTriggerConfig(template.trigger_config, context)) continue

        // Check if already enrolled (dedup)
        if (!context.entityId) continue

        const { data: existing } = await supabase
          .from('workflow_executions' as any)
          .select('id')
          .eq('template_id', template.id)
          .eq('entity_id', context.entityId)
          .maybeSingle()

        if (existing) continue // Already enrolled, skip

        // Sort steps by step_order
        const steps = (template.workflow_steps || []).sort(
          (a: WorkflowStep, b: WorkflowStep) => a.step_order - b.step_order
        )
        if (steps.length === 0) continue

        // Calculate when the first step should execute
        const firstStep = steps[0]
        const nextStepAt =
          firstStep.delay_hours > 0
            ? new Date(Date.now() + firstStep.delay_hours * 3_600_000).toISOString()
            : new Date().toISOString() // Execute immediately if no delay

        // Create the execution record
        const { data: execution, error: insertErr } = await supabase
          .from('workflow_executions' as any)
          .insert({
            chef_id: chefId,
            template_id: template.id,
            entity_type: context.entityType || 'event',
            entity_id: context.entityId,
            current_step: 0,
            status: 'active',
            next_step_at: nextStepAt,
          })
          .select()
          .single()

        if (insertErr) {
          // Unique constraint violation means already enrolled
          if (insertErr.code === '23505') continue
          errors.push(`Failed to start workflow "${template.name}": ${insertErr.message}`)
          continue
        }

        started++

        // If the first step has no delay, execute it immediately
        if (firstStep.delay_hours === 0) {
          await executeNextStep((execution as any).id, chefId, context)
        }
      } catch (err) {
        errors.push(`Workflow "${template.name}" failed: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    errors.push(`Workflow trigger processing failed: ${(err as Error).message}`)
  }

  return { started, errors }
}

// ─── Step Execution ─────────────────────────────────────────────────────────
// Executes the next pending step for a workflow execution.
// Called immediately (no delay) or by the cron sweep (delayed steps).

export async function executeNextStep(
  executionId: string,
  chefId: string,
  context?: WorkflowTriggerContext
): Promise<{ success: boolean; completed: boolean; error?: string }> {
  const supabase = createServerClient({ admin: true })

  try {
    // Fetch the execution + template + steps
    const { data: execution, error: execErr } = await supabase
      .from('workflow_executions' as any)
      .select('*')
      .eq('id', executionId)
      .single()

    if (execErr || !execution) {
      return { success: false, completed: false, error: 'Execution not found' }
    }

    const exec = execution as unknown as WorkflowExecution
    if (exec.status !== 'active') {
      return { success: false, completed: false, error: `Execution is ${exec.status}` }
    }

    // Fetch steps for this template
    const { data: stepsData } = await supabase
      .from('workflow_steps' as any)
      .select('*')
      .eq('template_id', exec.template_id)
      .order('step_order', { ascending: true })

    const steps = (stepsData || []) as unknown as WorkflowStep[]
    const nextStepOrder = exec.current_step + 1
    const step = steps.find((s) => s.step_order === nextStepOrder)

    if (!step) {
      // No more steps, mark workflow as completed
      await supabase
        .from('workflow_executions' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          current_step: exec.current_step,
          next_step_at: null,
        })
        .eq('id', executionId)

      return { success: true, completed: true }
    }

    // Build context from entity data if not provided
    const stepContext =
      context || (await buildContextFromEntity(supabase, exec.entity_type, exec.entity_id, chefId))

    // Check step condition
    if (step.condition) {
      const conditionMet = await evaluateWorkflowCondition(
        supabase,
        step.condition as WorkflowConditionConfig,
        exec.entity_type,
        exec.entity_id,
        chefId
      )

      if (!conditionMet) {
        // Log as condition_not_met and skip to next step
        await logStepExecution(supabase, executionId, chefId, step, 'condition_not_met')

        // Advance to next step
        const nextNext = steps.find((s) => s.step_order === nextStepOrder + 1)
        await supabase
          .from('workflow_executions' as any)
          .update({
            current_step: nextStepOrder,
            next_step_at: nextNext
              ? new Date(Date.now() + nextNext.delay_hours * 3_600_000).toISOString()
              : null,
            ...(nextNext ? {} : { status: 'completed', completed_at: new Date().toISOString() }),
          })
          .eq('id', executionId)

        // If there's a next step with no delay, execute immediately
        if (nextNext && nextNext.delay_hours === 0) {
          return executeNextStep(executionId, chefId, stepContext)
        }

        return { success: true, completed: !nextNext }
      }
    }

    // Execute the action
    const result = await executeWorkflowAction(supabase, step, exec, chefId, stepContext)

    // Log execution
    await logStepExecution(
      supabase,
      executionId,
      chefId,
      step,
      result.success ? 'success' : 'failed',
      result.details,
      result.error
    )

    // Advance to next step
    const followingStep = steps.find((s) => s.step_order === nextStepOrder + 1)
    await supabase
      .from('workflow_executions' as any)
      .update({
        current_step: nextStepOrder,
        next_step_at: followingStep
          ? new Date(Date.now() + followingStep.delay_hours * 3_600_000).toISOString()
          : null,
        ...(followingStep ? {} : { status: 'completed', completed_at: new Date().toISOString() }),
      })
      .eq('id', executionId)

    // If next step has no delay and action succeeded, continue immediately
    if (result.success && followingStep && followingStep.delay_hours === 0) {
      return executeNextStep(executionId, chefId, stepContext)
    }

    return { success: result.success, completed: !followingStep }
  } catch (err) {
    return { success: false, completed: false, error: (err as Error).message }
  }
}

// ─── Cron Sweep: Process Pending Steps ──────────────────────────────────────
// Called by the scheduled cron job. Finds all executions with next_step_at <= now
// and executes their pending steps.

export async function processScheduledWorkflowSteps(): Promise<{
  processed: number
  errors: string[]
}> {
  const supabase = createServerClient({ admin: true })
  let processed = 0
  const errors: string[] = []

  try {
    const { data: pendingExecutions } = await supabase
      .from('workflow_executions' as any)
      .select('id, chef_id')
      .eq('status', 'active')
      .not('next_step_at', 'is', null)
      .lte('next_step_at', new Date().toISOString())
      .limit(100)

    for (const exec of (pendingExecutions || []) as any[]) {
      try {
        const result = await executeNextStep(exec.id, exec.chef_id)
        if (result.success) processed++
        if (result.error) errors.push(`Execution ${exec.id}: ${result.error}`)
      } catch (err) {
        errors.push(`Execution ${exec.id}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    errors.push(`Workflow sweep failed: ${(err as Error).message}`)
  }

  return { processed, errors }
}

// ─── Cancel Workflow ────────────────────────────────────────────────────────
// Cancels an active workflow execution (e.g., event was cancelled).

export async function cancelWorkflowExecution(executionId: string, chefId: string): Promise<void> {
  const supabase = createServerClient({ admin: true })
  await supabase
    .from('workflow_executions' as any)
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      next_step_at: null,
    })
    .eq('id', executionId)
    .eq('chef_id', chefId)
}

// Cancel all active workflows for a specific entity (e.g., when event is cancelled)
export async function cancelWorkflowsForEntity(entityId: string, chefId: string): Promise<number> {
  const supabase = createServerClient({ admin: true })
  const { data } = await supabase
    .from('workflow_executions' as any)
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      next_step_at: null,
    })
    .eq('entity_id', entityId)
    .eq('chef_id', chefId)
    .eq('status', 'active')
    .select('id')

  return ((data as any[]) || []).length
}

// ─── Trigger Config Matching ────────────────────────────────────────────────

function matchesTriggerConfig(
  config: Record<string, unknown>,
  context: WorkflowTriggerContext
): boolean {
  if (!config || Object.keys(config).length === 0) return true

  // Filter by specific status transition
  if (config.from_status && context.fields.from_status !== config.from_status) return false
  if (config.to_status && context.fields.to_status !== config.to_status) return false

  // Filter by days_before or days_after
  if (typeof config.days === 'number') {
    const contextDays = context.fields.days_offset as number | undefined
    if (contextDays !== undefined && contextDays !== config.days) return false
  }

  return true
}

// ─── Condition Evaluation ───────────────────────────────────────────────────

type WorkflowConditionConfig = {
  type: WorkflowConditionType
  negate?: boolean
}

async function evaluateWorkflowCondition(
  supabase: any,
  condition: WorkflowConditionConfig,
  entityType: string,
  entityId: string,
  chefId: string
): Promise<boolean> {
  let result = false

  switch (condition.type) {
    case 'quote_accepted': {
      if (entityType === 'event') {
        const { data } = await supabase.from('events').select('status').eq('id', entityId).single()
        result =
          data &&
          ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'].includes(data.status)
      }
      break
    }

    case 'contract_signed': {
      const { data } = await supabase
        .from('contracts' as any)
        .select('signed_at')
        .eq('event_id', entityId)
        .not('signed_at', 'is', null)
        .limit(1)
        .maybeSingle()
      result = !!data
      break
    }

    case 'payment_complete': {
      if (entityType === 'event') {
        const { data } = await supabase.from('events').select('status').eq('id', entityId).single()
        result = data && ['paid', 'confirmed', 'in_progress', 'completed'].includes(data.status)
      }
      break
    }

    case 'has_responded': {
      // Check if client has sent any inbound message for this entity
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq(entityType === 'inquiry' ? 'inquiry_id' : 'event_id', entityId)
        .eq('direction', 'inbound')
        .limit(1)
        .maybeSingle()
      result = !!data
      break
    }

    default:
      result = true // Unknown condition type, pass through
  }

  return condition.negate ? !result : result
}

// ─── Action Execution ───────────────────────────────────────────────────────

type ActionResult = {
  success: boolean
  details?: Record<string, unknown>
  error?: string
}

async function executeWorkflowAction(
  supabase: any,
  step: WorkflowStep,
  execution: WorkflowExecution,
  chefId: string,
  context: WorkflowTriggerContext
): Promise<ActionResult> {
  const config = step.action_config as Record<string, unknown>
  const fields = context.fields || {}

  switch (step.action_type) {
    case 'send_email':
      return handleSendEmail(supabase, config, execution, chefId, fields)

    case 'create_task':
      return handleCreateTask(supabase, config, execution, chefId, fields)

    case 'create_notification':
      return handleCreateNotification(config, execution, chefId, fields)

    case 'update_event_status':
      return handleUpdateEventStatus(config, execution)

    case 'send_feedback_request':
      return handleSendFeedbackRequest(supabase, execution, chefId, fields)

    case 'send_payment_reminder':
      return handleSendPaymentReminder(supabase, config, execution, chefId, fields)

    default:
      return { success: false, error: `Unknown action type: ${step.action_type}` }
  }
}

// ─── Action Handlers ────────────────────────────────────────────────────────

async function handleSendEmail(
  supabase: any,
  config: Record<string, unknown>,
  execution: WorkflowExecution,
  chefId: string,
  fields: Record<string, unknown>
): Promise<ActionResult> {
  // If a template_id is provided, use the template system
  if (config.template_id) {
    const { data: template } = await supabase
      .from('response_templates')
      .select('template_text, name')
      .eq('id', config.template_id)
      .eq('tenant_id', chefId)
      .single()

    if (!template) return { success: false, error: 'Email template not found' }

    // Create a draft message (chef approves before sending)
    const { error: msgError } = await supabase.from('messages').insert({
      tenant_id: chefId,
      inquiry_id: execution.entity_type === 'inquiry' ? execution.entity_id : null,
      event_id: execution.entity_type === 'event' ? execution.entity_id : null,
      channel: 'email' as const,
      direction: 'outbound' as const,
      status: 'draft' as const,
      body: interpolate(template.template_text, fields),
      subject: interpolate((config.subject as string) || template.name, fields),
    })

    if (msgError) return { success: false, error: msgError.message }

    // Notify chef about the draft
    const chefUserId = await getChefAuthUserId(chefId)
    if (chefUserId) {
      await createNotification({
        tenantId: chefId,
        recipientId: chefUserId,
        category: 'system',
        action: 'system_alert',
        title: 'Workflow created a draft email',
        body: interpolate(`Draft email ready for "{{client_name}}" - review and send`, fields),
        actionUrl:
          execution.entity_type === 'event'
            ? `/events/${execution.entity_id}`
            : `/inquiries/${execution.entity_id}`,
        eventId: execution.entity_type === 'event' ? execution.entity_id : undefined,
        inquiryId: execution.entity_type === 'inquiry' ? execution.entity_id : undefined,
      })
    }

    return { success: true, details: { template_name: template.name, status: 'draft' } }
  }

  // Inline email content (subject + body_template)
  const subject = interpolate((config.subject as string) || '', fields)
  const body = interpolate((config.body_template as string) || '', fields)

  if (!subject && !body) {
    return { success: false, error: 'No email subject or body configured' }
  }

  const { error: msgError } = await supabase.from('messages').insert({
    tenant_id: chefId,
    inquiry_id: execution.entity_type === 'inquiry' ? execution.entity_id : null,
    event_id: execution.entity_type === 'event' ? execution.entity_id : null,
    channel: 'email' as const,
    direction: 'outbound' as const,
    status: 'draft' as const,
    body,
    subject,
  })

  if (msgError) return { success: false, error: msgError.message }

  const chefUserId = await getChefAuthUserId(chefId)
  if (chefUserId) {
    await createNotification({
      tenantId: chefId,
      recipientId: chefUserId,
      category: 'system',
      action: 'system_alert',
      title: 'Workflow created a draft email',
      body: `Review the draft for ${interpolate('{{client_name}}', fields) || 'your client'}`,
      actionUrl:
        execution.entity_type === 'event'
          ? `/events/${execution.entity_id}`
          : `/inquiries/${execution.entity_id}`,
      eventId: execution.entity_type === 'event' ? execution.entity_id : undefined,
      inquiryId: execution.entity_type === 'inquiry' ? execution.entity_id : undefined,
    })
  }

  return { success: true, details: { subject, status: 'draft' } }
}

async function handleCreateTask(
  supabase: any,
  config: Record<string, unknown>,
  execution: WorkflowExecution,
  chefId: string,
  fields: Record<string, unknown>
): Promise<ActionResult> {
  const text = interpolate((config.text as string) || 'Automated task', fields)

  // Get the chef's auth user id for created_by
  const chefUserId = await getChefAuthUserId(chefId)
  if (!chefUserId) return { success: false, error: 'Chef user ID not found' }

  const { error } = await supabase.from('chef_todos').insert({
    chef_id: chefId,
    text,
    created_by: chefUserId,
    completed: false,
    sort_order: 0,
  })

  if (error) return { success: false, error: error.message }

  // Also notify the chef
  await createNotification({
    tenantId: chefId,
    recipientId: chefUserId,
    category: 'system',
    action: 'system_alert',
    title: 'Workflow created a task',
    body: text,
    actionUrl: '/dashboard',
  })

  return { success: true, details: { task_text: text } }
}

async function handleCreateNotification(
  config: Record<string, unknown>,
  execution: WorkflowExecution,
  chefId: string,
  fields: Record<string, unknown>
): Promise<ActionResult> {
  const chefUserId = await getChefAuthUserId(chefId)
  if (!chefUserId) return { success: false, error: 'Chef user ID not found' }

  const title = interpolate((config.title as string) || 'Workflow notification', fields)
  const body = interpolate((config.body as string) || '', fields)

  await createNotification({
    tenantId: chefId,
    recipientId: chefUserId,
    category: 'system',
    action: 'system_alert',
    title,
    body: body || undefined,
    actionUrl:
      execution.entity_type === 'event'
        ? `/events/${execution.entity_id}`
        : execution.entity_type === 'inquiry'
          ? `/inquiries/${execution.entity_id}`
          : undefined,
    eventId: execution.entity_type === 'event' ? execution.entity_id : undefined,
    inquiryId: execution.entity_type === 'inquiry' ? execution.entity_id : undefined,
  })

  return { success: true, details: { title, body } }
}

async function handleUpdateEventStatus(
  config: Record<string, unknown>,
  execution: WorkflowExecution
): Promise<ActionResult> {
  if (execution.entity_type !== 'event') {
    return { success: false, error: 'update_event_status requires an event entity' }
  }

  const toStatus = config.to_status as string
  if (!toStatus) return { success: false, error: 'No to_status configured' }

  try {
    const { transitionEvent } = await import('@/lib/events/transitions')
    await transitionEvent({
      eventId: execution.entity_id,
      toStatus: toStatus as any,
      metadata: { source: 'workflow_automation', execution_id: execution.id },
      systemTransition: true,
    })
    return { success: true, details: { to_status: toStatus } }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

async function handleSendFeedbackRequest(
  supabase: any,
  execution: WorkflowExecution,
  chefId: string,
  fields: Record<string, unknown>
): Promise<ActionResult> {
  if (execution.entity_type !== 'event') {
    return { success: false, error: 'Feedback request requires an event entity' }
  }

  try {
    // Check if a survey already exists for this event
    const { data: existingSurvey } = await supabase
      .from('surveys' as any)
      .select('id')
      .eq('event_id', execution.entity_id)
      .limit(1)
      .maybeSingle()

    if (existingSurvey) {
      return { success: true, details: { skipped: true, reason: 'Survey already exists' } }
    }

    const { createSurveyForEvent } = await import('@/lib/surveys/actions')
    const surveyToken = await createSurveyForEvent(execution.entity_id, chefId)

    if (surveyToken) {
      // Fetch client email to send the survey
      const { data: event } = await supabase
        .from('events')
        .select('client_id, occasion')
        .eq('id', execution.entity_id)
        .single()

      if (event?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('email, full_name')
          .eq('id', event.client_id)
          .single()

        const { data: chef } = await supabase
          .from('chefs')
          .select('business_name')
          .eq('id', chefId)
          .single()

        if (client?.email) {
          const { sendPostEventSurveyEmail } = await import('@/lib/email/notifications')
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
          await sendPostEventSurveyEmail({
            clientEmail: client.email,
            clientName: client.full_name,
            chefName: chef?.business_name || 'Your Chef',
            occasion: event.occasion || 'your event',
            surveyUrl: `${APP_URL}/survey/${surveyToken}`,
          })
          return { success: true, details: { survey_sent: true, to: client.email } }
        }
      }
    }

    return { success: true, details: { survey_created: !!surveyToken } }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

async function handleSendPaymentReminder(
  supabase: any,
  config: Record<string, unknown>,
  execution: WorkflowExecution,
  chefId: string,
  fields: Record<string, unknown>
): Promise<ActionResult> {
  if (execution.entity_type !== 'event') {
    return { success: false, error: 'Payment reminder requires an event entity' }
  }

  // Check if event is already paid
  const { data: event } = await supabase
    .from('events')
    .select('status, client_id, occasion')
    .eq('id', execution.entity_id)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  if (['paid', 'confirmed', 'in_progress', 'completed'].includes(event.status)) {
    return { success: true, details: { skipped: true, reason: 'Already paid' } }
  }

  // Create a draft payment reminder (chef reviews before sending)
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', event.client_id)
    .single()

  const clientName = client?.full_name || 'Client'
  const message = interpolate(
    (config.message as string) || 'Friendly reminder: your payment for {{occasion}} is due.',
    { ...fields, client_name: clientName, occasion: event.occasion || 'your event' }
  )

  const { error: msgError } = await supabase.from('messages').insert({
    tenant_id: chefId,
    event_id: execution.entity_id,
    channel: 'email' as const,
    direction: 'outbound' as const,
    status: 'draft' as const,
    body: message,
    subject: `Payment reminder: ${event.occasion || 'your upcoming event'}`,
  })

  if (msgError) return { success: false, error: msgError.message }

  const chefUserId = await getChefAuthUserId(chefId)
  if (chefUserId) {
    await createNotification({
      tenantId: chefId,
      recipientId: chefUserId,
      category: 'payment',
      action: 'system_alert',
      title: 'Payment reminder draft created',
      body: `Review the payment reminder for ${clientName}`,
      actionUrl: `/events/${execution.entity_id}`,
      eventId: execution.entity_id,
    })
  }

  return { success: true, details: { reminder_drafted: true, client: clientName } }
}

// ─── Context Building ───────────────────────────────────────────────────────
// Builds a context object from entity data when not provided directly.

async function buildContextFromEntity(
  supabase: any,
  entityType: string,
  entityId: string,
  chefId: string
): Promise<WorkflowTriggerContext> {
  const fields: Record<string, unknown> = {}

  if (entityType === 'event') {
    const { data: event } = await supabase
      .from('events')
      .select('*, client:clients(full_name, email)')
      .eq('id', entityId)
      .single()

    if (event) {
      fields.status = event.status
      fields.occasion = event.occasion
      fields.event_date = event.event_date
      fields.guest_count = event.guest_count
      const client = event.client as { full_name: string; email: string } | null
      fields.client_name = client?.full_name || 'Client'
      fields.client_email = client?.email
    }
  } else if (entityType === 'inquiry') {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('*, client:clients(full_name, email)')
      .eq('id', entityId)
      .single()

    if (inquiry) {
      fields.status = inquiry.status
      fields.channel = inquiry.channel
      fields.occasion = inquiry.confirmed_occasion
      const client = inquiry.client as { full_name: string; email: string } | null
      fields.client_name = client?.full_name || 'Client'
      fields.client_email = client?.email
    }
  }

  return {
    entityId,
    entityType,
    fields,
  }
}

// ─── Execution Logging ──────────────────────────────────────────────────────

async function logStepExecution(
  supabase: any,
  executionId: string,
  chefId: string,
  step: WorkflowStep,
  status: 'success' | 'failed' | 'skipped' | 'condition_not_met',
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  await supabase.from('workflow_execution_log' as any).insert({
    execution_id: executionId,
    chef_id: chefId,
    step_order: step.step_order,
    action_type: step.action_type,
    status,
    result: result || null,
    error: error || null,
  })
}
