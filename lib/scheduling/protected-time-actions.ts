// Protected Time Management - Server Actions
// CRUD for blocked-off personal time using the existing chef_availability_blocks table.
// Extends the availability system with structured "protected time" semantics.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { dateToDateString } from '@/lib/utils/format'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateProtectedTimeSchema = z.object({
  block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  block_type: z.enum(['full_day', 'partial']).default('full_day'),
  start_time: z.string().nullable().optional(), // HH:MM
  end_time: z.string().nullable().optional(), // HH:MM
  reason: z.string().min(1, 'Reason required'),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().nullable().optional(), // e.g. "weekly", "monthly"
})

const UpdateProtectedTimeSchema = CreateProtectedTimeSchema.partial()
const ProtectedTimeIdSchema = z.string().uuid('Invalid protected time block id')

type CreateProtectedTimeInput = z.infer<typeof CreateProtectedTimeSchema>
type UpdateProtectedTimeInput = z.infer<typeof UpdateProtectedTimeSchema>

// ============================================
// TYPES
// ============================================

interface ProtectedTimeBlock {
  id: string
  chefId: string
  blockDate: string
  blockType: 'full_day' | 'partial'
  startTime: string | null
  endTime: string | null
  reason: string
  isRecurring: boolean
  recurrenceRule: string | null
  createdAt: string
}

interface ProtectedBlockSummary {
  id: string
  start_date: string
  end_date: string
  title: string
  block_type: 'full_day' | 'partial'
  start_time: string | null
  end_time: string | null
  reason: string
  created_at: string
}

// ============================================
// ACTIONS
// ============================================

/**
 * Create a protected time block (personal time off, vacation, family time, etc.)
 * Uses the existing chef_availability_blocks table with is_event_auto = false.
 */
export async function createProtectedTime(
  input: CreateProtectedTimeInput
): Promise<ProtectedTimeBlock> {
  const user = await requireChef()
  const validated = CreateProtectedTimeSchema.parse(input)
  const db: any = createServerClient()
  const chefId = user.entityId

  const { data, error } = await (db as any)
    .from('chef_availability_blocks')
    .insert({
      chef_id: chefId,
      block_date: validated.block_date,
      block_type: validated.block_type,
      start_time: validated.start_time ?? null,
      end_time: validated.end_time ?? null,
      reason: validated.reason,
      is_event_auto: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[createProtectedTime] Error:', error)
    throw new Error('Failed to create protected time block')
  }

  revalidatePath('/calendar')

  return mapToProtectedTime(data, validated.is_recurring, validated.recurrence_rule ?? null)
}

/**
 * Update a protected time block.
 */
export async function updateProtectedTime(
  blockId: string,
  input: UpdateProtectedTimeInput
): Promise<ProtectedTimeBlock> {
  const user = await requireChef()
  const validatedBlockId = ProtectedTimeIdSchema.parse(blockId)
  const validated = UpdateProtectedTimeSchema.parse(input)
  const db: any = createServerClient()
  const chefId = user.entityId

  const updateData: Record<string, unknown> = {}
  if (validated.block_date !== undefined) updateData.block_date = validated.block_date
  if (validated.block_type !== undefined) updateData.block_type = validated.block_type
  if (validated.start_time !== undefined) updateData.start_time = validated.start_time
  if (validated.end_time !== undefined) updateData.end_time = validated.end_time
  if (validated.reason !== undefined) updateData.reason = validated.reason

  const { data, error } = await (db as any)
    .from('chef_availability_blocks')
    .update(updateData)
    .eq('id', validatedBlockId)
    .eq('chef_id', chefId)
    .eq('is_event_auto', false) // only allow editing manual blocks
    .select()
    .single()

  if (error) {
    console.error('[updateProtectedTime] Error:', error)
    throw new Error('Failed to update protected time block')
  }

  revalidatePath('/calendar')

  return mapToProtectedTime(
    data,
    validated.is_recurring ?? false,
    validated.recurrence_rule ?? null
  )
}

/**
 * Delete a protected time block.
 */
export async function deleteProtectedTime(
  blockId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsedBlockId = ProtectedTimeIdSchema.safeParse(blockId)
  if (!parsedBlockId.success) {
    return { success: false, error: 'Invalid protected time block id.' }
  }

  const db: any = createServerClient()
  const chefId = user.entityId

  const { data, error } = await (db as any)
    .from('chef_availability_blocks')
    .delete()
    .eq('id', parsedBlockId.data)
    .eq('chef_id', chefId)
    .eq('is_event_auto', false) // only allow deleting manual blocks
    .select('id')

  if (error) {
    console.error('[deleteProtectedTime] Error:', error)
    return { success: false, error: 'Failed to remove protected time block.' }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Protected time block not found.' }
  }

  revalidatePath('/calendar')
  return { success: true }
}

/**
 * Get all protected time blocks for a date range.
 */
export async function getProtectedTime(
  startDate: string,
  endDate: string
): Promise<ProtectedTimeBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.entityId

  const { data, error } = await (db as any)
    .from('chef_availability_blocks')
    .select('*')
    .eq('chef_id', chefId)
    .eq('is_event_auto', false) // only manual blocks = protected time
    .gte('block_date', startDate)
    .lte('block_date', endDate)
    .order('block_date')

  if (error) {
    console.error('[getProtectedTime] Error:', error)
    throw new Error('Failed to load protected time blocks')
  }

  return (data ?? []).map((d: any) => mapToProtectedTime(d, false, null))
}

