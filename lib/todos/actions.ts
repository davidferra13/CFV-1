'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TodoCategory =
  | 'general'
  | 'prep'
  | 'shopping'
  | 'client'
  | 'admin'
  | 'follow_up'
  | 'personal'

export type ChefTodo = {
  id: string
  text: string
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
  due_date: string | null
  due_time: string | null
  priority: TodoPriority
  category: TodoCategory
  reminder_at: string | null
  reminder_sent: boolean
  notes: string | null
  event_id: string | null
  client_id: string | null
}

const TODO_FIELDS =
  'id, text, completed, completed_at, sort_order, created_at, due_date, due_time, priority, category, reminder_at, reminder_sent, notes, event_id, client_id'

function revalidateReminders() {
  revalidatePath('/dashboard')
  revalidatePath('/reminders')
}

// ─── READ ───────────────────────────────────────────────

export async function getTodos(): Promise<ChefTodo[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_todos')
    .select(TODO_FIELDS)
    .eq('chef_id', user.entityId)
    .order('completed', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Todos] getTodos failed:', error)
    return []
  }

  return data ?? []
}

export async function getTodosByFilter(filter: {
  completed?: boolean
  category?: TodoCategory
  priority?: TodoPriority
  dueBefore?: string
  dueAfter?: string
}): Promise<ChefTodo[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('chef_todos').select(TODO_FIELDS).eq('chef_id', user.entityId)

  if (filter.completed !== undefined) {
    query = query.eq('completed', filter.completed)
  }
  if (filter.category) {
    query = query.eq('category', filter.category)
  }
  if (filter.priority) {
    query = query.eq('priority', filter.priority)
  }
  if (filter.dueBefore) {
    query = query.lte('due_date', filter.dueBefore)
  }
  if (filter.dueAfter) {
    query = query.gte('due_date', filter.dueAfter)
  }

  query = query
    .order('completed', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('[Todos] getTodosByFilter failed:', error)
    return []
  }

  return data ?? []
}

export async function getUpcomingReminders(daysAhead: number = 7): Promise<ChefTodo[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data, error } = await db
    .from('chef_todos')
    .select(TODO_FIELDS)
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .lte('due_date', futureDate)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[Todos] getUpcomingReminders failed:', error)
    return []
  }

  return data ?? []
}

export async function getOverdueTodos(): Promise<ChefTodo[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await db
    .from('chef_todos')
    .select(TODO_FIELDS)
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('[Todos] getOverdueTodos failed:', error)
    return []
  }

  return data ?? []
}

// ─── CREATE ─────────────────────────────────────────────

export type CreateTodoInput = {
  text: string
  due_date?: string | null
  due_time?: string | null
  priority?: TodoPriority
  category?: TodoCategory
  reminder_at?: string | null
  notes?: string | null
  event_id?: string | null
  client_id?: string | null
}

export async function createTodo(
  input: string | CreateTodoInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  // Support both old string API and new object API
  const params: CreateTodoInput = typeof input === 'string' ? { text: input } : input

  const trimmed = params.text.trim()
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: 'Todo text must be 1-500 characters' }
  }

  if (params.notes && params.notes.length > 2000) {
    return { success: false, error: 'Notes must be under 2000 characters' }
  }

  const db: any = createServerClient()

  // Append at the end of incomplete items
  const { data: last } = await db
    .from('chef_todos')
    .select('sort_order')
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (last?.sort_order ?? -1) + 1

  // Core columns that exist in chef_todos table
  const insertData: Record<string, unknown> = {
    chef_id: user.entityId,
    text: trimmed,
    completed: false,
    sort_order: nextOrder,
    created_by: user.id,
  }

  // Extended columns (added via migration, may not exist in all environments)
  const extendedFields: Record<string, unknown> = {
    due_date: params.due_date || null,
    due_time: params.due_time || null,
    priority: params.priority || 'medium',
    category: params.category || 'general',
    reminder_at: params.reminder_at || null,
    notes: params.notes?.trim() || null,
    event_id: params.event_id || null,
    client_id: params.client_id || null,
  }

  // Try with extended fields first, fall back to core-only
  let created: any = null
  let error: any = null

  const fullResult = await db
    .from('chef_todos')
    .insert({ ...insertData, ...extendedFields })
    .select('id')
    .single()

  if (fullResult.error) {
    // Extended columns may not exist yet; retry with core columns only
    const coreResult = await db.from('chef_todos').insert(insertData).select('id').single()
    created = coreResult.data
    error = coreResult.error
  } else {
    created = fullResult.data
    error = fullResult.error
  }

  if (error || !created) {
    console.error('[Todos] createTodo failed:', error)
    return { success: false, error: 'Failed to create todo' }
  }

  revalidateReminders()
  return { success: true, id: created.id }
}

