'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEmailSnapshot, type EmailSnapshotResult } from '@/lib/lifecycle/email-snapshot'

// ---------------------------------------------------------------------------
// Snapshot Server Actions
// Thin wrappers that provide snapshot data for events and inquiries,
// plus manual version override for individual message threads.
// ---------------------------------------------------------------------------

/**
 * Assembles snapshot data for an event.
 * Looks up the inquiry linked to the event, then delegates to getEmailSnapshot.
 */
export async function getSnapshotForEvent(eventId: string): Promise<EmailSnapshotResult | null> {
  const user = await requireChef()
  const db = createServerClient()

  // Find the inquiry that converted to this event
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id')
    .eq('converted_to_event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .limit(1)
    .single()

  if (!inquiry) return null

  return getEmailSnapshot(inquiry.id)
}

/**
 * Assembles snapshot data for an inquiry.
 * Direct pass-through to the core getEmailSnapshot function.
 */
export async function getSnapshotForInquiry(inquiryId: string): Promise<EmailSnapshotResult> {
  return getEmailSnapshot(inquiryId)
}

/**
 * Manually override the snapshot version for a specific message.
 * Used when the chef wants to force a particular version (A or B)
 * for an individual outgoing email.
 */
export async function toggleSnapshotVersion(
  messageId: string,
  version: 'a' | 'b'
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db = createServerClient()

  const { error } = await db
    .from('messages')
    .update({ snapshot_version: version })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to update snapshot version: ${error.message}`)
  }

  return { success: true }
}
