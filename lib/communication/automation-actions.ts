'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { createTodo } from '@/lib/todos/actions'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type AutomationAction = {
  type: 'send_template' | 'schedule_message' | 'create_todo' | 'send_survey' | 'log_activity'
  config: Record<string, unknown>
}

export type AutomationRule = {
  id: string
  chef_id: string
  name: string
  trigger_event: string
  conditions: Record<string, unknown>
  actions: AutomationAction[]
  is_active: boolean
  execution_count: number
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// QUERIES
// ==========================================

export async function getRules(options?: { triggerEvent?: string; activeOnly?: boolean }): Promise<{
  data: AutomationRule[] | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('automation_rules').select('*').eq('chef_id', user.entityId).order('name')

  if (options?.triggerEvent) {
    query = query.eq('trigger_event', options.triggerEvent)
  }

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getRules] Error:', error)
    return { data: null, error: 'Failed to fetch automation rules' }
  }

  return { data: data as AutomationRule[], error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function createRule(input: {
  name: string
  trigger_event: string
  conditions?: Record<string, unknown>
  actions: AutomationAction[]
  is_active?: boolean
}): Promise<{ data: AutomationRule | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!input.actions || input.actions.length === 0) {
    return { data: null, error: 'Rule must have at least one action' }
  }

  const validTriggers = [
    'new_inquiry',
    'event_confirmed',
    'event_completed',
    'payment_received',
    'guest_count_changed',
    'menu_approved',
    'survey_completed',
    'milestone_overdue',
  ]

  if (!validTriggers.includes(input.trigger_event)) {
    return { data: null, error: `Invalid trigger event: ${input.trigger_event}` }
  }

  const { data, error } = await db
    .from('automation_rules')
    .insert({
      chef_id: user.entityId,
      name: input.name,
      trigger_event: input.trigger_event,
      conditions: input.conditions || {},
      actions: input.actions,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createRule] Error:', error)
    return { data: null, error: 'Failed to create automation rule' }
  }

  revalidatePath('/communication')
  return { data: data as AutomationRule, error: null }
}

export async function updateRule(
  id: string,
  input: {
    name?: string
    trigger_event?: string
    conditions?: Record<string, unknown>
    actions?: AutomationAction[]
    is_active?: boolean
  }
): Promise<{ data: AutomationRule | null; error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) updateData.name = input.name
  if (input.trigger_event !== undefined) updateData.trigger_event = input.trigger_event
  if (input.conditions !== undefined) updateData.conditions = input.conditions
  if (input.actions !== undefined) updateData.actions = input.actions
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await db
    .from('automation_rules')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[updateRule] Error:', error)
    return { data: null, error: 'Failed to update automation rule' }
  }

  revalidatePath('/communication')
  return { data: data as AutomationRule, error: null }
}

export async function toggleRule(id: string): Promise<{
  data: AutomationRule | null
  error: string | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: current, error: fetchError } = await db
    .from('automation_rules')
    .select('is_active')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !current) {
    return { data: null, error: 'Rule not found' }
  }

  const { data, error } = await db
    .from('automation_rules')
    .update({
      is_active: !current.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[toggleRule] Error:', error)
    return { data: null, error: 'Failed to toggle rule' }
  }

  revalidatePath('/communication')
  return { data: data as AutomationRule, error: null }
}

export async function executeRule(
  id: string,
  context: Record<string, unknown>
): Promise<{ error: string | null }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the rule
  const { data: rule, error: fetchError } = await db
    .from('automation_rules')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !rule) {
    return { error: 'Rule not found' }
  }

  if (!rule.is_active) {
    return { error: 'Rule is not active' }
  }

  // Execute each action in the rule
  const actions = (rule.actions as AutomationAction[]) || []

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'send_template': {
          // Template sending would integrate with the email/notification pipeline
          console.log('[executeRule] send_template action:', action.config)
          break
        }
        case 'schedule_message': {
          // Would call scheduleMessage from scheduled-message-actions
          console.log('[executeRule] schedule_message action:', action.config)
          break
        }
        case 'create_todo': {
          const text =
            typeof action.config.text === 'string'
              ? action.config.text
              : typeof action.config.title === 'string'
                ? action.config.title
                : typeof context.todo_text === 'string'
                  ? context.todo_text
                  : typeof context.message === 'string'
                    ? context.message
                    : ''

          const dueDate = typeof action.config.due_date === 'string' ? action.config.due_date : null
          const dueTime = typeof action.config.due_time === 'string' ? action.config.due_time : null
          const reminderAt =
            typeof action.config.reminder_at === 'string' ? action.config.reminder_at : null
          const eventId =
            typeof action.config.event_id === 'string'
              ? action.config.event_id
              : typeof context.event_id === 'string'
                ? context.event_id
                : null
          const clientId =
            typeof action.config.client_id === 'string'
              ? action.config.client_id
              : typeof context.client_id === 'string'
                ? context.client_id
                : null
          const priority =
            action.config.priority === 'low' ||
            action.config.priority === 'medium' ||
            action.config.priority === 'high' ||
            action.config.priority === 'urgent'
              ? action.config.priority
              : 'medium'
          const category =
            action.config.category === 'general' ||
            action.config.category === 'prep' ||
            action.config.category === 'shopping' ||
            action.config.category === 'client' ||
            action.config.category === 'admin' ||
            action.config.category === 'follow_up' ||
            action.config.category === 'personal'
              ? action.config.category
              : 'follow_up'

          const sourceParts = [
            typeof context.communication_event_id === 'string'
              ? `Communication event: ${context.communication_event_id}`
              : null,
            typeof context.thread_id === 'string' ? `Thread: ${context.thread_id}` : null,
            typeof action.config.notes === 'string' ? action.config.notes : null,
          ].filter((part): part is string => Boolean(part))

          const result = await createTodo({
            text,
            due_date: dueDate,
            due_time: dueTime,
            priority,
            category,
            reminder_at: reminderAt,
            event_id: eventId,
            client_id: clientId,
            notes: sourceParts.join('\n') || null,
          })

          if (!result.success) {
            console.warn('[executeRule] create_todo action failed:', result.error)
          }
          break
        }
        case 'send_survey': {
          // Would create and send a post-event survey
          console.log('[executeRule] send_survey action:', action.config)
          break
        }
        case 'log_activity': {
          // Would log to the activity feed
          console.log('[executeRule] log_activity action:', action.config)
          break
        }
        default:
          console.warn(`[executeRule] Unknown action type: ${action.type}`)
      }
    } catch (err) {
      // Non-blocking: individual action failure should not stop other actions
      console.error(`[executeRule] Non-blocking action error (${action.type}):`, err)
    }
  }

  // Update execution count and timestamp
  try {
    await db
      .from('automation_rules')
      .update({
        execution_count: (rule.execution_count || 0) + 1,
        last_triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('chef_id', user.entityId)
  } catch (err) {
    // Non-blocking: counter update failure should not fail the execution
    console.error('[executeRule] Non-blocking counter update error:', err)
  }

  return { error: null }
}
