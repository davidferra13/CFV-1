'use server'

/**
 * Voicemail Server Actions
 *
 * Fetches voicemails from ai_calls (voicemail_left = true) and provides
 * mark-as-handled/unhandled mutations. The "handled" state is tracked via
 * extracted_data.voicemail_handled (boolean) to avoid schema changes.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----------------------------------------------------------------

export interface VoicemailEntry {
  id: string
  caller_name: string | null
  caller_phone: string
  transcript: string | null
  recording_url: string | null
  received_at: string
  duration_seconds: number | null
  handled: boolean
  suggested_action: 'return_call' | 'ignore' | 'delegate' | null
}

// ---- Helpers --------------------------------------------------------------

function inferSuggestedAction(
  transcript: string | null
): 'return_call' | 'ignore' | 'delegate' | null {
  if (!transcript) return null
  const lower = transcript.toLowerCase()
  // Vendor callbacks about availability, delivery, pricing
  if (
    lower.includes('calling back') ||
    lower.includes('callback') ||
    lower.includes('returning your call') ||
    lower.includes('available') ||
    lower.includes('delivery') ||
    lower.includes('price') ||
    lower.includes('order')
  ) {
    return 'return_call'
  }
  // Solicitations, spam indicators
  if (
    lower.includes('warranty') ||
    lower.includes('qualify') ||
    lower.includes('offer') ||
    lower.includes('press 1')
  ) {
    return 'ignore'
  }
  return 'return_call'
}

function mapRow(row: any): VoicemailEntry {
  const extractedData = row.extracted_data || {}
  return {
    id: row.id,
    caller_name: row.contact_name || null,
    caller_phone: row.contact_phone,
    transcript: row.full_transcript || null,
    recording_url: row.recording_url || null,
    received_at: row.created_at,
    duration_seconds: row.duration_seconds ?? null,
    handled: !!extractedData.voicemail_handled,
    suggested_action: inferSuggestedAction(row.full_transcript),
  }
}

// ---- Actions --------------------------------------------------------------

/**
 * Get all voicemails for the authenticated chef.
 * Queries ai_calls where voicemail_left = true, ordered newest first.
 */
export async function getVoicemails(
  filter?: 'all' | 'unhandled' | 'handled'
): Promise<VoicemailEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('ai_calls')
    .select(
      'id, contact_name, contact_phone, full_transcript, recording_url, duration_seconds, extracted_data, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .eq('voicemail_left', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[voicemail-actions] getVoicemails query failed:', error)
    throw new Error('Failed to load voicemails')
  }

  const all = (data ?? []).map(mapRow)

  if (!filter || filter === 'all') return all
  if (filter === 'unhandled') return all.filter((v: VoicemailEntry) => !v.handled)
  if (filter === 'handled') return all.filter((v: VoicemailEntry) => v.handled)
  return all
}

/**
 * Mark a voicemail as handled.
 * Sets extracted_data.voicemail_handled = true on the ai_calls row.
 */
export async function markVoicemailHandled(aiCallId: string): Promise<void> {
  if (!aiCallId) throw new Error('Missing aiCallId')

  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current extracted_data to merge
  const { data: existing, error: fetchError } = await db
    .from('ai_calls')
    .select('extracted_data')
    .eq('id', aiCallId)
    .eq('chef_id', user.tenantId!)
    .eq('voicemail_left', true)
    .single()

  if (fetchError || !existing) {
    throw new Error('Voicemail not found or access denied')
  }

  const merged = { ...(existing.extracted_data || {}), voicemail_handled: true }

  const { error: updateError } = await db
    .from('ai_calls')
    .update({ extracted_data: merged, updated_at: new Date().toISOString() })
    .eq('id', aiCallId)
    .eq('chef_id', user.tenantId!)

  if (updateError) {
    console.error('[voicemail-actions] markVoicemailHandled failed:', updateError)
    throw new Error('Failed to mark voicemail as handled')
  }

  revalidatePath('/calling')
}

/**
 * Mark a voicemail as unhandled (undo).
 * Sets extracted_data.voicemail_handled = false on the ai_calls row.
 */
export async function markVoicemailUnhandled(aiCallId: string): Promise<void> {
  if (!aiCallId) throw new Error('Missing aiCallId')

  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing, error: fetchError } = await db
    .from('ai_calls')
    .select('extracted_data')
    .eq('id', aiCallId)
    .eq('chef_id', user.tenantId!)
    .eq('voicemail_left', true)
    .single()

  if (fetchError || !existing) {
    throw new Error('Voicemail not found or access denied')
  }

  const merged = { ...(existing.extracted_data || {}), voicemail_handled: false }

  const { error: updateError } = await db
    .from('ai_calls')
    .update({ extracted_data: merged, updated_at: new Date().toISOString() })
    .eq('id', aiCallId)
    .eq('chef_id', user.tenantId!)

  if (updateError) {
    console.error('[voicemail-actions] markVoicemailUnhandled failed:', updateError)
    throw new Error('Failed to mark voicemail as unhandled')
  }

  revalidatePath('/calling')
}