/**
 * Get one chef-owned protected time block.
 */
export async function getProtectedTimeBlock(blockId: string): Promise<ProtectedTimeBlock | null> {
  const user = await requireChef()
  const parsedBlockId = ProtectedTimeIdSchema.safeParse(blockId)
  if (!parsedBlockId.success) return null

  const db: any = createServerClient()
  const chefId = user.entityId

  const { data, error } = await (db as any)
    .from('chef_availability_blocks')
    .select('id, chef_id, block_date, block_type, start_time, end_time, reason, created_at')
    .eq('id', parsedBlockId.data)
    .eq('chef_id', chefId)
    .eq('is_event_auto', false)
    .maybeSingle()

  if (error) {
    console.error('[getProtectedTimeBlock] Error:', error)
    throw new Error('Failed to load protected time block')
  }

  return data ? mapToProtectedTime(data, false, null) : null
}

/**
 * Backward-compatible summary list used by Daily Ops and Remy intelligence.
 * The underlying table stores single-date blocks, so start/end are the same day.
 */
export async function listProtectedBlocks(
  startDate?: string,
  endDate?: string
): Promise<ProtectedBlockSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.entityId

  let query = (db as any)
    .from('chef_availability_blocks')
    .select('id, block_date, block_type, start_time, end_time, reason, created_at')
    .eq('chef_id', chefId)
    .eq('is_event_auto', false)
    .order('block_date')

  if (startDate) {
    query = query.gte('block_date', startDate)
  }

  if (endDate) {
    query = query.lte('block_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[listProtectedBlocks] Error:', error)
    throw new Error('Failed to load protected time blocks')
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    start_date: dateToDateString(row.block_date as Date | string),
    end_date: dateToDateString(row.block_date as Date | string),
    title: row.reason ?? 'Protected time',
    block_type: row.block_type,
    start_time: row.start_time ?? null,
    end_time: row.end_time ?? null,
    reason: row.reason ?? '',
    created_at: row.created_at,
  }))
}

// ============================================
// HELPERS
// ============================================

function mapToProtectedTime(
  row: any,
  isRecurring: boolean,
  recurrenceRule: string | null
): ProtectedTimeBlock {
  return {
    id: row.id,
    chefId: row.chef_id,
    blockDate: row.block_date,
    blockType: row.block_type,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    reason: row.reason ?? '',
    isRecurring,
    recurrenceRule,
    createdAt: row.created_at,
  }
}
