import { cache } from 'react'
import { createServerClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/get-user'

export type SupportState = 'none' | 'monthly_supporter' | 'one_time_supporter'

export type SupportStatus = {
  accessModel: 'universal'
  supportState: SupportState
  isSupporting: boolean
  supporterSince: string | null
  monthlyAmountCents: number | null
  lastSupportAmountCents: number | null
  lastSupportedAt: string | null
  subscriptionStatus: string | null
  subscriptionCurrentPeriodEnd: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  canManageRecurringSupport: boolean
  publicRecognitionEnabled: boolean
  badgeLabel: string | null
  lookupFailed: boolean
}

const emptySupportStatus: SupportStatus = {
  accessModel: 'universal',
  supportState: 'none',
  isSupporting: false,
  supporterSince: null,
  monthlyAmountCents: null,
  lastSupportAmountCents: null,
  lastSupportedAt: null,
  subscriptionStatus: null,
  subscriptionCurrentPeriodEnd: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  canManageRecurringSupport: false,
  publicRecognitionEnabled: false,
  badgeLabel: null,
  lookupFailed: false,
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

function isRecurringSupportStatus(status: string | null): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

async function assertTenantAccess(chefId: string): Promise<void> {
  const sessionUser = await getCurrentUser()
  if (sessionUser && chefId !== sessionUser.tenantId && chefId !== sessionUser.entityId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
}

export const getSupportStatus = cache(async (chefId: string): Promise<SupportStatus> => {
  await assertTenantAccess(chefId)

  const db = createServerClient({ admin: true })
  const fullSelect = [
    'subscription_status',
    'subscription_current_period_end',
    'stripe_customer_id',
    'stripe_subscription_id',
    'supporter_since',
    'monthly_support_amount_cents',
    'last_support_amount_cents',
    'last_supported_at',
    'public_supporter_recognition_enabled',
  ].join(', ')

  let { data, error } = await db.from('chefs').select(fullSelect).eq('id', chefId).single()
  let hasSupportColumns = true

  if (error && isMissingSupportColumnError(error)) {
    hasSupportColumns = false
    const fallback = await db
      .from('chefs')
      .select(
        'subscription_status, subscription_current_period_end, stripe_customer_id, stripe_subscription_id'
      )
      .eq('id', chefId)
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error || !data) {
    return {
      ...emptySupportStatus,
      lookupFailed: true,
    }
  }

  const chef = data as any
  const subscriptionStatus = (chef.subscription_status as string | null) ?? null
  const stripeSubscriptionId = (chef.stripe_subscription_id as string | null) ?? null
  const monthlyAmountCents = hasSupportColumns
    ? normalizeAmount(chef.monthly_support_amount_cents)
    : null
  const lastSupportAmountCents = hasSupportColumns
    ? normalizeAmount(chef.last_support_amount_cents)
    : null
  const supporterSince = hasSupportColumns
    ? ((chef.supporter_since as string | null) ?? null)
    : null
  const lastSupportedAt = hasSupportColumns
    ? ((chef.last_supported_at as string | null) ?? null)
    : null
  const hasRecurringSupport =
    !!stripeSubscriptionId &&
    isRecurringSupportStatus(subscriptionStatus) &&
    (monthlyAmountCents == null || monthlyAmountCents > 0)
  const hasOneTimeSupport = !hasRecurringSupport && !!lastSupportedAt && !!lastSupportAmountCents

  return {
    accessModel: 'universal',
    supportState: hasRecurringSupport
      ? 'monthly_supporter'
      : hasOneTimeSupport
        ? 'one_time_supporter'
        : 'none',
    isSupporting: hasRecurringSupport || hasOneTimeSupport,
    supporterSince,
    monthlyAmountCents,
    lastSupportAmountCents,
    lastSupportedAt,
    subscriptionStatus,
    subscriptionCurrentPeriodEnd:
      (chef.subscription_current_period_end as string | null | undefined) ?? null,
    stripeCustomerId: (chef.stripe_customer_id as string | null | undefined) ?? null,
    stripeSubscriptionId,
    canManageRecurringSupport: hasRecurringSupport && !!chef.stripe_customer_id,
    publicRecognitionEnabled: hasSupportColumns
      ? Boolean(chef.public_supporter_recognition_enabled)
      : false,
    badgeLabel: hasRecurringSupport ? 'Supporter' : null,
    lookupFailed: false,
  }
})
