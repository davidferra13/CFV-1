'use server'

// Protected Time & Rest Day Blocking — Server Actions
// Creates and manages personal-time blocks in the event_prep_blocks table.
// block_type column was added by migration 20260322000012_capacity_protection.sql.
// Only blocks with block_type IN ('protected_personal', 'rest') are managed here.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProtectedBlockType = 'protected_personal' | 'rest'

export type ProtectedBlock = {
  id: string
  title: string
  start_date: string
  end_date: string
  block_type: ProtectedBlockType
  created_at: string
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProtectedBlock(input: {
  title: string
  start_date: string
  end_date: string
  block_type: ProtectedBlockType
}): Promise<{ success: boolean; id?: string }> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  if (!['protected_personal', 'rest'].includes(input.block_type)) {
    throw new Error('Invalid block_type for protected block')
  }

  // event_prep_blocks uses chef_id (not tenant_id) — see migration 20260304000001
  // block_type column added by migration 20260322000012
  // We store start_date in block_date; end_date in a notes-friendly way via title + notes.
  // Since event_prep_blocks only has block_date (not start/end), we insert one row per day
  // OR we store end_date in the notes column. Using notes for end_date is the pragmatic
  // approach until a dedicated table is added.
  const { data, error } = await supabase
    .from('event_prep_blocks' as any)
    .insert({
      chef_id: chef.tenantId!,
      block_date: input.start_date,
      title: input.title,
      notes: input.end_date !== input.start_date ? `Until: ${input.end_date}` : null,
      block_type: input.block_type,
      is_system_generated: false,
      is_completed: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createProtectedBlock] Error:', error)
    throw new Error('Failed to create protected block')
  }

  revalidatePath('/schedule')
  revalidatePath('/calendar')
  return { success: true, id: (data as any)?.id }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProtectedBlock(id: string): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from('event_prep_blocks' as any)
    .select('id, chef_id')
    .eq('id', id)
    .single()

  if (!existing || (existing as any).chef_id !== chef.tenantId!) {
    throw new Error('Block not found or access denied')
  }

  const { error } = await supabase
    .from('event_prep_blocks' as any)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteProtectedBlock] Error:', error)
    throw new Error('Failed to delete protected block')
  }

  revalidatePath('/schedule')
  revalidatePath('/calendar')
  return { success: true }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProtectedBlocks(): Promise<ProtectedBlock[]> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_prep_blocks' as any)
    .select('id, title, block_date, notes, block_type, created_at')
    .eq('chef_id', chef.tenantId!)
    .in('block_type', ['protected_personal', 'rest'])
    .order('block_date', { ascending: true })

  if (error) {
    console.error('[listProtectedBlocks] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => {
    // Parse end_date from notes if present, otherwise same as start_date
    let endDate = row.block_date
    if (row.notes && (row.notes as string).startsWith('Until: ')) {
      endDate = (row.notes as string).replace('Until: ', '').trim()
    }

    return {
      id: row.id,
      title: row.title,
      start_date: row.block_date,
      end_date: endDate,
      block_type: row.block_type as ProtectedBlockType,
      created_at: row.created_at,
    }
  })
}
