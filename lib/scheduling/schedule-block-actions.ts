'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ScheduleBlockType = 'external_shift' | 'personal' | 'prep' | 'blocked'

export interface ScheduleBlock {
  id: string
  chef_id: string
  title: string
  block_type: ScheduleBlockType
  start_at: string
  end_at: string
  all_day: boolean
  recurrence_rule: string | null
  source: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateScheduleBlockInput {
  title: string
  block_type: ScheduleBlockType
  start_at: string
  end_at: string
  all_day?: boolean
  recurrence_rule?: string | null
  notes?: string | null
}

export interface UpdateScheduleBlockInput {
  title?: string
  block_type?: ScheduleBlockType
  start_at?: string
  end_at?: string
  all_day?: boolean
  recurrence_rule?: string | null
  notes?: string | null
}

// â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get all schedule blocks for the current chef.
 * Returns in chronological order.
 */
export async function getScheduleBlocks(): Promise<ScheduleBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_schedule_blocks')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('[schedule-blocks] Failed to fetch blocks', error)
    return []
  }

  return data ?? []
}

/**
 * Get schedule blocks for a date range.
 * Useful for checking availability for a specific period.
 */
export async function getScheduleBlocksForRange(
  startDate: string,
  endDate: string
): Promise<ScheduleBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_schedule_blocks')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('start_at', startDate)
    .lte('end_at', endDate)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('[schedule-blocks] Range query failed', error)
    return []
  }

  return data ?? []
}

/**
 * Create a new schedule block.
 */
export async function createScheduleBlock(
  input: CreateScheduleBlockInput
): Promise<{ success: boolean; error?: string; block?: ScheduleBlock }> {
  const user = await requireChef()

  // Validate
  if (!input.title.trim()) {
    return { success: false, error: 'Title is required' }
  }
  if (!input.start_at || !input.end_at) {
    return { success: false, error: 'Start and end times are required' }
  }
  if (new Date(input.end_at) <= new Date(input.start_at) && !input.all_day) {
    return { success: false, error: 'End time must be after start time' }
  }

  const VALID_TYPES: ScheduleBlockType[] = ['external_shift', 'personal', 'prep', 'blocked']
  if (!VALID_TYPES.includes(input.block_type)) {
    return { success: false, error: 'Invalid block type' }
  }

  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_schedule_blocks')
    .insert({
      chef_id: user.tenantId!,
      title: input.title.trim(),
      block_type: input.block_type,
      start_at: input.start_at,
      end_at: input.end_at,
      all_day: input.all_day ?? false,
      recurrence_rule: input.recurrence_rule ?? null,
      source: 'manual',
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[schedule-blocks] Create failed', error)
    return { success: false, error: 'Failed to create schedule block' }
  }

  revalidatePath('/settings/schedule')
  return { success: true, block: data }
}

/**
 * Update an existing schedule block.
 */
export async function updateScheduleBlock(
  blockId: string,
  input: UpdateScheduleBlockInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('chef_schedule_blocks')
    .select('id')
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (!existing) {
    return { success: false, error: 'Block not found' }
  }

  const updates: Record<string, unknown> = {}
  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.block_type !== undefined) updates.block_type = input.block_type
  if (input.start_at !== undefined) updates.start_at = input.start_at
  if (input.end_at !== undefined) updates.end_at = input.end_at
  if (input.all_day !== undefined) updates.all_day = input.all_day
  if (input.recurrence_rule !== undefined) updates.recurrence_rule = input.recurrence_rule
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db
    .from('chef_schedule_blocks')
    .update(updates)
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[schedule-blocks] Update failed', error)
    return { success: false, error: 'Failed to update schedule block' }
  }

  revalidatePath('/settings/schedule')
  return { success: true }
}

/**
 * Delete a schedule block.
 */
export async function deleteScheduleBlock(
  blockId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('chef_schedule_blocks')
    .select('id')
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (!existing) {
    return { success: false, error: 'Block not found' }
  }

  const { error } = await db
    .from('chef_schedule_blocks')
    .delete()
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[schedule-blocks] Delete failed', error)
    return { success: false, error: 'Failed to delete schedule block' }
  }

  revalidatePath('/settings/schedule')
  return { success: true }
}
