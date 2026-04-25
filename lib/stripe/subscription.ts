'use server'

// ChefFlow support billing.
// This handles voluntary contributions to ChefFlow itself. It is separate from
// Stripe Connect, which routes client money to chefs.

import { revalidateTag } from 'next/cache'
import type Stripe from 'stripe'
import { createServerClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { executeWithIdempotency } from '@/lib/mutations/idempotency'
import {
  SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS,
  SUPPORT_MAX_CUSTOM_AMOUNT_CENTS,
  SUPPORT_MIN_CUSTOM_AMOUNT_CENTS,
  formatSupportAmount,
  getSupportOffer,
  type SupportOfferId,
} from '@/lib/monetization/offers'
import { getSupportStatus } from '@/lib/monetization/status'
import { sendSupportEndedEmail, sendSupportStartedEmail } from '@/lib/monetization/email'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const SUPPORT_CHECKOUT_TYPE = 'chefflow_support'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(key, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

export type SubscriptionStatus = {
  status: string | null
  trialEndsAt: string | null
  daysRemaining: number | null
  isActive: boolean
  isTrial: boolean
  isTrialExpiring: boolean
  isExpired: boolean
  isGrandfathered: boolean
  subscriptionCurrentPeriodEnd: string | null
  hasStripeCustomer: boolean
  hasStripeSubscription: boolean
  supporterSince: string | null
  monthlyAmountCents: number | null
  lastSupportAmountCents: number | null
  lastSupportedAt: string | null
  canManageRecurringSupport: boolean
}

type SupportChefRow = {
  id: string
  email?: string | null
  business_name?: string | null
  display_name?: string | null
  subscription_status?: string | null
  subscription_current_period_end?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  supporter_since?: string | null
  monthly_support_amount_cents?: number | string | null
  last_support_amount_cents?: number | string | null
  last_supported_at?: string | null
}

type SupportChefLookup = {
  chef: SupportChefRow | null
  hasSupportColumns: boolean
}

function isMissingSupportColumnError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('supporter_since') ||
    message.includes('monthly_support_amount_cents') ||
    message.includes('last_support_amount_cents') ||
    message.includes('public_supporter_recognition_enabled')
  )
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isRecurringSupportStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

async function assertTenantAccess(chefId: string): Promise<void> {
  const sessionUser = await getCurrentUser()
  if (sessionUser && chefId !== sessionUser.tenantId && chefId !== sessionUser.entityId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
}

function getSupportAmountFromSubscription(subscription: Stripe.Subscription): number {
  const sub = subscription as any
  return (
    sub.items?.data?.[0]?.price?.unit_amount ??
    sub.plan?.amount ??
    SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS
  )
}

function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  const raw = (subscription as any).current_period_end
  return raw ? new Date(raw * 1000).toISOString() : null
}

function getPeriodStart(subscription: Stripe.Subscription): string {
  const raw = (subscription as any).current_period_start ?? (subscription as any).created
  return raw ? new Date(raw * 1000).toISOString() : new Date().toISOString()
}

function supportMetadata(chefId: string, offerId: string, amountCents: number, frequency: string) {
  return {
    type: SUPPORT_CHECKOUT_TYPE,
    chef_id: chefId,
    offer_id: offerId,
    amount_cents: String(amountCents),
    support_frequency: frequency,
  }
}

async function selectChefBy(
  column: 'id' | 'stripe_customer_id',
  value: string
): Promise<SupportChefLookup> {
  const db = createServerClient({ admin: true })
  const fullFields = [
    'id',
    'email',
    'business_name',
    'display_name',
    'subscription_status',
    'subscription_current_period_end',
    'stripe_customer_id',
    'stripe_subscription_id',
    'supporter_since',
    'monthly_support_amount_cents',
    'last_support_amount_cents',
    'last_supported_at',
  ].join(', ')

  let { data, error } = await db.from('chefs').select(fullFields).eq(column, value).maybeSingle()

  if (error && isMissingSupportColumnError(error)) {
    const legacyFields = [
      'id',
      'email',
      'business_name',
      'display_name',
      'subscription_status',
      'subscription_current_period_end',
      'stripe_customer_id',
      'stripe_subscription_id',
    ].join(', ')
    const legacy = await db.from('chefs').select(legacyFields).eq(column, value).maybeSingle()
    return {
      chef: (legacy.data as SupportChefRow | null) ?? null,
      hasSupportColumns: false,
    }
  }

  if (error) {
    throw error
  }

  return {
    chef: (data as SupportChefRow | null) ?? null,
    hasSupportColumns: true,
  }
}

async function updateChefSupportFields({
  chefId,
  legacyPatch,
  supportPatch,
  hasSupportColumns,
}: {
  chefId: string
  legacyPatch: Record<string, unknown>
  supportPatch: Record<string, unknown>
  hasSupportColumns: boolean
}): Promise<void> {
  const db = createServerClient({ admin: true })
  const patch = hasSupportColumns ? { ...legacyPatch, ...supportPatch } : legacyPatch
  const { error } = await db
    .from('chefs')
    .update(patch as any)
    .eq('id', chefId)

  if (error && hasSupportColumns && isMissingSupportColumnError(error)) {
    const retry = await db
      .from('chefs')
      .update(legacyPatch as any)
      .eq('id', chefId)
    if (retry.error) throw retry.error
    return
  }

  if (error) throw error
}

async function resolveOrCreateStripeCustomer(chefId: string): Promise<{
  customerId: string
  chef: SupportChefRow
  hasSupportColumns: boolean
}> {
  const lookup = await selectChefBy('id', chefId)
  const chef = lookup.chef
  if (!chef) throw new Error('Chef account not found')
  if (chef.stripe_customer_id) {
    return {
      customerId: chef.stripe_customer_id,
      chef,
      hasSupportColumns: lookup.hasSupportColumns,
    }
  }

  const customerId = await createStripeCustomer(
    chef.id,
    chef.email ?? '',
    chef.business_name ?? chef.display_name ?? 'ChefFlow chef'
  )

  return {
    customerId,
    chef: { ...chef, stripe_customer_id: customerId },
    hasSupportColumns: lookup.hasSupportColumns,
  }
}

async function revalidateChefLayout(chefId: string): Promise<void> {
  revalidateTag(`chef-layout-${chefId}`)
}

async function logSupportExpense(
  db: any,
  chefId: string,
  subscription: Stripe.Subscription,
  amountCents: number
): Promise<void> {
  try {
    if (amountCents <= 0) return

    const today = new Date().toISOString().slice(0, 10)
    const periodKey = `chefflow-support-${subscription.id}-${(subscription as any).current_period_start}`
    const { data: existingExpense } = await db
      .from('expenses')
      .select('id')
      .eq('tenant_id', chefId)
      .eq('description', periodKey)
      .maybeSingle()

    if (existingExpense) return

    await db.from('expenses').insert({
      tenant_id: chefId,
      expense_date: today,
      category: 'software',
      amount_cents: amountCents,
      description: periodKey,
      vendor: 'ChefFlow',
      payment_method: 'card',
      is_business: true,
      is_reimbursable: false,
      notes: 'Auto-logged from ChefFlow support contribution',
    })
  } catch (expenseErr) {
    console.error('[stripe] Support expense logging failed:', expenseErr)
  }
}

export async function createStripeCustomer(
  chefId: string,
  email: string,
  businessName: string
): Promise<string> {
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: email || undefined,
    name: businessName,
    metadata: { chef_id: chefId },
  })

  const db = createServerClient({ admin: true })
  const { error } = await db
    .from('chefs')
    .update({ stripe_customer_id: customer.id } as any)
    .eq('id', chefId)

  if (error) {
    console.warn('[stripe] Failed to save stripe_customer_id', { chefId })
  }

  return customer.id
}

