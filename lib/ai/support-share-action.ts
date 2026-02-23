'use server'

/**
 * Support Share Action — voluntary conversation sharing with ChefFlow support.
 *
 * This is the ONLY way conversation content reaches ChefFlow's servers:
 * the chef explicitly taps "Send to Support" inside a specific conversation.
 *
 * - One-time share, not a persistent setting
 * - Only shares the single conversation the chef selects
 * - Chef can add a note explaining the issue
 * - Support team sees it like any other support ticket
 */

import { createClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/required'
import type { ExportedConversation } from './remy-local-storage'

interface ShareResult {
  success: boolean
  shareId?: string
  error?: string
}

/**
 * Share a specific Remy conversation with ChefFlow support.
 * The conversation is sent from the browser (where it lives) to the server.
 */
export async function shareConversationWithSupport(
  conversation: ExportedConversation,
  supportNote?: string
): Promise<ShareResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('remy_support_shares')
      .insert({
        tenant_id: tenantId,
        conversation_json: conversation as unknown as Record<string, unknown>,
        support_note: supportNote ?? null,
        status: 'open',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[support-share] Insert failed:', error)
      return { success: false, error: 'Failed to share conversation. Please try again.' }
    }

    return { success: true, shareId: data.id }
  } catch (err) {
    console.error('[support-share] Unexpected error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Get support shares for the current chef (so they can see what they've shared).
 */
export async function getMySupportShares(): Promise<
  Array<{
    id: string
    title: string
    status: string
    createdAt: string
    supportNote: string | null
  }>
> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('remy_support_shares')
      .select('id, conversation_json, status, created_at, support_note')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) return []

    return data.map((row) => ({
      id: row.id,
      title: (row.conversation_json as { title?: string })?.title ?? 'Untitled conversation',
      status: row.status,
      createdAt: row.created_at,
      supportNote: row.support_note,
    }))
  } catch {
    return []
  }
}
