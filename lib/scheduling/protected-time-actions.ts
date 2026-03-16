// Protected Time Management - Server Actions
// CRUD for blocked-off personal time using the existing chef_availability_blocks table.
// Extends the availability system with structured "protected time" semantics.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateProtectedTimeSchema = z.object({
  block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  block_type: z.enum(['full_day', 'partial']).default('full_day'),
  start_time: z.string().nullable().optional(), // HH:MM
  end_time: z.string().nullable().optional(),   // HH:MM
  reason: z.string().min(1, 'Reason required'),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().nullable().optional(), // e.g. "weekly", "monthly"
})

const UpdateProtectedTimeSchema = CreateProtectedTimeSchema.partial()

export type CreateProtectedTimeInput = z.infer<typeof CreateProtectedTimeSchema>
export type UpdateProtectedTimeInput = z.infer<typeof UpdateProtectedTimeSchema>

// ============================================
// TYPES
// ============================================

export interface ProtectedTimeBlock {
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

// ============================================
// ACTIONS
// ============================================

/**
 * Create a protected time block (personal time off, vacation, family time, etc.)
 * Uses the existing chef_availability_blocks table with is_event_auto = false.
 */
export async function createProtectedTime(input: CreateProtectedTimeInput): Promise<ProtectedTimeBlock> {
  const user = await requirePro('advanced-calendar')
  const validated = CreateProtectedTimeSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_availability_blocks')
    .insert({
      chef_id: user.tenantId!,
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
export async function updateProtectedTime(blockId: string, input: UpdateProtectedTimeInput): Promise<ProtectedTimeBlock> {
  const user = await requirePro('advanced-calendar')
  const validated = UpdateProtectedTimeSchema.parse(input)
  const supabase = createServerClient()

  const updateData: Record<string, unknown> = {}
  if (validated.block_date !== undefined) updateData.block_date = validated.block_date
  if (validated.block_type !== undefined) updateData.block_type = validated.block_type
  if (validated.start_time !== undefined) updateData.start_time = validated.start_time
  if (validated.end_time !== undefined) updateData.end_time = validated.end_time
  if (validated.reason !== undefined) updateData.reason = validated.reason

  const { data, error } = await (supabase as any)
    .from('chef_availability_blocks')
    .update(updateData)
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .eq('is_event_auto', false) // only allow editing manual blocks
    .select()
    .single()

  if (error) {
    console.error('[updateProtectedTime] Error:', error)
    throw new Error('Failed to update protected time block')
  }

  revalidatePath('/calendar')

  return mapToProtectedTime(data, validated.is_recurring ?? false, validated.recurrence_rule ?? null)
}

/**
 * Delete a protected time block.
 */
export async function deleteProtectedTime(blockId: string): Promise<void> {
  const user = await requirePro('advanced-calendar')
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('chef_availability_blocks')
    .delete()
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .eq('is_event_auto', false) // only allow deleting manual blocks

  if (error) {
    console.error('[deleteProtectedTime] Error:', error)
    throw new Error('Failed to delete protected time block')
  }

  revalidatePath('/calendar')
}

/**
 * Get all protected time blocks for a date range.
 */
export async function getProtectedTime(startDate: string, endDate: string): Promise<ProtectedTimeBlock[]> {
  const user = await requirePro('advanced-calendar')
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_availability_blocks')
    .select('*')
    .eq('chef_id', user.tenantId!)
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

// ============================================
// HELPERS
// ============================================

function mapToProtectedTime(row: any, isRecurring: boolean, recurrenceRule: string | null): ProtectedTimeBlock {
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