export async function startTrial(chefId: string, _trialDays?: number): Promise<void> {
  await assertTenantAccess(chefId)
}

export async function getSubscriptionStatus(chefId: string): Promise<SubscriptionStatus> {
  const status = await getSupportStatus(chefId)
  const trialEndsAt = null
  const daysRemaining = null
  const isTrial = false

  return {
    status: status.subscriptionStatus,
    trialEndsAt,
    daysRemaining,
    isActive: status.supportState === 'monthly_supporter',
    isTrial,
    isTrialExpiring: false,
    isExpired:
      status.subscriptionStatus === 'canceled' ||
      status.subscriptionStatus === 'unpaid' ||
      status.subscriptionStatus === 'past_due',
    isGrandfathered: status.subscriptionStatus === 'grandfathered',
    subscriptionCurrentPeriodEnd: status.subscriptionCurrentPeriodEnd,
    hasStripeCustomer: !!status.stripeCustomerId,
    hasStripeSubscription: !!status.stripeSubscriptionId,
    supporterSince: status.supporterSince,
    monthlyAmountCents: status.monthlyAmountCents,
    lastSupportAmountCents: status.lastSupportAmountCents,
    lastSupportedAt: status.lastSupportedAt,
    canManageRecurringSupport: status.canManageRecurringSupport,
  }
}

