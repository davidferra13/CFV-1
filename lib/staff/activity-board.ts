// Staff Activity Board Data (Phase 8)
// Aggregates staff activity from tasks, clipboard edits, and check-ins.
// No real-time subscription needed server-side. The page auto-refreshes.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type StaffActivity = {
  id: string
  name: string
  role: string
  status: 'active' | 'idle' | 'offline'
  currentTask: string | null
  currentStation: string | null
  lastActivity: string | null // ISO timestamp
  lastActivityType: string | null // 'task_complete', 'clipboard_update', 'check_in', etc.
  tasksToday: number
  tasksDoneToday: number
  minutesSinceActivity: number | null
}

/**
 * Get activity data for all active staff members.
 * Derives activity from task status changes, clipboard updates, and station check-ins.
 */
export async function getStaffActivityBoard(): Promise<StaffActivity[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!
  const today = new Date().toISOString().split('T')[0]
  const now = Date.now()

  // Fetch all active staff
  const { data: staffMembers, error: staffError } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('chef_id', tenantId)
    .eq('status', 'active')
    .order('name')

  if (staffError || !staffMembers?.length) {
    return []
  }

  const staffIds = staffMembers.map((s: any) => s.id)

  // Fetch data in parallel
  const [tasksResult, completionLogResult, opsLogResult, clipboardResult] = await Promise.all([
    // Today's tasks per staff member
    supabase
      .from('tasks')
      .select('id, assigned_to, status, title')
      .eq('chef_id', tenantId)
      .eq('due_date', today)
      .in('assigned_to', staffIds),
    // Recent task completion log (today)
    supabase
      .from('task_completion_log')
      .select('completed_by, completed_at')
      .eq('chef_id', tenantId)
      .gte('completed_at', today + 'T00:00:00')
      .order('completed_at', { ascending: false }),
    // Recent ops log entries (today, by staff)
    supabase
      .from('ops_log')
      .select('staff_member_id, created_at, action_type')
      .eq('chef_id', tenantId)
      .gte('created_at', today + 'T00:00:00')
      .in('staff_member_id', staffIds)
      .order('created_at', { ascending: false })
      .limit(100),
    // Station clipboard entries (today, updated_by staff)
    supabase
      .from('clipboard_entries')
      .select('updated_by, updated_at')
      .eq('chef_id', tenantId)
      .gte('updated_at', today + 'T00:00:00')
      .in('updated_by', staffIds)
      .order('updated_at', { ascending: false })
      .limit(100),
  ])

  const tasks = tasksResult.data ?? []
  const completionLogs = completionLogResult.data ?? []
  const opsLogs = opsLogResult.data ?? []
  const clipboardUpdates = clipboardResult.data ?? []

  // Build activity map per staff member
  return staffMembers.map((staff: any) => {
    const staffTasks = tasks.filter((t: any) => t.assigned_to === staff.id)
    const inProgressTask = staffTasks.find((t: any) => t.status === 'in_progress')
    const tasksDone = staffTasks.filter((t: any) => t.status === 'done').length

    // Find most recent activity across all sources
    let lastActivity: string | null = null
    let lastActivityType: string | null = null

    // Check completion log
    const lastCompletion = completionLogs.find((l: any) => l.completed_by === staff.id)
    if (lastCompletion) {
      lastActivity = lastCompletion.completed_at
      lastActivityType = 'task_complete'
    }

    // Check ops log
    const lastOps = opsLogs.find((l: any) => l.staff_member_id === staff.id)
    if (lastOps && (!lastActivity || new Date(lastOps.created_at) > new Date(lastActivity))) {
      lastActivity = lastOps.created_at
      lastActivityType = lastOps.action_type ?? 'ops_update'
    }

    // Check clipboard updates
    const lastClipboard = clipboardUpdates.find((c: any) => c.updated_by === staff.id)
    if (
      lastClipboard &&
      (!lastActivity || new Date(lastClipboard.updated_at) > new Date(lastActivity))
    ) {
      lastActivity = lastClipboard.updated_at
      lastActivityType = 'clipboard_update'
    }

    // Determine status
    let status: 'active' | 'idle' | 'offline' = 'offline'
    let minutesSinceActivity: number | null = null

    if (lastActivity) {
      minutesSinceActivity = Math.floor((now - new Date(lastActivity).getTime()) / 60000)
      if (minutesSinceActivity <= 15) status = 'active'
      else if (minutesSinceActivity <= 60) status = 'idle'
      else status = 'offline'
    }

    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      status,
      currentTask: inProgressTask?.title ?? null,
      currentStation: null, // Would need station check-in data
      lastActivity,
      lastActivityType,
      tasksToday: staffTasks.length,
      tasksDoneToday: tasksDone,
      minutesSinceActivity,
    }
  })
}
