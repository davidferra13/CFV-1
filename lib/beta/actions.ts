'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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