export async function createSupportCheckoutSession({
  chefId,
  offerId,
  customAmountCents,
}: {
  chefId: string
  offerId: SupportOfferId
  customAmountCents?: number | null
}): Promise<string> {
  await assertTenantAccess(chefId)

  const offer = getSupportOffer(offerId)
  if (!offer) throw new Error('Support option unavailable')

  const amountCents = offer.amountCents ?? customAmountCents ?? null
  if (
    !amountCents ||
    amountCents < SUPPORT_MIN_CUSTOM_AMOUNT_CENTS ||
    amountCents > SUPPORT_MAX_CUSTOM_AMOUNT_CENTS
  ) {
    throw new Error('Enter a contribution between $1 and $500')
  }

  const stripe = getStripe()
  const { customerId } = await resolveOrCreateStripeCustomer(chefId)
  const frequency = offer.frequency === 'monthly' ? 'monthly' : 'one_time'
  const metadata = supportMetadata(chefId, offer.id, amountCents, frequency)
  const mode = offer.frequency === 'monthly' ? 'subscription' : 'payment'

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: customerId,
    client_reference_id: chefId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: 'ChefFlow support',
            description: `${formatSupportAmount(amountCents)} voluntary contribution`,
          },
          ...(offer.frequency === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
        },
        quantity: 1,
      },
    ],
    metadata,
    ...(offer.frequency === 'monthly'
      ? { subscription_data: { metadata } }
      : { payment_intent_data: { metadata } }),
    success_url: `${SITE_URL}/settings/billing?supported=1`,
    cancel_url: `${SITE_URL}/settings/billing`,
  } as any)

  if (!session.url) throw new Error('Stripe returned no session URL')
  return session.url
}

export async function createCheckoutSession(chefId: string): Promise<string> {
  return createSupportCheckoutSession({
    chefId,
    offerId: 'support_12_monthly',
    customAmountCents: SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS,
  })
}

