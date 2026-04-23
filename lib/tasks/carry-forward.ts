// Task Carry-Forward (Phase 1)
// Queries incomplete tasks from previous days and surfaces them on today's board.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { Task } from './actions'
import { dateToDateString } from '@/lib/utils/format'
import { TASK_WITH_STAFF_SELECT } from './selects'

export type CarriedTask = Task & {
  originalDate: string
  daysOverdue: number
}

/**
 * Get all incomplete tasks from previous days (not done, not cancelled).
 * Returns them sorted by date (oldest first), then priority.
 */
export async function getCarriedOverTasks(today: string): Promise<CarriedTask[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tasks')
    .select(TASK_WITH_STAFF_SELECT)
    .eq('chef_id', user.tenantId!)
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress'])
    .is('recurring_rule', null) // Don't carry forward recurring templates
    .order('due_date', { ascending: true })
    .order('priority', { ascending: false })

  if (error) {
    console.error('[getCarriedOverTasks] Error:', error)
    return []
  }

  const todayDate = new Date(today + 'T00:00:00')

  return ((data ?? []) as Task[]).map((task) => {
    const taskDate = new Date(dateToDateString(task.due_date as Date | string) + 'T00:00:00')
    const diffDays = Math.floor((todayDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))
    return {
      ...task,
      originalDate: task.due_date,
      daysOverdue: diffDays,
    }
  })
}

/**
 * Get count of overdue tasks (for dashboard badge).
 */
export async function getOverdueTaskCount(): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()
  const _tcf = new Date()
  const today = `${_tcf.getFullYear()}-${String(_tcf.getMonth() + 1).padStart(2, '0')}-${String(_tcf.getDate()).padStart(2, '0')}`

  const { count, error } = await db
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress'])
    .is('recurring_rule', null)

  if (error) {
    console.error('[getOverdueTaskCount] Error:', error)
    return 0
  }

  return count ?? 0
}
