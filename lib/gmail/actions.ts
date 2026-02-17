// Gmail Server Actions
// UI-facing actions for triggering sync, viewing history, and managing connection.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncGmailInbox } from './sync'
import type { SyncResult, GmailSyncLogEntry } from './types'

// ─── Trigger Gmail Sync ─────────────────────────────────────────────────────

export async function triggerGmailSync(): Promise<SyncResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify Gmail is connected
  const { data: conn } = await supabase
    .from('google_connections')
    .select('gmail_connected')
    .eq('chef_id', user.entityId)
    .single()

  if (!conn?.gmail_connected) {
    throw new Error('Gmail is not connected. Connect your Google account in Settings first.')
  }

  // Run the sync
  const result = await syncGmailInbox(user.entityId!, user.tenantId!)

  // Revalidate pages that show inquiry/message data
  revalidatePath('/inquiries')
  revalidatePath('/settings')

  return result
}

// ─── Get Gmail Sync History ─────────────────────────────────────────────────

export async function getGmailSyncHistory(
  limit = 20
): Promise<GmailSyncLogEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('gmail_sync_log')
    .select('id, gmail_message_id, from_address, subject, classification, confidence, action_taken, error, synced_at')
    .eq('tenant_id', user.tenantId!)
    .order('synced_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getGmailSyncHistory] Error:', error)
    return []
  }

  return data || []
}
