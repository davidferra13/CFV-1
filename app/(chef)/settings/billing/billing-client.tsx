'use client'

// Billing page interactive UI.
// Shows tier comparison, handles upgrade CTA, and surfaces contextual
// feature detail when chef was redirected from a paid feature gate.

import { useState, useTransition } from 'react'
import { redirectToCheckout, redirectToBillingPortal } from './actions'
import type { SubscriptionStatus } from '@/lib/stripe/subscription'
import type { FeatureDefinition } from '@/lib/billing/feature-classification'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Heart, Star, AlertTriangle, Zap } from '@/components/ui/icons'

type Props = {
  status: SubscriptionStatus
  thankYou: boolean
  requestedFeature: FeatureDefinition | null
}

const FREE_HIGHLIGHTS = [
  'Unlimited events, quotes, and clients',
  'Recipes, menus, and manual food costing',
  'Inquiry intake and client directory',
  'Basic ingredient and price lookup',
  'Event lifecycle (full 8-state FSM)',
  'Invoicing and ledger',
  'Basic analytics and calendar',
  'Shareable menu links and public chef page',
  'Manual messaging with clients',
]

const PAID_HIGHLIGHTS = [
  'Live price sync and historical trends',
  'Real-time menu costing and margin targeting',
  'Workflow automation (event to doc in one click)',
  'Full client portal with booking and payment',
  'Automated follow-ups and client intelligence',
  'AI document parsing and business insights',
  'Staff management and payroll',
  'Inventory, purchasing, and vendor reconciliation',
  'Advanced analytics and custom reports',
  'Calendar sharing and ICS sync',
  'Commerce Engine (POS, order-ahead)',
  'SMS workflows and email campaigns',
  'Compliance logs for specialized events',
]

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  if (status.isGrandfathered) return <Badge variant="info">Founding Member</Badge>
  if (status.status === 'comped') return <Badge variant="success">Full Access</Badge>
  if (status.isActive) return <Badge variant="success">Active Plan</Badge>
  if (status.isTrial) return <Badge variant="warning">Trial</Badge>
  return <Badge variant="default">Free</Badge>
}

export function BillingClient({ status, thankYou, requestedFeature }: Props) {
  const isPaid = status.isGrandfathered || status.isActive
  const isPaymentFailed = status.status === 'past_due' || status.status === 'unpaid'
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [isPendingCheckout, startCheckout] = useTransition()
  const [isPendingPortal, startPortal] = useTransition()

  function handleCheckout() {
    setCheckoutError(null)
    startCheckout(async () => {
      const result = await redirectToCheckout()
      if (result?.error) setCheckoutError(result.error)
    })
  }

  function handlePortal() {
    setPortalError(null)
    startPortal(async () => {
      const result = await redirectToBillingPortal()
      if (result?.error) setPortalError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {/* Payment failure banner */}
      {isPaymentFailed && (
        <div className="rounded-xl bg-red-950 border border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-200">
                {status.status === 'past_due'
                  ? 'Payment failed - Stripe is retrying'
                  : 'Payment paused'}
              </p>
              <p className="mt-1 text-xs text-red-400">
                {status.status === 'past_due'
                  ? 'Your card was declined. Stripe will retry automatically. Update your payment method to resolve this now.'
                  : 'Stripe was unable to collect payment after multiple attempts. Update your payment method to resume.'}
              </p>
              <Button
                variant="danger"
                className="mt-3"
                onClick={handlePortal}
                loading={isPendingPortal}
              >
                Update Payment Method
              </Button>
              {portalError && <p className="mt-2 text-xs text-red-400">{portalError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Post-upgrade thank you */}
      {thankYou && (
        <div className="rounded-xl bg-green-950 border border-green-800 p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-300">
            You now have access to all paid features. Welcome to the full platform.
          </p>
        </div>
      )}

      {/* Contextual feature highlight - shown when redirected from a paid gate */}
      {requestedFeature && !isPaid && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-5">
          <div className="flex items-start gap-3">
            <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-200">{requestedFeature.label}</p>
              <p className="mt-0.5 text-sm text-amber-300/80">{requestedFeature.description}</p>
              {requestedFeature.upgrade_trigger && (
                <p className="mt-2 text-xs text-amber-400/70 italic">
                  {requestedFeature.upgrade_trigger.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active plan status card */}
      {isPaid && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Your Plan</h2>
              <p className="mt-0.5 text-sm text-stone-400">
                {status.isGrandfathered
                  ? 'Founding member. Full platform access, forever.'
                  : status.status === 'comped'
                    ? 'Full platform access. No payment required.'
                    : 'Full platform access. All paid features unlocked.'}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          {status.isGrandfathered && (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <Star size={15} className="text-amber-500 shrink-0" />
                <span>Founding member status. No payment required.</span>
              </div>
            </div>
          )}

          {status.isActive &&
            status.hasStripeSubscription &&
            status.subscriptionCurrentPeriodEnd && (
              <div className="mt-4 border-t border-stone-800 pt-4">
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                  <span>
                    Renews{' '}
                    {new Date(status.subscriptionCurrentPeriodEnd).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="mt-3">
                  <Button variant="secondary" onClick={handlePortal} loading={isPendingPortal}>
                    Manage Plan
                  </Button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Tier comparison */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Free tier */}
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <h3 className="text-sm font-semibold text-stone-300 mb-1">Free</h3>
          <p className="text-xs text-stone-500 mb-4">
            Complete platform for a solo chef working manually.
          </p>
          <ul className="space-y-2">
            {FREE_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-stone-400">
                <CheckCircle2 size={12} className="shrink-0 text-green-500 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Paid tier */}
        <div className="rounded-xl border border-brand-700/50 bg-gradient-to-b from-brand-950/20 to-stone-900 p-5">
          <h3 className="text-sm font-semibold text-stone-200 mb-1">Paid</h3>
          <p className="text-xs text-stone-400 mb-4">
            Automation, intelligence, and scale. Replaces manual labor.
          </p>
          <ul className="space-y-2">
            {PAID_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-stone-300">
                <Zap size={12} className="shrink-0 text-brand-400 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade CTA */}
      {!isPaid && (
        <div className="rounded-xl border border-brand-800 bg-gradient-to-b from-brand-950/30 to-stone-900 p-6 text-center">
          <h3 className="text-lg font-semibold text-stone-100">Unlock the full platform</h3>
          <p className="mt-2 text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
            One plan. All paid features. Cancel anytime. The free tier stays free regardless.
          </p>
          <Button
            variant="primary"
            className="mt-5"
            onClick={handleCheckout}
            loading={isPendingCheckout}
          >
            Upgrade Now
          </Button>
          {checkoutError && <p className="mt-2 text-xs text-red-400">{checkoutError}</p>}
          <p className="mt-3 text-xs text-stone-500">Cancel anytime.</p>
        </div>
      )}

      {/* Stripe Connect note */}
      <p className="text-xs text-stone-400 text-center">
        This is separate from your Stripe Payouts connection.{' '}
        <a href="/settings/stripe-connect" className="underline">
          Manage Stripe Payouts
        </a>
      </p>
    </div>
  )
}
