'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

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
  // Periodic cleanup every 50 requests
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
    const supabase = createAdminClient()

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

    return { success: true }
  } catch (err) {
    console.error('[beta-signup] Unexpected error:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Get all beta signups for the admin view.
 */
export async function getBetaSignups() {
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

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
 * Get the total count of beta signups (for social proof on public page).
 */
export async function getBetaSignupCount(): Promise<number> {
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

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
    // Wrap in quotes and escape inner quotes
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
