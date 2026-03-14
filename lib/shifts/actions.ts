// Shift Handoff Notes (Phase 2)
// CRUD for free-form shift notes between opening/mid/closing crews.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ShiftNote = {
  id: string
  chef_id: string
  author_id: string | null
  author_name: string
  shift: 'opening' | 'mid' | 'closing'
  date: string
  content: string
  pinned: boolean
  created_at: string
}

/**
 * Get shift notes for a specific date + any pinned notes from previous days.
 */
export async function getShiftNotes(date: string): Promise<{
  todayNotes: ShiftNote[]
  pinnedNotes: ShiftNote[]
  yesterdayClosingNotes: ShiftNote[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Yesterday's date
  const yesterday = new Date(date + 'T00:00:00')
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Fetch in parallel: today's notes, pinned notes, yesterday's closing notes
  const [todayResult, pinnedResult, closingResult] = await Promise.all([
    supabase
      .from('shift_handoff_notes')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('date', date)
      .order('created_at', { ascending: false }),
    supabase
      .from('shift_handoff_notes')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('pinned', true)
      .lt('date', date)
      .order('date', { ascending: false })
      .limit(10),
    supabase
      .from('shift_handoff_notes')
      .select('*')
      .eq('chef_id', user.tenantId!)
      .eq('date', yesterdayStr)
      .eq('shift', 'closing')
      .order('created_at', { ascending: false }),
  ])

  return {
    todayNotes: (todayResult.data ?? []) as ShiftNote[],
    pinnedNotes: (pinnedResult.data ?? []) as ShiftNote[],
    yesterdayClosingNotes: (closingResult.data ?? []) as ShiftNote[],
  }
}

/**
 * Create a new shift handoff note.
 */
export async function createShiftNote(input: {
  shift: 'opening' | 'mid' | 'closing'
  content: string
  date?: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!input.content.trim()) {
    throw new Error('Note content is required')
  }

  // Get author name
  const { data: chefData } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', user.tenantId!)
    .single()

  const { data, error } = await supabase
    .from('shift_handoff_notes')
    .insert({
      chef_id: user.tenantId!,
      author_id: user.entityId,
      author_name: chefData?.business_name ?? 'Chef',
      shift: input.shift,
      date: input.date ?? new Date().toISOString().split('T')[0],
      content: input.content.trim(),
      pinned: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[createShiftNote] Error:', error)
    throw new Error('Failed to create shift note')
  }

  revalidatePath('/briefing')
  revalidatePath('/stations/daily-ops')
  return data
}

/**
 * Toggle pin status on a shift note.
 */
export async function togglePinNote(noteId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current pin state
  const { data: current, error: fetchError } = await supabase
    .from('shift_handoff_notes')
    .select('pinned')
    .eq('id', noteId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Note not found')
  }

  const { error } = await supabase
    .from('shift_handoff_notes')
    .update({ pinned: !current.pinned })
    .eq('id', noteId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[togglePinNote] Error:', error)
    throw new Error('Failed to toggle pin')
  }

  revalidatePath('/briefing')
  revalidatePath('/stations/daily-ops')
}

/**
 * Delete a shift note.
 */
export async function deleteShiftNote(noteId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('shift_handoff_notes')
    .delete()
    .eq('id', noteId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteShiftNote] Error:', error)
    throw new Error('Failed to delete note')
  }

  revalidatePath('/briefing')
  revalidatePath('/stations/daily-ops')
}
