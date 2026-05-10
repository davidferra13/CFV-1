'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import type {
  ChefReminder,
  ReminderCategory,
  ReminderPriority,
  CreateReminderInput,
  UpdateReminderInput,
  RecurringRule,
  LocationTrigger,
} from './types'
import { SNOOZE_OPTIONS } from './types'

// Re-export types for consumers
export type { ChefReminder, CreateReminderInput, UpdateReminderInput }

const REMINDER_FIELDS =
  'id, chef_id, text, completed, completed_at, sort_order, created_at, due_date, due_time, priority, category, reminder_at, reminder_sent, notes, event_id, client_id, snoozed_until, recurring_rule, location_trigger'

function revalidateReminders() {
  revalidatePath('/reminders')
  revalidatePath('/daily')
  revalidatePath('/dashboard')
}

// ── READ ────────────────────────────────────────────────

export async function getReminders(filters?: {
  category?: ReminderCategory
  completed?: boolean
  overdue?: boolean
  today?: boolean
  upcoming?: boolean
  snoozed?: boolean
}): Promise<ChefReminder[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('chef_todos').select(REMINDER_FIELDS).eq('chef_id', user.entityId)

  if (filters?.completed !== undefined) {
    query = query.eq('completed', filters.completed)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  const today = new Date().toISOString().split('T')[0]

  if (filters?.overdue) {
    query = query.eq('completed', false).not('due_date', 'is', null).lt('due_date', today)
  }

  if (filters?.today) {
    query = query.eq('completed', false).eq('due_date', today)
  }

  if (filters?.upcoming) {
    const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    query = query
      .eq('completed', false)
      .not('due_date', 'is', null)
      .gt('due_date', today)
      .lte('due_date', weekOut)
  }

  if (filters?.snoozed) {
    query = query.eq('completed', false).not('snoozed_until', 'is', null)
  }

  query = query
    .order('completed', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('[Reminders] getReminders failed:', error)
    return []
  }

  return data ?? []
}

export async function getOverdueReminders(): Promise<ChefReminder[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('chef_todos')
    .select(REMINDER_FIELDS)
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .not('due_date', 'is', null)
    .lt('due_date', today)
    // Exclude currently snoozed items
    .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('[Reminders] getOverdueReminders failed:', error)
    return []
  }

  return data ?? []
}

export async function getSnoozedReminders(): Promise<ChefReminder[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date().toISOString()

  const { data, error } = await db
    .from('chef_todos')
    .select(REMINDER_FIELDS)
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .not('snoozed_until', 'is', null)
    .gt('snoozed_until', now)
    .order('snoozed_until', { ascending: true })

  if (error) {
    console.error('[Reminders] getSnoozedReminders failed:', error)
    return []
  }

  return data ?? []
}

// ── CREATE ──────────────────────────────────────────────

export async function createReminder(
  input: CreateReminderInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  const trimmed = input.text.trim()
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: 'Reminder text must be 1-500 characters' }
  }

  if (input.notes && input.notes.length > 2000) {
    return { success: false, error: 'Notes must be under 2000 characters' }
  }

  const db: any = createServerClient()

  // Get next sort_order
  const { data: last } = await db
    .from('chef_todos')
    .select('sort_order')
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (last?.sort_order ?? -1) + 1

  const insertData: Record<string, unknown> = {
    chef_id: user.entityId,
    text: trimmed,
    completed: false,
    sort_order: nextOrder,
    created_by: user.id,
    due_date: input.due_date || null,
    due_time: input.due_time || null,
    priority: input.priority || 'medium',
    category: input.category || 'general',
    reminder_at: input.reminder_at || null,
    notes: input.notes?.trim() || null,
    event_id: input.event_id || null,
    client_id: input.client_id || null,
    recurring_rule: input.recurring_rule || null,
    location_trigger: input.location_trigger || null,
  }

  const { data: created, error } = await db
    .from('chef_todos')
    .insert(insertData)
    .select('id')
    .single()

  if (error || !created) {
    console.error('[Reminders] createReminder failed:', error)
    return { success: false, error: 'Failed to create reminder' }
  }

  revalidateReminders()
  return { success: true, id: created.id }
}

// ── UPDATE ──────────────────────────────────────────────

export async function updateReminder(
  id: string,
  input: UpdateReminderInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {}

  if (input.text !== undefined) {
    const trimmed = input.text.trim()
    if (!trimmed || trimmed.length > 500) {
      return { success: false, error: 'Reminder text must be 1-500 characters' }
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
  if (input.recurring_rule !== undefined) updates.recurring_rule = input.recurring_rule || null
  if (input.location_trigger !== undefined)
    updates.location_trigger = input.location_trigger || null
  if (input.snoozed_until !== undefined) updates.snoozed_until = input.snoozed_until || null

  if (input.reminder_at !== undefined) {
    updates.reminder_at = input.reminder_at || null
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
    console.error('[Reminders] updateReminder failed:', error)
    return { success: false, error: 'Failed to update reminder' }
  }

  revalidateReminders()
  return { success: true }
}

// ── TOGGLE / DELETE ─────────────────────────────────────

export async function toggleReminder(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: todo, error: fetchError } = await db
    .from('chef_todos')
    .select('id, completed')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !todo) {
    return { success: false, error: 'Reminder not found' }
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
    console.error('[Reminders] toggleReminder failed:', error)
    return { success: false, error: 'Failed to toggle reminder' }
  }

  revalidateReminders()
  return { success: true }
}

export async function deleteReminder(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('chef_todos').delete().eq('id', id).eq('chef_id', user.entityId)

  if (error) {
    console.error('[Reminders] deleteReminder failed:', error)
    return { success: false, error: 'Failed to delete reminder' }
  }

  revalidateReminders()
  return { success: true }
}

// ── SNOOZE ──────────────────────────────────────────────

export async function snoozeReminder(
  id: string,
  optionKey: string
): Promise<{ success: boolean; error?: string }> {
  const option = SNOOZE_OPTIONS.find((o) => o.value === optionKey)
  if (!option) {
    return { success: false, error: 'Invalid snooze option' }
  }

  const snoozedUntil = option.getUntil().toISOString()

  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_todos')
    .update({ snoozed_until: snoozedUntil })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[Reminders] snoozeReminder failed:', error)
    return { success: false, error: 'Failed to snooze reminder' }
  }

  revalidateReminders()
  return { success: true }
}

export async function unsnoozeReminder(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_todos')
    .update({ snoozed_until: null })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[Reminders] unsnoozeReminder failed:', error)
    return { success: false, error: 'Failed to unsnooze reminder' }
  }

  revalidateReminders()
  return { success: true }
}
