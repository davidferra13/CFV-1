// Priority Queue - Task Provider
// Surfaces overdue, active, and due-soon operational tasks as first-class queue work.

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

type TaskQueueRow = {
  id: string
  title: string
  description: string | null
  due_date: string
  due_time: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'done'
  created_at: string | null
  updated_at: string | null
  staff_member?: { name?: string | null; role?: string | null } | null
}

const PRIORITY_IMPACT: Record<TaskQueueRow['priority'], number> = {
  low: 0.25,
  medium: 0.45,
  high: 0.7,
  urgent: 0.9,
}

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function parseTaskDueAt(task: TaskQueueRow): Date {
  const time = task.due_time && /^\d{2}:\d{2}/.test(task.due_time) ? task.due_time : '23:59'
  const parsed = new Date(`${task.due_date}T${time}:00`)
  if (!Number.isNaN(parsed.getTime())) return parsed
  return new Date(`${task.due_date}T23:59:00`)
}

function formatTaskDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function actionVerb(task: TaskQueueRow): string {
  if (task.status === 'in_progress') return 'Finish'
  return 'Start'
}

export function buildTaskQueueItem(task: TaskQueueRow, now: Date = new Date()): QueueItem {
  const dueAt = parseTaskDueAt(task)
  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / 3600000
  const createdAt = task.created_at ?? task.updated_at ?? now.toISOString()
  const hoursSinceCreated = Math.max(0, (now.getTime() - new Date(createdAt).getTime()) / 3600000)
  const overdue = hoursUntilDue < 0
  const assignedName = task.staff_member?.name?.trim() || null
  const scoreInputs: ScoreInputs = {
    hoursUntilDue,
    impactWeight: PRIORITY_IMPACT[task.priority],
    isBlocking: overdue || task.priority === 'urgent' || task.status === 'in_progress',
    hoursSinceCreated,
    revenueCents: 0,
    isExpiring: task.priority === 'urgent' || overdue,
  }
  const score = computeScore(scoreInputs)
  const urgency = overdue && task.priority !== 'low' ? 'critical' : urgencyFromScore(score)
  const selectedDate = dateOnly(dueAt)
  const verb = actionVerb(task)

  return {
    id: `task:task:${task.id}:${task.status}`,
    domain: 'task',
    urgency,
    score,
    title: `${verb}: ${task.title}`,
    description: overdue
      ? `This task is overdue. Open it and complete the smallest visible step now.`
      : `This task is due ${formatTaskDate(dueAt)}. Open it and move it forward now.`,
    href: `/tasks?date=${encodeURIComponent(selectedDate)}`,
    icon: 'ListChecks',
    context: {
      primaryLabel: assignedName ?? 'Unassigned task',
      secondaryLabel:
        task.status === 'in_progress'
          ? 'In progress'
          : overdue
            ? 'Overdue'
            : `${task.priority} priority`,
    },
    createdAt,
    dueAt: dueAt.toISOString(),
    blocks: overdue ? "Today's plan" : task.status === 'in_progress' ? 'Task handoff' : undefined,
    entityId: task.id,
    entityType: 'task',
    estimatedMinutes: task.status === 'in_progress' ? 10 : 5,
    contextLine: assignedName ? `Assigned to ${assignedName}` : 'No assignee selected',
  }
}

export async function getTaskQueueItems(db: any, tenantId: string): Promise<QueueItem[]> {
  const now = new Date()
  const throughDate = dateOnly(addDays(now, 7))

  const { data, error } = await db
    .from('tasks')
    .select(
      'id, title, description, due_date, due_time, priority, status, created_at, updated_at, staff_member:staff_members!assigned_to(name, role)'
    )
    .eq('chef_id', tenantId)
    .in('status', ['pending', 'in_progress'])
    .lte('due_date', throughDate)
    .order('due_date', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[Queue] Task provider failed:', error)
    return []
  }

  return ((data ?? []) as TaskQueueRow[]).map((task) => buildTaskQueueItem(task, now))
}
