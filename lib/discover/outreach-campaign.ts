'use server'

// Directory Outreach Campaign Engine
// Batch selection, send orchestration, and admin dashboard stats.
// Uses neutral sender identity (DIRECTORY_OUTREACH_FROM_EMAIL).
// NEVER mentions ChefFlow in outreach emails.

import { createServerClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/auth/admin'
import { sendEmail } from '@/lib/email/send'
import { DirectoryInvitationEmail } from '@/lib/email/templates/directory-invitation'
import { revalidatePath } from 'next/cache'
import { createOutreachRef } from './outreach-crypto'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const OUTREACH_FROM = process.env.DIRECTORY_OUTREACH_FROM_EMAIL || ''
const OUTREACH_PHYSICAL_ADDRESS = process.env.OUTREACH_PHYSICAL_ADDRESS || ''

// ── Outreach Queue Selection ─────────────────────────────────────────────────

export async function getOutreachQueue(input: {
  batchSize: number
  minLeadScore?: number
}): Promise<any[]> {
  await requireAdmin()
  const db = createServerClient({ admin: true })
  const minScore = input.minLeadScore ?? 0

  // Select discovered listings with email, not yet contacted, not opted out
  // Deduplicate by email (one email per operator even if multiple listings)
  const { data, error } = await db
    .from('directory_listings')
    .select(
      'id, name, email, city, state, business_type, cuisine_types, lead_score, website_url, slug'
    )
    .eq('status', 'discovered')
    .eq('outreach_status', 'not_contacted')
    .not('email', 'is', null)
    .neq('email', '')
    .gte('lead_score', minScore)
    .order('lead_score', { ascending: false })
    .limit(input.batchSize * 2) // Over-fetch to handle dedup

  if (error || !data) return []

  // Deduplicate by email (pick highest lead_score per email)
  const seenEmails = new Set<string>()
  const queue: any[] = []
  for (const listing of data) {
    const email = (listing.email as string).toLowerCase()
    if (seenEmails.has(email)) continue

    // Check opt-out
    const { data: pref } = await db
      .from('directory_email_preferences')
      .select('opted_out')
      .eq('email', email)
      .single()
    if (pref?.opted_out) continue

    // Check if already contacted via outreach log
    const { data: logEntry } = await db
      .from('directory_outreach_log')
      .select('id')
      .eq('recipient_email', email)
      .eq('email_type', 'invitation')
      .limit(1)
      .maybeSingle()
    if (logEntry) continue

    seenEmails.add(email)
    queue.push(listing)
    if (queue.length >= input.batchSize) break
  }

  return queue
}

// ── Mark Contacted ───────────────────────────────────────────────────────────

export async function markAsContacted(
  listingId: string,
  batchId: string
): Promise<{ success: boolean }> {
  const db = createServerClient({ admin: true })
  const { error } = await db
    .from('directory_listings')
    .update({
      outreach_status: 'contacted',
      outreach_contacted_at: new Date().toISOString(),
      outreach_batch_id: batchId,
    })
    .eq('id', listingId)

  return { success: !error }
}

// ── Send Invitation Email ────────────────────────────────────────────────────

export async function sendDirectoryInvitationEmail(listing: {
  id: string
  name: string
  email: string
  city: string
  state: string | null
  business_type: string
}): Promise<{ success: boolean; error?: string }> {
  // CAN-SPAM: require physical address
  if (!OUTREACH_PHYSICAL_ADDRESS) {
    return {
      success: false,
      error: 'OUTREACH_PHYSICAL_ADDRESS env var not set (CAN-SPAM requirement)',
    }
  }

  if (!OUTREACH_FROM) {
    return { success: false, error: 'DIRECTORY_OUTREACH_FROM_EMAIL env var not set' }
  }

  const db = createServerClient({ admin: true })
  const ref = createOutreachRef(listing.id)
  const joinUrl = `${SITE_URL}/discover/join?ref=${ref}`
  const optOutUrl = `${SITE_URL}/discover/unsubscribe?t=${Buffer.from(listing.email.toLowerCase()).toString('base64url')}`

  const subject = `Want to be featured in ${listing.city}'s food directory?`

  try {
    const success = await sendEmail({
      to: listing.email,
      from: OUTREACH_FROM,
      subject,
      react: DirectoryInvitationEmail({
        businessName: listing.name,
        businessType: listing.business_type,
        city: listing.city,
        joinUrl,
        optOutUrl,
        physicalAddress: OUTREACH_PHYSICAL_ADDRESS,
      }),
    })

    // Log the outreach attempt
    await db.from('directory_outreach_log').insert({
      listing_id: listing.id,
      email_type: 'invitation',
      recipient_email: listing.email,
      subject,
      error: success ? null : 'Resend returned false',
    })

    return { success }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    try {
      await db.from('directory_outreach_log').insert({
        listing_id: listing.id,
        email_type: 'invitation',
        recipient_email: listing.email,
        subject,
        error: errorMsg,
      })
    } catch {
      // Non-blocking log failure
    }
    return { success: false, error: errorMsg }
  }
}

// ── Create Batch ─────────────────────────────────────────────────────────────

export async function createOutreachBatch(input: {
  targetCount: number
  filtersUsed?: Record<string, any>
}): Promise<{ batchId: string }> {
  await requireAdmin()
  const db = createServerClient({ admin: true })
  const { data } = await db
    .from('outreach_batches')
    .insert({
      target_count: input.targetCount,
      filters_used: input.filtersUsed ?? null,
    })
    .select('id')
    .single()

  return { batchId: (data as any)?.id }
}

export async function completeBatch(batchId: string, sentCount: number): Promise<void> {
  const db = createServerClient({ admin: true })
  await db
    .from('outreach_batches')
    .update({
      sent_count: sentCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId)
}

// ── Admin Dashboard Stats ────────────────────────────────────────────────────

export async function getOutreachDashboardStats(): Promise<{
  funnel: Record<string, number>
  batches: any[]
  recentOptOuts: string[]
}> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  // Funnel: count listings by outreach_status
  const { data: allListings } = await db.from('directory_listings').select('outreach_status')

  const funnel: Record<string, number> = {
    not_contacted: 0,
    queued: 0,
    contacted: 0,
    opened: 0,
    replied: 0,
    claimed_via_outreach: 0,
    opted_out: 0,
    bounced: 0,
  }
  for (const row of allListings ?? []) {
    const status = (row as any).outreach_status || 'not_contacted'
    funnel[status] = (funnel[status] || 0) + 1
  }

  // Only count listings with email for the not_contacted bucket (relevant pool)
  const { data: emailListings } = await db
    .from('directory_listings')
    .select('id')
    .eq('status', 'discovered')
    .eq('outreach_status', 'not_contacted')
    .not('email', 'is', null)
    .neq('email', '')
  funnel.not_contacted_with_email = (emailListings ?? []).length

  // Batch history
  const { data: batches } = await db
    .from('outreach_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Recent opt-outs
  const { data: optOuts } = await db
    .from('directory_email_preferences')
    .select('email, opted_out_at')
    .eq('opted_out', true)
    .order('opted_out_at', { ascending: false })
    .limit(10)

  return {
    funnel,
    batches: batches ?? [],
    recentOptOuts: (optOuts ?? []).map((r: any) => r.email),
  }
}