export async function createBillingPortalSession(chefId: string): Promise<string> {
  await assertTenantAccess(chefId)
  const stripe = getStripe()
  const { customerId } = await resolveOrCreateStripeCustomer(chefId)

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${SITE_URL}/settings/billing`,
  })

  return session.url
}

export async function createSupportBillingPortalSession(chefId: string): Promise<string> {
  return createBillingPortalSession(chefId)
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getCustomerId(subscription.customer)
  const metadataChefId = subscription.metadata?.chef_id ?? null
  const byCustomer = customerId ? await selectChefBy('stripe_customer_id', customerId) : null
  const byMetadata =
    !byCustomer?.chef && metadataChefId ? await selectChefBy('id', metadataChefId) : null
  const lookup = byCustomer?.chef ? byCustomer : byMetadata
  const chef = lookup?.chef ?? null

  if (!chef) {
    throw new Error('Support subscription could not be matched to a chef')
  }

  const db = createServerClient({ admin: true })
  const amountCents = getSupportAmountFromSubscription(subscription)
  const periodEnd = getPeriodEnd(subscription)
  const periodStart = getPeriodStart(subscription)
  const recurringActive = isRecurringSupportStatus(subscription.status)
  const previousRecurring =
    !!chef.stripe_subscription_id && isRecurringSupportStatus(chef.subscription_status)
  const supporterSince = chef.supporter_since ?? periodStart

  await updateChefSupportFields({
    chefId: chef.id,
    hasSupportColumns: lookup?.hasSupportColumns ?? false,
    legacyPatch: {
      stripe_customer_id: customerId ?? chef.stripe_customer_id ?? null,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_current_period_end: periodEnd,
    },
    supportPatch: {
      supporter_since: recurringActive ? supporterSince : null,
      monthly_support_amount_cents: recurringActive ? amountCents : null,
      last_support_amount_cents: recurringActive
        ? amountCents
        : normalizeAmount(chef.last_support_amount_cents),
      last_supported_at: recurringActive ? periodStart : (chef.last_supported_at ?? null),
    },
  })

  await revalidateChefLayout(chef.id)

  if (recurringActive) {
    await logSupportExpense(db, chef.id, subscription, amountCents)
  }

  if (recurringActive && !previousRecurring) {
    try {
      await sendSupportStartedEmail(chef, amountCents, true)
    } catch (emailErr) {
      console.error('[stripe] Support thank-you email failed:', emailErr)
    }
  }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getCustomerId(subscription.customer)
  const metadataChefId = subscription.metadata?.chef_id ?? null
  const byCustomer = customerId ? await selectChefBy('stripe_customer_id', customerId) : null
  const byMetadata =
    !byCustomer?.chef && metadataChefId ? await selectChefBy('id', metadataChefId) : null
  const lookup = byCustomer?.chef ? byCustomer : byMetadata
  const chef = lookup?.chef ?? null

  if (!chef) {
    throw new Error('Canceled support could not be matched to a chef')
  }

  const periodEnd = getPeriodEnd(subscription)
  const previousRecurring =
    !!chef.stripe_subscription_id && isRecurringSupportStatus(chef.subscription_status)

  await updateChefSupportFields({
    chefId: chef.id,
    hasSupportColumns: lookup?.hasSupportColumns ?? false,
    legacyPatch: {
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_current_period_end: periodEnd,
    },
    supportPatch: {
      supporter_since: null,
      monthly_support_amount_cents: null,
    },
  })

  await revalidateChefLayout(chef.id)

  if (previousRecurring) {
    try {
      await sendSupportEndedEmail(chef)
    } catch (emailErr) {
      console.error('[stripe] Support ended email failed:', emailErr)
    }
  }
}

export async function handleSupportPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = getCustomerId(invoice.customer as any)
  if (!customerId) return

  const lookup = await selectChefBy('stripe_customer_id', customerId)
  const chef = lookup.chef
  if (!chef?.stripe_subscription_id) return

  await updateChefSupportFields({
    chefId: chef.id,
    hasSupportColumns: lookup.hasSupportColumns,
    legacyPatch: {
      subscription_status: 'past_due',
    },
    supportPatch: {},
  })

  await revalidateChefLayout(chef.id)
}

export async function handleSupportCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (session.metadata?.type !== SUPPORT_CHECKOUT_TYPE) return false

  const chefId = session.metadata.chef_id
  if (!chefId) throw new Error('Support checkout missing chef id')

  const lookup = await selectChefBy('id', chefId)
  const chef = lookup.chef
  if (!chef) throw new Error('Support checkout chef not found')

  const amountCents =
    Number(session.metadata.amount_cents ?? session.amount_total ?? 0) ||
    session.amount_total ||
    SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS
  const customerId = getCustomerId(session.customer as any)

  if (customerId && customerId !== chef.stripe_customer_id) {
    await updateChefSupportFields({
      chefId,
      hasSupportColumns: lookup.hasSupportColumns,
      legacyPatch: { stripe_customer_id: customerId },
      supportPatch: {},
    })
  }

  if (session.mode !== 'payment') return true

  const db = createServerClient({ admin: true })
  await executeWithIdempotency({
    db,
    tenantId: chefId,
    actorId: null,
    actionName: 'support_checkout_completed',
    idempotencyKey: session.id,
    execute: async () => {
      const supportedAt = session.created
        ? new Date(session.created * 1000).toISOString()
        : new Date().toISOString()

      await updateChefSupportFields({
        chefId,
        hasSupportColumns: lookup.hasSupportColumns,
        legacyPatch: {
          stripe_customer_id: customerId ?? chef.stripe_customer_id ?? null,
        },
        supportPatch: {
          last_support_amount_cents: amountCents,
          last_supported_at: supportedAt,
        },
      })

      try {
        await sendSupportStartedEmail(chef, amountCents, false)
      } catch (emailErr) {
        console.error('[stripe] One-time support email failed:', emailErr)
      }

      return { success: true, sessionId: session.id }
    },
  })

  await revalidateChefLayout(chefId)
  return true
}
