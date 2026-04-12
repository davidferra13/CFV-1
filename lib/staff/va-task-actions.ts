// VA Task Delegation - Server Actions
// Chef-only. Manages virtual assistant task assignments.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type VaTaskCategory =
  | 'admin'
  | 'scheduling'
  | 'communication'
  | 'data_entry'
  | 'research'
  | 'other'
export type VaTaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type VaTaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'

export interface VaTask {
  id: string
  chef_id: string
  title: string
  description: string | null
  category: VaTaskCategory
  priority: VaTaskPriority
  status: VaTaskStatus
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  notes: string | null
  attachments: unknown[]
  created_at: string
  updated_at: string
}

export interface VaTaskFilters {
  status?: VaTaskStatus
  category?: VaTaskCategory
  assignedTo?: string
}

export interface CreateVaTaskInput {
  title: string
  description?: string
  category: VaTaskCategory
  priority?: VaTaskPriority
  assigned_to?: string
  due_date?: string
  notes?: string
}

export interface UpdateVaTaskInput {
  title?: string
  description?: string | null
  category?: VaTaskCategory
  priority?: VaTaskPriority
  assigned_to?: string | null
  due_date?: string | null
  notes?: string | null
}

// ============================================
// VALID STATUS TRANSITIONS
// ============================================

const VALID_TRANSITIONS: Record<VaTaskStatus, VaTaskStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['review', 'completed', 'cancelled'],
  review: ['in_progress', 'completed', 'cancelled'],
  completed: ['pending'], // reopen
  cancelled: ['pending'], // reopen
}

// ============================================
// ACTIONS
// ============================================

export async function getVaTasks(filters?: VaTaskFilters): Promise<VaTask[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = (db as any)
    .from('va_tasks')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getVaTasks] Error:', error)
    throw new Error('Failed to load VA tasks')
  }
  return data ?? []
}

export async function createVaTask(input: CreateVaTaskInput): Promise<VaTask> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('va_tasks')
    .insert({
      chef_id: user.tenantId!,
      title: input.title,
      description: input.description || null,
      category: input.category,
      priority: input.priority || 'medium',
      assigned_to: input.assigned_to || null,
      due_date: input.due_date || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createVaTask] Error:', error)
    throw new Error('Failed to create VA task')
  }

  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return data
}

export async function updateVaTask(id: string, input: UpdateVaTaskInput): Promise<VaTask> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.category !== undefined) updateData.category = input.category
  if (input.priority !== undefined) updateData.priority = input.priority
  if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to
  if (input.due_date !== undefined) updateData.due_date = input.due_date
  if (input.notes !== undefined) updateData.notes = input.notes

  const { data, error } = await (db as any)
    .from('va_tasks')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateVaTask] Error:', error)
    throw new Error('Failed to update VA task')
  }

  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return data
}

export async function deleteVaTask(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await (db as any)
    .from('va_tasks')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteVaTask] Error:', error)
    throw new Error('Failed to delete VA task')
  }

  revalidatePath('/staff')
  revalidatePath('/dashboard')
}

export async function updateVaTaskStatus(id: string, newStatus: VaTaskStatus): Promise<VaTask> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current task to validate transition
  const { data: current, error: fetchError } = await (db as any)
    .from('va_tasks')
    .select('status')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Task not found')
  }

  const currentStatus = current.status as VaTaskStatus
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`)
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Set completed_at when moving to completed, clear when reopening
  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (currentStatus === 'completed') {
    updateData.completed_at = null
  }

  const { data, error } = await (db as any)
    .from('va_tasks')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateVaTaskStatus] Error:', error)
    throw new Error('Failed to update task status')
  }

  revalidatePath('/staff')
  revalidatePath('/dashboard')
  return data
}

export async function getVaTaskStats(): Promise<{
  pending: number
  in_progress: number
  review: number
  completed: number
  cancelled: number
  overdue: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('va_tasks')
    .select('status, due_date')
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[getVaTaskStats] Error:', error)
    throw new Error('Failed to load task stats')
  }

  const tasks = data ?? []
  const _vat = new Date()
  const now = `${_vat.getFullYear()}-${String(_vat.getMonth() + 1).padStart(2, '0')}-${String(_vat.getDate()).padStart(2, '0')}`

  const stats = {
    pending: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
  }

  for (const task of tasks) {
    const status = task.status as VaTaskStatus
    if (status in stats) {
      stats[status as keyof typeof stats]++
    }
    // Count overdue: has a due date in the past and not completed/cancelled
    if (task.due_date && task.due_date < now && status !== 'completed' && status !== 'cancelled') {
      stats.overdue++
    }
  }

  return stats
}

export async function getVaAssignees(): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await (db as any)
    .from('va_tasks')
    .select('assigned_to')
    .eq('chef_id', user.tenantId!)
    .not('assigned_to', 'is', null)

  if (error) {
    console.error('[getVaAssignees] Error:', error)
    throw new Error('Failed to load assignees')
  }

  const unique = new Set<string>()
  for (const row of data ?? []) {
    if (row.assigned_to) unique.add(row.assigned_to)
  }
  return Array.from(unique).sort()
}
