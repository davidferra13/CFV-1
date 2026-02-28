'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { BetaWelcomeEmail } from '@/lib/email/templates/beta-welcome'
import { BetaSignupAdminEmail } from '@/lib/email/templates/beta-signup-admin'

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

// Admin email for signup notifications
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@cheflowhq.com'

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
          to: ADMIN_EMAIL,
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
  status: 'pending' | 'invited' | 'onboarded' | 'declined',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase: any = createAdminClient()

  const updates: Record<string, unknown> = { status }

  if (status === 'invited') {
    updates.invited_at = new Date().toISOString()
  } else if (status === 'onboarded') {
    updates.onboarded_at = new Date().toISOString()
  }

  if (notes !== undefined) {
    updates.notes = notes
  }

  const { error } = await supabase.from('beta_signups').update(updates).eq('id', id)

  if (error) {
    console.error('[beta-signup] Status update failed:', error)
    return { success: false, error: 'Failed to update status.' }
  }

  return { success: true }
}

/**
 * Delete a beta signup (admin action).
 */
export async function deleteBetaSignup(id: string): Promise<{ success: boolean; error?: string }> {
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

  const rows = data.map((r) =>
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
