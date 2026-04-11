'use server'

// Directory Outreach - Email Actions
// Sends transactional emails to businesses that opted in (submitted or claimed).
// All sends are non-blocking side effects with logging.
// Respects opt-out preferences before sending.

import { createServerClient } from '@/lib/db/server'
import { sendEmail } from '@/lib/email/send'
import { DirectoryWelcomeEmail } from '@/lib/email/templates/directory-welcome'
import { DirectoryClaimedEmail } from '@/lib/email/templates/directory-claimed'
import { DirectoryVerifiedEmail } from '@/lib/email/templates/directory-verified'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

// ─── Opt-Out Check ────────────────────────────────────────────────────────────

async function isOptedOut(email: string): Promise<boolean> {
  const db = createServerClient({ admin: true })
  const { data } = await db
    .from('directory_email_preferences')
    .select('opted_out')
    .eq('email', email.toLowerCase())
    .single()

  return data?.opted_out === true
}

function buildOptOutUrl(email: string): string {
  const token = Buffer.from(email.toLowerCase()).toString('base64url')
  return `${SITE_URL}/nearby/unsubscribe?t=${token}`
}

// ─── Logging ──────────────────────────────────────────────────────────────────

async function logOutreach(params: {
  listingId: string
  emailType: string
  recipientEmail: string
  subject: string
  success: boolean
  error?: string
}): Promise<void> {
  try {
    const db = createServerClient({ admin: true })
    await db.from('directory_outreach_log').insert({
      listing_id: params.listingId,
      email_type: params.emailType,
      recipient_email: params.recipientEmail,
      subject: params.subject,
      error: params.success ? null : params.error || 'Unknown error',
    })
  } catch (err) {
    console.error('[logOutreach] Failed to log:', err)
  }
}

// ─── Email Senders ────────────────────────────────────────────────────────────

/**
 * Send welcome email when a business submits their listing.
 * Non-blocking: logs errors, never throws.
 */
export async function sendDirectoryWelcomeEmail(params: {
  listingId: string
  businessName: string
  businessType: string
  slug: string
  recipientEmail: string
}): Promise<void> {
  const { listingId, businessName, businessType, slug, recipientEmail } = params

  if (await isOptedOut(recipientEmail)) {
    console.log(`[outreach] Skipped welcome for ${businessName}: opted out`)
    return
  }

  const subject = `${businessName} is submitted to the ChefFlow directory`
  const optOutUrl = buildOptOutUrl(recipientEmail)

  try {
    const success = await sendEmail({
      to: recipientEmail,
      subject,
      react: DirectoryWelcomeEmail({ businessName, businessType, slug, optOutUrl }),
    })

    await logOutreach({
      listingId,
      emailType: 'welcome',
      recipientEmail,
      subject,
      success,
    })
  } catch (err) {
    console.error('[outreach] Welcome email failed:', err)
    await logOutreach({
      listingId,
      emailType: 'welcome',
      recipientEmail,
      subject,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

/**
 * Send claimed email when a business owner claims their listing.
 * Non-blocking: logs errors, never throws.
 */
export async function sendDirectoryClaimedEmail(params: {
  listingId: string
  businessName: string
  claimerName: string
  slug: string
  recipientEmail: string
}): Promise<void> {
  const { listingId, businessName, claimerName, slug, recipientEmail } = params

  if (await isOptedOut(recipientEmail)) {
    console.log(`[outreach] Skipped claimed for ${businessName}: opted out`)
    return
  }

  const subject = `You claimed ${businessName} on ChefFlow`
  const optOutUrl = buildOptOutUrl(recipientEmail)
  const enhanceUrl = `${SITE_URL}/nearby/${slug}/enhance`

  try {
    const success = await sendEmail({
      to: recipientEmail,
      subject,
      react: DirectoryClaimedEmail({
        businessName,
        claimerName,
        slug,
        enhanceUrl,
        optOutUrl,
      }),
    })

    await logOutreach({
      listingId,
      emailType: 'claimed',
      recipientEmail,
      subject,
      success,
    })
  } catch (err) {
    console.error('[outreach] Claimed email failed:', err)
    await logOutreach({
      listingId,
      emailType: 'claimed',
      recipientEmail,
      subject,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

/**
 * Send verified email when admin verifies/approves a listing.
 * Non-blocking: logs errors, never throws.
 */
export async function sendDirectoryVerifiedEmail(params: {
  listingId: string
  businessName: string
  slug: string
  recipientEmail: string
}): Promise<void> {
  const { listingId, businessName, slug, recipientEmail } = params

  if (await isOptedOut(recipientEmail)) {
    console.log(`[outreach] Skipped verified for ${businessName}: opted out`)
    return
  }

  const subject = `${businessName} is now verified on ChefFlow`
  const optOutUrl = buildOptOutUrl(recipientEmail)

  try {
    const success = await sendEmail({
      to: recipientEmail,
      subject,
      react: DirectoryVerifiedEmail({ businessName, slug, optOutUrl }),
    })

    await logOutreach({
      listingId,
      emailType: 'verified',
      recipientEmail,
      subject,
      success,
    })
  } catch (err) {
    console.error('[outreach] Verified email failed:', err)
    await logOutreach({
      listingId,
      emailType: 'verified',
      recipientEmail,
      subject,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── Opt-Out Management ───────────────────────────────────────────────────────

/**
 * Record an email opt-out. Called from the unsubscribe page.
 */
export async function optOutDirectoryEmail(
  email: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!email) return { success: false, error: 'Email is required.' }

  const db = createServerClient({ admin: true })
  const normalized = email.toLowerCase()

  // Upsert: create or update the preference
  const { error } = await db.from('directory_email_preferences').upsert(
    {
      email: normalized,
      opted_out: true,
      opted_out_at: new Date().toISOString(),
      opt_out_reason: reason || null,
    },
    { onConflict: 'email' }
  )

  if (error) {
    console.error('[optOutDirectoryEmail]', error)
    return { success: false, error: 'Failed to save preference.' }
  }

  return { success: true }
}

// ─── Admin: Outreach Stats ────────────────────────────────────────────────────

export async function getOutreachStats(): Promise<{
  totalSent: number
  byType: { type: string; count: number }[]
  recentErrors: { listing_id: string; email_type: string; error: string; sent_at: string }[]
  optOutCount: number
}> {
  const db = createServerClient({ admin: true })

  const [logResult, errorResult, optOutResult] = await Promise.all([
    db.from('directory_outreach_log').select('email_type'),
    db
      .from('directory_outreach_log')
      .select('listing_id, email_type, error, sent_at')
      .not('error', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(10),
    db.from('directory_email_preferences').select('id').eq('opted_out', true),
  ])

  const logs = (logResult.data || []) as any[]
  const typeCounts: Record<string, number> = {}
  for (const log of logs) {
    typeCounts[log.email_type] = (typeCounts[log.email_type] || 0) + 1
  }

  return {
    totalSent: logs.length,
    byType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
    recentErrors: (errorResult.data || []) as any[],
    optOutCount: (optOutResult.data || []).length,
  }
}
