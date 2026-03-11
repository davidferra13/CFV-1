'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { BetaWelcomeEmail } from '@/lib/email/templates/beta-welcome'
import { BetaInviteEmail } from '@/lib/email/templates/beta-invite'
import { BetaSignupAdminEmail } from '@/lib/email/templates/beta-signup-admin'
import { getAdminNotificationRecipients, resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { createNotification } from '@/lib/notifications/actions'
import { buildBetaInviteUrl } from './invite-utils'

export interface BetaSignupInput {
  name: string
  email: string
  phone?: string
  businessName?: string
  cuisineType?: string
  yearsInBusiness?: string
  referralSource?: string
  website?: string // honeypot
}

type BetaOnboardingLinkInput = {
  email: string
  name?: string
  source?: string
}

type BetaSignupStatus = 'pending' | 'invited' | 'onboarded' | 'declined'

type UpdateBetaSignupStatusOptions = {
  sendInviteEmail?: boolean
}

export type UpdateBetaSignupStatusResult = {
  success: boolean
  error?: string
  message?: string
  updated?: {
    status: BetaSignupStatus
    notes: string | null
    invitedAt: string | null
    onboardedAt: string | null
  }
}

const ADMIN_NOTIFICATION_RECIPIENTS = getAdminNotificationRecipients()

// ── In-memory IP rate limiting (same pattern as embed inquiry) ──
const ipBuckets = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_MAX = 5 // 5 submissions per window
const RATE_LIMIT_WINDOW_MS = 60_000 * 5 // 5 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipBuckets.set(ip, { count: 1, windowStart: now })
    return true
  }
  bucket.count++
  if (bucket.count % 50 === 0) {
    for (const [key, b] of ipBuckets) {
      if (now - b.windowStart > RATE_LIMIT_WINDOW_MS * 2) ipBuckets.delete(key)
    }
  }
  return bucket.count <= RATE_LIMIT_MAX
}

/**
 * Submit a beta signup from the public /beta form.
 * Idempotent by email — re-submitting updates the existing record.
 * Sends welcome email to user + notification to admin (non-blocking).
 */
