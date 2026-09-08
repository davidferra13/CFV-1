'use server'

import { randomUUID } from 'node:crypto'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  executeExactApprovedAction,
  loadExactApprovalAction,
  requestExactActionApproval,
  type ExactApprovalRequest,
} from '@/lib/security/exact-action-approval'
import type { ExactAction } from '@/lib/security/exact-action-approval-core'
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
  connected: boolean
  pending: boolean
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

type ChefConnectState = {
  stripe_account_id: string | null
  email: string | null
  business_name: string | null
  stripe_onboarding_complete?: boolean | null
}

async function readChefConnectState(db: any, entityId: string): Promise<ChefConnectState> {
  const { data, error } = await db
    .from('chefs')
    .select('stripe_account_id, email, business_name, stripe_onboarding_complete')
    .eq('id', entityId)
    .single()
  if (error || !data) throw new Error('Stripe Connect chef state not found')
  return data as ChefConnectState
}

function buildConnectAction(input: {
  actionId: string
  tenantId: string
  actorId: string
  fromOnboarding: boolean
  chef: ChefConnectState
}): ExactAction {
  const origin = input.fromOnboarding ? 'onboarding' : 'settings'
  return {
    actionId: input.actionId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    toolName: 'stripe.connect.account_and_link',
    category: 'identity',
    operation: input.chef.stripe_account_id
      ? 'create_connect_onboarding_link'
      : 'create_connect_account_and_onboarding_link',
    environment: 'external',
    target: {
      provider: 'stripe',
      accountId: input.chef.stripe_account_id ?? 'new_account',
      chefId: input.tenantId,
    },
    payload: {
      createAccount: !input.chef.stripe_account_id,
      email: input.chef.email,
      businessName: input.chef.business_name,
      returnUrl: `${SITE_URL}/api/stripe/connect/callback?from=${origin}`,
      refreshUrl: `${SITE_URL}/api/stripe/connect/callback?from=${origin}&refresh=true`,
      accountType: 'express',
    },
    contextVersion: [
      input.chef.stripe_account_id ?? 'none',
      input.chef.email ?? 'none',
      input.chef.business_name ?? 'none',
      input.fromOnboarding,
    ].join(':'),
  }
}

export async function getConnectAccountStatus(): Promise<ConnectAccountStatus> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chef = await readChefConnectState(db, user.entityId)

  if (!chef.stripe_account_id) {
    return {
      connected: false,
      pending: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
    }
  }

  return {
    connected: chef.stripe_onboarding_complete === true,
    pending: !chef.stripe_onboarding_complete,
    accountId: chef.stripe_account_id,
    chargesEnabled: chef.stripe_onboarding_complete === true,
    payoutsEnabled: chef.stripe_onboarding_complete === true,
  }
}

export async function prepareConnectAccountLinkApproval(
  fromOnboarding = false
): Promise<ExactApprovalRequest> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chef = await readChefConnectState(db, user.entityId)
  return requestExactActionApproval(
    buildConnectAction({
      actionId: randomUUID(),
      tenantId: user.tenantId!,
      actorId: user.id,
      fromOnboarding,
      chef,
    })
  )
}

export async function createConnectAccountLink(
  fromOnboarding: boolean,
  approvalId: string
): Promise<{ url: string }> {
  if (!approvalId) throw new Error('exact_approval_required')
  const user = await requireChef()
  const db: any = createServerClient()
  const [{ action: approvedAction }, chef] = await Promise.all([
    loadExactApprovalAction(approvalId),
    readChefConnectState(db, user.entityId),
  ])
  const action = buildConnectAction({
    actionId: approvedAction.actionId,
    tenantId: user.tenantId!,
    actorId: user.id,
    fromOnboarding,
    chef,
  })
  const stripe = getStripe()
  const execution = await executeExactApprovedAction({
    approvalId,
    action,
    invoke: async () => {
      let accountId = chef.stripe_account_id ?? ''
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: chef.email || undefined,
          business_profile: { name: chef.business_name || undefined },
          metadata: { chef_id: user.entityId, platform: 'chefflow' },
        } as Stripe.AccountCreateParams)
        accountId = account.id
        const { error } = await db
          .from('chefs')
          .update({ stripe_account_id: accountId })
          .eq('id', user.entityId)
        if (error) throw new Error('Created Stripe account but failed to persist its ID')
      }

      const origin = fromOnboarding ? 'onboarding' : 'settings'
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${SITE_URL}/api/stripe/connect/callback?from=${origin}&refresh=true`,
        return_url: `${SITE_URL}/api/stripe/connect/callback?from=${origin}`,
        type: 'account_onboarding',
      })
      return { accountId, accountLink }
    },
    verify: async ({ accountId, accountLink }) => {
      const verifiedAccount = await stripe.accounts.retrieve(accountId)
      return {
        verified: verifiedAccount.id === accountId && Boolean(accountLink.url),
        receiptId: `${accountId}:${accountLink.expires_at}`,
        providerState: 'onboarding_link_created',
      }
    },
  })
  return { url: execution.result.accountLink.url }
}

export async function refreshConnectAccountStatus(): Promise<ConnectAccountStatus> {
  const user = await requireChef()
  const db: any = createServerClient()
  const stripe = getStripe()
  const chef = await readChefConnectState(db, user.entityId)

  if (!chef.stripe_account_id) {
    return {
      connected: false,
      pending: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
    }
  }

  const account = await stripe.accounts.retrieve(chef.stripe_account_id)
  const fullyOnboarded = account.charges_enabled === true && account.payouts_enabled === true
  await db
    .from('chefs')
    .update({ stripe_onboarding_complete: fullyOnboarded })
    .eq('id', user.entityId)

  revalidatePath('/settings/stripe-connect')
  revalidatePath('/onboarding')

  return {
    connected: account.charges_enabled === true,
    pending: !fullyOnboarded,
    accountId: chef.stripe_account_id,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
  }
}

export async function updateConnectStatusFromWebhook(
  stripeAccountId: string,
  chargesEnabled: boolean,
  payoutsEnabled?: boolean
): Promise<void> {
  const db = createServerClient({ admin: true })
  const fullyOnboarded = chargesEnabled && (payoutsEnabled ?? chargesEnabled)
  const { error } = await db
    .from('chefs')
    .update({ stripe_onboarding_complete: fullyOnboarded })
    .eq('stripe_account_id', stripeAccountId)
  if (error) console.error('[updateConnectStatusFromWebhook]', error)
}
