// Action Handlers
// Dispatches to specific handlers based on action_type.
// Each handler executes the configured action and returns a result.
// AI Policy: send_template_message creates DRAFT messages (not auto-sent).

import { createServerClient } from '@/lib/supabase/server'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import type { AutomationRule, AutomationContext } from './types'

type ActionResult = {
  success: boolean
  details?: Record<string, unknown>
  error?: string
}

export async function executeAction(
  rule: AutomationRule,
  context: AutomationContext
): Promise<ActionResult> {
  switch (rule.action_type) {
    case 'create_notification':
      return handleCreateNotification(rule, context)

    case 'create_follow_up_task':
      return handleCreateFollowUpTask(rule, context)

    case 'send_template_message':
      return handleSendTemplateMessage(rule, context)

    case 'create_internal_note':
      return handleCreateInternalNote(rule, context)

    default:
      return { success: false, error: `Unknown action type: ${rule.action_type}` }
  }
}

// ─── Create Notification ─────────────────────────────────────────────────

async function handleCreateNotification(
  rule: AutomationRule,
  context: AutomationContext
): Promise<ActionResult> {
  const config = rule.action_config as {
    title?: string
    body?: string
  }

  const chefUserId = await getChefAuthUserId(context.tenantId)
  if (!chefUserId) return { success: false, error: 'Chef user ID not found' }

  const title = interpolate(config.title || rule.name, context.fields)
  const body = interpolate(config.body || '', context.fields)

  await createNotification({
    tenantId: context.tenantId,
    recipientId: chefUserId,
    category: 'system',
    action: 'system_alert',
    title,
    body: body || undefined,
    actionUrl: context.entityType === 'inquiry' && context.entityId
      ? `/inquiries/${context.entityId}`
      : context.entityType === 'event' && context.entityId
        ? `/events/${context.entityId}`
        : undefined,
    inquiryId: context.entityType === 'inquiry' ? context.entityId : undefined,
    eventId: context.entityType === 'event' ? context.entityId : undefined,
    metadata: { automation_rule_id: rule.id, automation_name: rule.name },
  })

  return { success: true, details: { title, body } }
}

// ─── Create Follow-Up Task ───────────────────────────────────────────────

async function handleCreateFollowUpTask(
  rule: AutomationRule,
  context: AutomationContext
): Promise<ActionResult> {
  const config = rule.action_config as {
    description?: string
    due_hours?: number
  }

  const supabase = createServerClient({ admin: true })
  const dueHours = config.due_hours || 48

  // Set follow_up_due_at on the inquiry
  if (context.entityType === 'inquiry' && context.entityId) {
    const dueAt = new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString()

    await supabase
      .from('inquiries')
      .update({
        follow_up_due_at: dueAt,
        next_action_required: interpolate(config.description || 'Follow up (auto-scheduled)', context.fields),
        next_action_by: 'chef',
      })
      .eq('id', context.entityId)
      .eq('tenant_id', context.tenantId)

    return { success: true, details: { due_at: dueAt, description: config.description } }
  }

  return { success: false, error: 'Follow-up task requires an inquiry context' }
}

// ─── Send Template Message (as DRAFT) ────────────────────────────────────
// Creates a draft message using a response template.
// DOES NOT auto-send — respects the existing approval workflow.

async function handleSendTemplateMessage(
  rule: AutomationRule,
  context: AutomationContext
): Promise<ActionResult> {
  const config = rule.action_config as {
    template_id?: string
    channel?: string
  }

  if (!config.template_id) {
    return { success: false, error: 'No template_id configured' }
  }

  const supabase = createServerClient({ admin: true })

  // Fetch the template
  const { data: template, error: templateError } = await supabase
    .from('response_templates')
    .select('template_text, name')
    .eq('id', config.template_id)
    .eq('tenant_id', context.tenantId)
    .single()

  if (templateError || !template) {
    return { success: false, error: 'Template not found' }
  }

  // Create a draft message (NOT sent — chef must approve)
  const { error: msgError } = await supabase
    .from('messages')
    .insert({
      tenant_id: context.tenantId,
      inquiry_id: context.entityType === 'inquiry' ? context.entityId : null,
      event_id: context.entityType === 'event' ? context.entityId : null,
      channel: (config.channel || 'email') as 'email',
      direction: 'outbound' as const,
      status: 'draft' as const,
      body: interpolate(template.template_text, context.fields),
      subject: `Re: ${interpolate(template.name, context.fields)}`,
    })

  if (msgError) {
    return { success: false, error: `Message creation failed: ${msgError.message}` }
  }

  // Notify chef about the draft
  const chefUserId = await getChefAuthUserId(context.tenantId)
  if (chefUserId) {
    await createNotification({
      tenantId: context.tenantId,
      recipientId: chefUserId,
      category: 'system',
      action: 'system_alert',
      title: 'Draft message created by automation',
      body: `"${rule.name}" generated a draft using template "${template.name}". Review and send.`,
      actionUrl: context.entityType === 'inquiry' && context.entityId
        ? `/inquiries/${context.entityId}`
        : undefined,
      inquiryId: context.entityType === 'inquiry' ? context.entityId : undefined,
    })
  }

  return { success: true, details: { template_name: template.name, status: 'draft' } }
}

// ─── Create Internal Note ────────────────────────────────────────────────

async function handleCreateInternalNote(
  rule: AutomationRule,
  context: AutomationContext
): Promise<ActionResult> {
  const config = rule.action_config as {
    note?: string
  }

  if (!config.note) {
    return { success: false, error: 'No note text configured' }
  }

  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('messages')
    .insert({
      tenant_id: context.tenantId,
      inquiry_id: context.entityType === 'inquiry' ? context.entityId : null,
      event_id: context.entityType === 'event' ? context.entityId : null,
      channel: 'internal_note' as const,
      direction: 'outbound' as const,
      status: 'logged' as const,
      body: interpolate(config.note, context.fields),
    })

  if (error) {
    return { success: false, error: `Note creation failed: ${error.message}` }
  }

  return { success: true, details: { note: config.note } }
}

// ─── Template Interpolation ──────────────────────────────────────────────
// Replaces {{field_name}} placeholders with values from context.

function interpolate(template: string, fields: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = fields[key]
    if (value === null || value === undefined) return ''
    return String(value)
  })
}