export async function submitBetaSignup(
  input: BetaSignupInput
): Promise<{ success: boolean; error?: string }> {
  // Honeypot check — bots fill hidden fields, real users never see them
  if (input.website) {
    return { success: true } // fake success so bots don't retry
  }

  // Rate limit by IP
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return { success: false, error: 'Too many submissions. Please try again in a few minutes.' }
  }

  const name = input.name?.trim()
  const email = input.email?.trim().toLowerCase()

  if (!name || name.length < 2) {
    return { success: false, error: 'Please enter your name.' }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase: any = createAdminClient()

    // Check if this email already exists (for deciding whether to send emails)
    const { data: existing } = await supabase
      .from('beta_signups')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    const isNewSignup = !existing

    const { error } = await supabase.from('beta_signups').upsert(
      {
        name,
        email,
        phone: input.phone?.trim() || null,
        business_name: input.businessName?.trim() || null,
        cuisine_type: input.cuisineType?.trim() || null,
        years_in_business: input.yearsInBusiness?.trim() || null,
        referral_source: input.referralSource?.trim() || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )

    if (error) {
      console.error('[beta-signup] Insert failed:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    // Non-blocking side effects — only for new signups (not re-submissions)
    if (isNewSignup) {
      // 1. Welcome email to the person who signed up
      try {
        await sendEmail({
          to: email,
          subject: "You're on the list — ChefFlow Beta",
          react: BetaWelcomeEmail({ name }),
        })
      } catch (err) {
        console.error('[beta-signup] Welcome email failed:', err)
      }

      // 2. Notification to admin
      try {
        const totalSignups = await getBetaSignupCount()
        await sendEmail({
          to: ADMIN_NOTIFICATION_RECIPIENTS,
          subject: `New beta signup: ${name}`,
          react: BetaSignupAdminEmail({
            name,
            email,
            businessName: input.businessName?.trim() || null,
            cuisineType: input.cuisineType?.trim() || null,
            yearsInBusiness: input.yearsInBusiness?.trim() || null,
            referralSource: input.referralSource?.trim() || null,
            totalSignups,
          }),
        })
      } catch (err) {
        console.error('[beta-signup] Admin notification failed:', err)
      }

      // 3. Founder in-app alert (owner control plane feed)
      try {
        const owner = await resolveOwnerIdentity(supabase)
        if (owner.ownerChefId && owner.ownerAuthUserId) {
          await createNotification({
            tenantId: owner.ownerChefId,
            recipientId: owner.ownerAuthUserId,
            category: 'system',
            action: 'system_alert',
            title: `New beta signup: ${name}`,
            body: `${email} joined the beta waitlist.`,
            actionUrl: '/admin/beta',
            metadata: {
              kind: 'beta_signup_received',
              signup_name: name,
              signup_email: email,
            },
          })
        }
      } catch (err) {
        console.error('[beta-signup] Founder in-app alert failed:', err)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[beta-signup] Unexpected error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Mark a beta signup as onboarded when the person actually creates an account.
 * Returns true when the email is tied to beta (existing row or source-tagged ref).
 */
export async function markBetaSignupOnboardedByEmail(
  input: BetaOnboardingLinkInput
): Promise<boolean> {
  const email = input.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false
  }

  const source = input.source?.trim() || null
  const nowIso = new Date().toISOString()
  const supabase: any = createAdminClient()

  try {
    const { data: existing, error: existingError } = await supabase
      .from('beta_signups')
      .select('id, referral_source, onboarded_at')
      .eq('email', email)
      .maybeSingle()

    if (existingError) {
      console.error('[beta-signup] Onboarded lookup failed:', existingError)
      return false
    }

    if (existing) {
      const updates: {
        status: 'onboarded'
        onboarded_at?: string
        referral_source?: string
      } = {
        status: 'onboarded',
      }

      if (!existing.onboarded_at) {
        updates.onboarded_at = nowIso
      }
      if (!existing.referral_source && source) {
        updates.referral_source = source
      }

      const { error: updateError } = await supabase
        .from('beta_signups')
        .update(updates)
        .eq('id', existing.id)

      if (updateError) {
        console.error('[beta-signup] Onboarded update failed:', updateError)
        return false
      }

      return true
    }

    // If no prior beta record exists, only create one when explicit beta ref is present.
    if (!source) return false

    const inferredName = input.name?.trim() || email.split('@')[0] || 'Beta Chef'
    const { error: insertError } = await supabase.from('beta_signups').insert({
      name: inferredName,
      email,
      referral_source: source,
      status: 'onboarded',
      created_at: nowIso,
      onboarded_at: nowIso,
    })

    if (insertError) {
      console.error('[beta-signup] Onboarded insert failed:', insertError)
      return false
    }

    return true
  } catch (err) {
    console.error('[beta-signup] Onboarded sync failed:', err)
    return false
  }
}

/**
 * Get all beta signups for the admin view.
 */
export async function getBetaSignups() {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('beta_signups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[beta-signup] Fetch failed:', error)
    return []
  }

  return data ?? []
}

/**
 * Update a beta signup's status (admin action).
 */
export async function updateBetaSignupStatus(
  id: string,
  status: BetaSignupStatus,
  notes?: string,
  options?: UpdateBetaSignupStatusOptions
): Promise<UpdateBetaSignupStatusResult> {
  await requireAdmin()
  const supabase: any = createAdminClient()
  const normalizedNotes = notes !== undefined ? notes.trim() || null : undefined
  let inviteSent = false

  if (status === 'invited' && options?.sendInviteEmail) {
    const { data: signup, error: signupError } = await supabase
      .from('beta_signups')
      .select('name, email')
      .eq('id', id)
      .maybeSingle()

    if (signupError || !signup?.email) {
      console.error('[beta-signup] Invite lookup failed:', signupError)
      return { success: false, error: 'Failed to load signup before sending invite.' }
    }

    const inviteUrl = buildBetaInviteUrl(signup.email)
    const emailResult = await sendEmail({
      to: signup.email,
      subject: 'Your ChefFlow beta invite is ready',
      react: BetaInviteEmail({
        name: signup.name?.trim() || signup.email.split('@')[0] || 'there',
        inviteUrl,
      }),
    })

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.skipped
          ? 'Invite email could not be sent because email delivery is not configured.'
          : emailResult.error || 'Failed to send invite email.',
      }
    }

    inviteSent = true
  }

  const updates: Record<string, unknown> = { status }

  if (status === 'invited') {
    updates.invited_at = new Date().toISOString()
  } else if (status === 'onboarded') {
    updates.onboarded_at = new Date().toISOString()
  }

  if (normalizedNotes !== undefined) {
    updates.notes = normalizedNotes
  }

  const { data, error } = await supabase
    .from('beta_signups')
    .update(updates)
    .eq('id', id)
    .select('status, notes, invited_at, onboarded_at')
    .single()

  if (error) {
    console.error('[beta-signup] Status update failed:', error)
    return {
      success: false,
      error: inviteSent
        ? 'Invite email was sent, but the row failed to update. Refresh before retrying.'
        : 'Failed to update status.',
    }
  }

  return {
    success: true,
    message: inviteSent ? 'Invite email sent.' : undefined,
    updated: {
      status: data.status as BetaSignupStatus,
      notes: (data.notes as string | null) ?? null,
      invitedAt: (data.invited_at as string | null) ?? null,
      onboardedAt: (data.onboarded_at as string | null) ?? null,
    },
  }
}

/**
 * Delete a beta signup (admin action).
 */
export async function deleteBetaSignup(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const { error } = await supabase.from('beta_signups').delete().eq('id', id)

  if (error) {
    console.error('[beta-signup] Delete failed:', error)
    return { success: false, error: 'Failed to delete signup.' }
  }

  return { success: true }
}

/**
 * Get the total count of beta signups (for social proof on public page).
 */
export async function getBetaSignupCount(): Promise<number> {
  const supabase: any = createAdminClient()

  const { count, error } = await supabase
    .from('beta_signups')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('[beta-signup] Count failed:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Export beta signups as CSV string (admin action).
 */
export async function exportBetaSignupsCsv(): Promise<string> {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('beta_signups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return ''

  const csvHeaders = [
    'Name',
    'Email',
    'Phone',
    'Business',
    'Cuisine',
    'Years',
    'Source',
    'Status',
    'Notes',
    'Signed Up',
    'Invited',
    'Onboarded',
  ]

  const escape = (val: string | null) => {
    if (!val) return ''
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const rows = data.map((r: any) =>
    [
      escape(r.name),
      escape(r.email),
      escape(r.phone),
      escape(r.business_name),
      escape(r.cuisine_type),
      escape(r.years_in_business),
      escape(r.referral_source),
      escape(r.status),
      escape(r.notes),
      r.created_at ? new Date(r.created_at).toISOString() : '',
      r.invited_at ? new Date(r.invited_at).toISOString() : '',
      r.onboarded_at ? new Date(r.onboarded_at).toISOString() : '',
    ].join(',')
  )

  return [csvHeaders.join(','), ...rows].join('\n')
}
