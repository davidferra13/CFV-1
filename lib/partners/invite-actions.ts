'use server'

// Partner Invite Flow
// Chefs send partners a one-time link to claim their account.
// Partners open the link, sign up with email + password, and get access
// to their showcase portal — no financial data, just pride and stats.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cheflowhq.com'

/**
 * Generate a one-time invite link for a partner.
 * Called by the chef from the partner detail page.
 * Returns the URL the chef should send to the partner.
 */
export async function generatePartnerInvite(
  partnerId: string
): Promise<{ success: true; inviteUrl: string }> {
  await requireChef()

  const supabase = createServerClient({ admin: true })

  // Verify the partner belongs to this chef's tenant
  const { data: rawPartner1 } = await supabase
    .from('referral_partners')
    .select('id, name, claimed_at')
    .eq('id', partnerId)
    .single()
  const partner = rawPartner1 as any

  if (!partner) {
    throw new Error('Partner not found')
  }

  if (partner.claimed_at) {
    throw new Error('This partner has already claimed their account.')
  }

  // Generate a fresh UUID invite token using Node.js crypto (available in server actions)
  const { randomUUID } = await import('crypto')
  const token = randomUUID()

  await supabase
    .from('referral_partners')
    .update({
      invite_token: token,
      invite_sent_at: new Date().toISOString(),
    } as any)
    .eq('id', partnerId)

  const inviteUrl = `${APP_URL}/auth/partner-signup?token=${token}`

  console.log('[generatePartnerInvite] Invite created for partner', {
    partnerId,
    partnerName: partner.name,
  })

  return { success: true, inviteUrl }
}

/**
 * Claim a partner invite. Called from the partner signup page after
 * the chef sends the partner the invite link.
 *
 * Creates a Supabase auth user (auto-confirms email since the invite is trusted),
 * links it to the referral_partners record, and inserts a user_roles row.
 *
 * Returns success or an error message to display on the form.
 */
export async function claimPartnerInvite(
  token: string,
  email: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  if (!token || token.length < 10) {
    return { error: 'Invalid invite link. Please ask your chef for a new one.' }
  }

  const supabase = createServerClient({ admin: true })

  // Validate the token and ensure it hasn't been claimed
  const { data: rawPartner2 } = await supabase
    .from('referral_partners')
    .select('id, name, tenant_id, invite_token, claimed_at')
    .eq('invite_token' as any, token)
    .single()
  const partner = rawPartner2 as any

  if (!partner) {
    return {
      error:
        'This invite link is invalid or has already been used. Ask your chef to send a new one.',
    }
  }

  if (partner.claimed_at) {
    return { error: 'This invite has already been claimed. Try signing in instead.' }
  }

  // Create the Supabase auth user
  // email_confirm: true skips the verification email since the invite IS the trust signal
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already')) {
      return { error: 'An account with this email already exists. Try signing in.' }
    }
    return { error: authError?.message ?? 'Failed to create account. Please try again.' }
  }

  const userId = authData.user.id

  try {
    // Insert the user_roles row marking this user as a partner
    await supabase.from('user_roles').insert({
      auth_user_id: userId,
      role: 'partner' as any,
      entity_id: partner.id,
    })

    // Mark the invite as claimed
    await supabase
      .from('referral_partners')
      .update({
        auth_user_id: userId,
        invite_token: null, // one-time use — clear after claim
        claimed_at: new Date().toISOString(),
      } as any)
      .eq('id', partner.id)

    console.log('[claimPartnerInvite] Partner account claimed', {
      partnerId: partner.id,
      partnerName: partner.name,
      userId,
    })

    return { success: true }
  } catch (err) {
    // Rollback: delete the auth user if the DB write fails
    try {
      await supabase.auth.admin.deleteUser(userId)
    } catch {
      // Best-effort cleanup
    }
    console.error('[claimPartnerInvite] DB write failed after auth user created', { err })
    return { error: 'Account setup failed. Please try again or contact support.' }
  }
}
