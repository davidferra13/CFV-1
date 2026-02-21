'use server'

// SaaS Subscription Management
// Handles ChefFlow's own billing: chefs pay ChefFlow a subscription fee.
// This is SEPARATE from Stripe Connect (which routes client payments to chefs).
//
// Flow for new chefs:
//   1. signUpChef() → createStripeCustomer() + startTrial() (non-blocking)
//   2. Trial lasts 14 days (subscription_status = 'trialing')
//   3. Soft banner appears when ≤3 days remain or trial expires
//   4. Webhook handlers update status when subscription created/updated/deleted
//
// Existing chefs: subscription_status = 'grandfathered' → no banner ever.

import { createServerClient } from '@/lib/supabase/server'
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

export type SubscriptionStatus = {
  status: string | null
  trialEndsAt: string | null
  daysRemaining: number | null
  isActive: boolean
  isTrial: boolean
  isTrialExpiring: boolean // ≤3 days left
  isExpired: boolean // trial ended, not active
  isGrandfathered: boolean
  subscriptionCurrentPeriodEnd: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

/**
 * Create a Stripe Customer for a newly signed-up chef.
 * Called non-blocking from signUpChef().
 */
export async function createStripeCustomer(
  chefId: string,
  email: string,
  businessName: string
): Promise<string> {
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    name: businessName,
    metadata: { chef_id: chefId },
  })

  const supabase = createServerClient({ admin: true })
  const { error } = await supabase
    .from('chefs')
    .update({ stripe_customer_id: customer.id } as any)
    .eq('id', chefId)

  if (error) {
    console.warn('[stripe] Failed to save stripe_customer_id (non-blocking)', { chefId })
  }

  return customer.id
}

/**
 * Start a 14-day trial for a newly signed-up chef.
 * Called non-blocking from signUpChef().
 */
export async function startTrial(chefId: string): Promise<void> {
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const supabase = createServerClient({ admin: true })
  const { error } = await supabase
    .from('chefs')
    .update({
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
    } as any)
    .eq('id', chefId)

  if (error) {
    console.warn('[stripe] Failed to start trial (non-blocking)', { chefId })
  }
}

/**
 * Fetch the current subscription status for a chef.
 * Pass chefId explicitly (preferred) or omit to use the current session.
 */
export async function getSubscriptionStatus(chefId: string): Promise<SubscriptionStatus> {
  const supabase = createServerClient({ admin: true })

  const { data: rawChef } = await supabase
    .from('chefs')
    .select(
      'subscription_status, trial_ends_at, subscription_current_period_end, stripe_customer_id, stripe_subscription_id'
    )
    .eq('id', chefId)
    .single()
  const chef = rawChef as any

  if (!chef) {
    return {
      status: 'grandfathered',
      trialEndsAt: null,
      daysRemaining: null,
      isActive: false,
      isTrial: false,
      isTrialExpiring: false,
      isExpired: false,
      isGrandfathered: true,
      subscriptionCurrentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    }
  }

  const now = new Date()
  const status = (chef.subscription_status as string) ?? 'grandfathered'
  const trialEndsAt = chef.trial_ends_at ? new Date(chef.trial_ends_at) : null
  const daysRemaining = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const isGrandfathered = status === 'grandfathered'
  const isActive = status === 'active'
  const isTrial = status === 'trialing' && daysRemaining !== null && daysRemaining > 0
  const isTrialExpiring = isTrial && daysRemaining !== null && daysRemaining <= 3
  const isExpired =
    (status === 'trialing' && daysRemaining !== null && daysRemaining <= 0) ||
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'past_due'

  return {
    status,
    trialEndsAt: chef.trial_ends_at,
    daysRemaining,
    isActive,
    isTrial,
    isTrialExpiring,
    isExpired,
    isGrandfathered,
    subscriptionCurrentPeriodEnd: chef.subscription_current_period_end,
    stripeCustomerId: chef.stripe_customer_id,
    stripeSubscriptionId: chef.stripe_subscription_id,
  }
}

// ─── Webhook Handlers (called from /api/webhooks/stripe) ─────────────────────

/**
 * Handle customer.subscription.created and customer.subscription.updated.
 * Updates subscription_status, stripe_subscription_id, and period end.
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const supabase = createServerClient({ admin: true })
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const sub = subscription as any
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('chefs')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_current_period_end: periodEnd,
    } as any)
    .eq('stripe_customer_id' as any, customerId)

  if (error) {
    console.error('[stripe] Failed to update subscription status from webhook', { customerId })
    throw error
  }
}

/**
 * Handle customer.subscription.deleted.
 * Marks the chef's subscription as canceled.
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const supabase = createServerClient({ admin: true })
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const { error } = await supabase
    .from('chefs')
    .update({
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_current_period_end: null,
    } as any)
    .eq('stripe_customer_id' as any, customerId)

  if (error) {
    console.error('[stripe] Failed to handle subscription deletion from webhook', { customerId })
    throw error
  }
}

// ─── Checkout & Portal (called from billing settings page) ───────────────────

/**
 * Create a Stripe Checkout session to upgrade the chef to a paid subscription.
 * Requires STRIPE_SUBSCRIPTION_PRICE_ID env var to be set.
 * Returns the Checkout session URL to redirect to.
 */
export async function createCheckoutSession(chefId: string): Promise<string> {
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID
  if (!priceId) throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID is not configured')

  const stripe = getStripe()
  const supabase = createServerClient({ admin: true })

  const { data: rawChef2 } = await supabase
    .from('chefs')
    .select('stripe_customer_id')
    .eq('id', chefId)
    .single()
  const chef2 = rawChef2 as any

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: chef2?.stripe_customer_id ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE_URL}/settings/billing?upgraded=1`,
    cancel_url: `${SITE_URL}/settings/billing`,
    metadata: { chef_id: chefId },
  })

  if (!session.url) throw new Error('Stripe returned no session URL')
  return session.url
}

/**
 * Create a Stripe Billing Portal session so an active subscriber can manage their plan.
 * Returns the portal session URL to redirect to.
 */
export async function createBillingPortalSession(chefId: string): Promise<string> {
  const stripe = getStripe()
  const supabase = createServerClient({ admin: true })

  const { data: rawChef3 } = await supabase
    .from('chefs')
    .select('stripe_customer_id')
    .eq('id', chefId)
    .single()
  const chef3 = rawChef3 as any

  if (!chef3?.stripe_customer_id) {
    throw new Error('No Stripe customer found for this chef')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: chef3.stripe_customer_id,
    return_url: `${SITE_URL}/settings/billing`,
  })

  return session.url
}
