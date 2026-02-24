// Recurring Task Engine
// Checks all tasks with recurring_rule and generates new instances for a given date.
// Idempotent — skips if a task with the same title + due_date + template already exists.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RecurringRule } from './actions'

// ============================================
// GENERATE RECURRING TASKS
// ============================================

/**
 * Check all tasks with a recurring_rule for this chef and create new
 * task instances for the given date if the rule matches.
 *
 * Supports: daily, weekly (with specific days), monthly (day of month).
 * Idempotent: won't create a duplicate if one already exists for the date.
 */
export async function generateRecurringTasks(date: string): Promise<number> {
  const user = await requireChef()
  const supabase = createServerClient()
  const chefId = user.tenantId!

  // Fetch all tasks with a recurring rule for this chef
  const { data: recurringTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('chef_id', chefId)
    .not('recurring_rule', 'is', null)

  if (fetchError) {
    console.error('[generateRecurringTasks] Fetch error:', fetchError)
    throw new Error('Failed to fetch recurring tasks')
  }

  if (!recurringTasks || recurringTasks.length === 0) {
    return 0
  }

  const targetDate = new Date(date + 'T00:00:00')
  const targetDayOfWeek = targetDate.getDay() // 0=Sun, 6=Sat
  const targetDayOfMonth = targetDate.getDate() // 1-31

  // Collect tasks that match the target date
  const tasksToCreate: Array<{
    chef_id: string
    title: string
    description: string | null
    assigned_to: string | null
    station_id: string | null
    due_date: string
    due_time: string | null
    priority: string
    status: string
    notes: string | null
    recurring_rule: RecurringRule | null
    template_id: string | null
  }> = []

  for (const task of recurringTasks) {
    const rule = task.recurring_rule as RecurringRule
    if (!rule || !rule.frequency) continue

    // Check if end_date has passed
    if (rule.end_date && date > rule.end_date) continue

    // Don't generate for dates before the original task's due date
    if (date <= task.due_date) continue

    const matches = doesRuleMatchDate(rule, targetDayOfWeek, targetDayOfMonth)
    if (!matches) continue

    tasksToCreate.push({
      chef_id: chefId,
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      station_id: task.station_id,
      due_date: date,
      due_time: task.due_time,
      priority: task.priority,
      status: 'pending',
      notes: task.notes,
      recurring_rule: null, // Generated instances don't recur themselves
      template_id: task.template_id,
    })
  }

  if (tasksToCreate.length === 0) {
    return 0
  }

  // Check for existing tasks to avoid duplicates (idempotent)
  const { data: existingTasks, error: existError } = await supabase
    .from('tasks')
    .select('title, due_date')
    .eq('chef_id', chefId)
    .eq('due_date', date)

  if (existError) {
    console.error('[generateRecurringTasks] Existing check error:', existError)
    throw new Error('Failed to check existing tasks')
  }

  const existingSet = new Set((existingTasks ?? []).map((t: any) => `${t.title}::${t.due_date}`))

  // Filter out duplicates
  const newTasks = tasksToCreate.filter((t) => !existingSet.has(`${t.title}::${t.due_date}`))

  if (newTasks.length === 0) {
    return 0
  }

  const { error: insertError } = await supabase.from('tasks').insert(newTasks)

  if (insertError) {
    console.error('[generateRecurringTasks] Insert error:', insertError)
    throw new Error('Failed to create recurring task instances')
  }

  revalidatePath('/tasks')
  return newTasks.length
}

// ============================================
// INTERNAL: Rule matching
// ============================================

function doesRuleMatchDate(
  rule: NonNullable<RecurringRule>,
  dayOfWeek: number,
  dayOfMonth: number
): boolean {
  switch (rule.frequency) {
    case 'daily':
      return true

    case 'weekly': {
      // If days_of_week specified, check if target day is in list
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        return rule.days_of_week.includes(dayOfWeek)
      }
      // If no specific days, generate every day (treat as daily for weekly without days)
      return true
    }

    case 'monthly': {
      if (rule.day_of_month !== undefined && rule.day_of_month !== null) {
        return dayOfMonth === rule.day_of_month
      }
      // If no day_of_month specified, default to first of month
      return dayOfMonth === 1
    }

    default:
      return false
  }
}
