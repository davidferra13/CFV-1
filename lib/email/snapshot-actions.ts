'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEmailSnapshot, type EmailSnapshotResult } from '@/lib/lifecycle/email-snapshot'
import { getSnapshotVersion, shouldIntroducePortal, markPortalIntroduced } from './portal-strategy'

// ---------------------------------------------------------------------------
// Snapshot Server Actions
// Thin wrappers that provide snapshot data for events and inquiries,
// plus manual version override for individual message threads.
// Integrates with portal strategy for A/B snapshot version selection.
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

// ---------------------------------------------------------------------------
// Snapshot + Portal Strategy: combined snapshot generation with version
// ---------------------------------------------------------------------------

export interface SnapshotWithVersion {
  snapshot: EmailSnapshotResult
  version: 'a' | 'b'
  portalUrl: string | null
  shouldIntroduce: boolean
}

/**
 * Get snapshot data with the correct A/B version for a client.
 * Combines snapshot generation with portal strategy.
 * If the client qualifies for portal introduction, returns version B
 * with a portal URL; otherwise returns version A (full inline).
 */
export async function getSnapshotWithVersion(
  inquiryId: string,
  clientId: string,
  circlePath?: string | null
): Promise<SnapshotWithVersion> {
  const [snapshot, version, readyForPortal] = await Promise.all([
    getEmailSnapshot(inquiryId),
    getSnapshotVersion(clientId),
    shouldIntroducePortal(clientId),
  ])

  let portalUrl: string | null = null

  // If version B and we have a circle path, build the portal URL
  if (version === 'b' && circlePath) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
    const path = circlePath.startsWith('/') ? circlePath : `/${circlePath}`
    portalUrl = `${baseUrl}${path}?utm_source=chef_email&utm_medium=email&utm_campaign=dinner_snapshot`
  }

  return {
    snapshot,
    version,
    portalUrl,
    shouldIntroduce: readyForPortal,
  }
}

/**
 * After sending a version B email, mark the client as portal-introduced.
 * Call this after successfully sending an email with a portal link.
 */
export async function markClientPortalIntroduced(clientId: string): Promise<void> {
  await markPortalIntroduced(clientId)
}