// ─── UPDATE ─────────────────────────────────────────────

export type UpdateTodoInput = {
  text?: string
  due_date?: string | null
  due_time?: string | null
  priority?: TodoPriority
  category?: TodoCategory
  reminder_at?: string | null
  notes?: string | null
  event_id?: string | null
  client_id?: string | null
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {}

  if (input.text !== undefined) {
    const trimmed = input.text.trim()
    if (!trimmed || trimmed.length > 500) {
      return { success: false, error: 'Todo text must be 1-500 characters' }
    }
    updates.text = trimmed
  }

  if (input.notes !== undefined) {
    if (input.notes && input.notes.length > 2000) {
      return { success: false, error: 'Notes must be under 2000 characters' }
    }
    updates.notes = input.notes?.trim() || null
  }

  if (input.due_date !== undefined) updates.due_date = input.due_date || null
  if (input.due_time !== undefined) updates.due_time = input.due_time || null
  if (input.priority !== undefined) updates.priority = input.priority
  if (input.category !== undefined) updates.category = input.category
  if (input.event_id !== undefined) updates.event_id = input.event_id || null
  if (input.client_id !== undefined) updates.client_id = input.client_id || null

  if (input.reminder_at !== undefined) {
    updates.reminder_at = input.reminder_at || null
    // Reset reminder_sent when changing the reminder time
    updates.reminder_sent = false
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No fields to update' }
  }

  const { error } = await db
    .from('chef_todos')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[Todos] updateTodo failed:', error)
    return { success: false, error: 'Failed to update todo' }
  }

  revalidateReminders()
  return { success: true }
}

// ─── TOGGLE / DELETE ────────────────────────────────────

export async function toggleTodo(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: todo, error: fetchError } = await db
    .from('chef_todos')
    .select('id, completed')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !todo) {
    return { success: false, error: 'Todo not found' }
  }

  const nowCompleted = !todo.completed

  const { error } = await db
    .from('chef_todos')
    .update({
      completed: nowCompleted,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[Todos] toggleTodo failed:', error)
    return { success: false, error: 'Failed to update todo' }
  }

  revalidateReminders()
  return { success: true }
}

export async function deleteTodo(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('chef_todos').delete().eq('id', id).eq('chef_id', user.entityId)

  if (error) {
    console.error('[Todos] deleteTodo failed:', error)
    return { success: false, error: 'Failed to delete todo' }
  }

  revalidateReminders()
  return { success: true }
}

// ─── REMINDER FIRING ────────────────────────────────────

/**
 * Check for todos with pending reminders and fire notifications.
 * Called by the scheduled job system (ai_task_queue).
 */
export async function fireReminders(): Promise<{ fired: number }> {
  const db: any = createServerClient()
  const now = new Date().toISOString()

  // Find all unfired reminders whose time has passed
  const { data: pending, error } = await db
    .from('chef_todos')
    .select('id, chef_id, text, due_date, due_time, priority, category')
    .eq('completed', false)
    .eq('reminder_sent', false)
    .not('reminder_at', 'is', null)
    .lte('reminder_at', now)
    .limit(50)

  if (error || !pending?.length) {
    return { fired: 0 }
  }

  // Lazy import to avoid circular deps
  const { createNotification } = await import('@/lib/notifications/actions')

  let fired = 0
  for (const todo of pending) {
    try {
      // Get auth_user_id for notification recipient
      const { data: role } = await db
        .from('user_roles')
        .select('auth_user_id')
        .eq('entity_id', todo.chef_id)
        .eq('role', 'chef')
        .limit(1)
        .maybeSingle()

      if (role?.auth_user_id) {
        const duePart = todo.due_date
          ? ` (due ${todo.due_date}${todo.due_time ? ' at ' + todo.due_time : ''})`
          : ''

        await createNotification({
          tenantId: todo.chef_id,
          recipientId: role.auth_user_id,
          category: 'system',
          action: 'reminder_fired',
          title: 'Reminder',
          body: `${todo.text}${duePart}`,
          actionUrl: '/reminders',
          metadata: {
            todoId: todo.id,
            priority: todo.priority,
            category: todo.category,
          },
        })
      }

      // Mark as sent
      await db.from('chef_todos').update({ reminder_sent: true }).eq('id', todo.id)

      fired++
    } catch (err) {
      console.error('[Reminders] Failed to fire reminder for todo', todo.id, err)
    }
  }

  return { fired }
}
