'use server'

// Stripe Connect Express
// Handles chef-side Stripe account setup for receiving payouts.
// Uses Express accounts: chefs are independent businesses, ChefFlow is the platform.
//
// NOTE: This module handles Connect ONBOARDING and STATUS only.
// Routing payments through connected accounts (transfer_data.destination) is a
// separate follow-on task and does not modify existing payment flows.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

export type ConnectAccountStatus = {
  connected: boolean // true when Stripe reports charges_enabled
  pending: boolean // stripe_account_id set but not yet charges_enabled
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

// ─── Get status (no side effects) ────────────────────────────────────────────

/**
 * Returns the current Stripe Connect status for the authenticated chef.
 * Reads only from the DB (fast). Use refreshConnectAccountStatus() to sync
 * with Stripe if the chef may have just completed their onboarding.
 */
export async function getConnectAccountStatus(): Promise<ConnectAccountStatus> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', user.entityId)
    .single()

  if (!data?.stripe_account_id) {
    return {
      connected: false,
      pending: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
    }
  }

  return {
    connected: data.stripe_onboarding_complete === true,
    pending: data.stripe_account_id !== null && !data.stripe_onboarding_complete,
    accountId: data.stripe_account_id,
    chargesEnabled: data.stripe_onboarding_complete === true,
    payoutsEnabled: data.stripe_onboarding_complete === true,
  }
}

// ─── Create Connect account link ─────────────────────────────────────────────

/**
 * Creates a Stripe Express account (if not already created) and returns a
 * one-time hosted onboarding URL. Redirects the chef to Stripe's hosted UI.
 *
 * @param fromOnboarding - true when called from the wizard; affects the return URL.
 */
export async function createConnectAccountLink(fromOnboarding = false): Promise<{ url: string }> {
  const user = await requireChef()
  const supabase = createServerClient()
  const stripe = getStripe()

  // Fetch current state
  const { data: chef } = await supabase
    .from('chefs')
    .select('stripe_account_id, email, business_name')
    .eq('id', user.entityId)
    .single()

  let accountId: string = chef?.stripe_account_id ?? ''

  // Create Express account if not yet created
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: chef?.email || undefined,
      business_profile: {
        name: chef?.business_name || undefined,
      },
      metadata: {
        chef_id: user.entityId,
        platform: 'chefflow',
      },
    } as Stripe.AccountCreateParams)

    accountId = account.id

    const { error } = await supabase
      .from('chefs')
      .update({ stripe_account_id: accountId })
      .eq('id', user.entityId)

    if (error) {
      console.error('[createConnectAccountLink] Failed to save account ID:', error)
      throw new Error('Failed to save Stripe account ID')
    }
  }

  // Build return/refresh URLs (carry source context for the callback handler)
  const origin = fromOnboarding ? 'onboarding' : 'settings'
  const returnUrl = `${SITE_URL}/api/stripe/connect/callback?from=${origin}`
  const refreshUrl = `${SITE_URL}/api/stripe/connect/callback?from=${origin}&refresh=true`

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })

  return { url: accountLink.url }
}

// ─── Refresh status from Stripe API ──────────────────────────────────────────

/**
 * Queries Stripe's API to get the latest account status and updates the DB.
 * Call this when the chef returns from Stripe's hosted onboarding, and also
 * from the account.updated webhook handler.
 */
export async function refreshConnectAccountStatus(): Promise<ConnectAccountStatus> {
  const user = await requireChef()
  const supabase = createServerClient()
  const stripe = getStripe()

  const { data: chef } = await supabase
    .from('chefs')
    .select('stripe_account_id')
    .eq('id', user.entityId)
    .single()

  if (!chef?.stripe_account_id) {
    return {
      connected: false,
      pending: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
    }
  }

  const account = await stripe.accounts.retrieve(chef.stripe_account_id)

  await supabase
    .from('chefs')
    .update({ stripe_onboarding_complete: account.charges_enabled === true })
    .eq('id', user.entityId)

  revalidatePath('/settings/stripe-connect')
  revalidatePath('/onboarding')

  return {
    connected: account.charges_enabled === true,
    pending: !account.charges_enabled,
    accountId: chef.stripe_account_id,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
  }
}

// ─── Update status from webhook (no auth — uses chef ID directly) ─────────────

/**
 * Updates stripe_onboarding_complete for a given Stripe account ID.
 * Called from the account.updated webhook handler (no chef auth context available).
 */
export async function updateConnectStatusFromWebhook(
  stripeAccountId: string,
  chargesEnabled: boolean
): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('chefs')
    .update({ stripe_onboarding_complete: chargesEnabled })
    .eq('stripe_account_id', stripeAccountId)

  if (error) {
    console.error('[updateConnectStatusFromWebhook]', error)
  }
}
