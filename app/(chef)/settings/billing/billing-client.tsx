'use client'

// Billing page interactive UI — renders the subscription status card,
// plan features list, and CTA buttons (upgrade / manage subscription).

import { redirectToCheckout, redirectToBillingPortal } from './actions'
import type { SubscriptionStatus } from '@/lib/stripe/subscription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, AlertTriangle, CreditCard, Star, Sparkles } from 'lucide-react'

type Props = {
  status: SubscriptionStatus
  upgraded: boolean
}

const PLAN_FEATURES = [
  'Unlimited events & quotes',
  'Client portal with e-signature',
  'Full financial ledger & invoicing',
  'Recipe costing & grocery quotes',
  'AI copilot (local, private)',
  'Calendar sync & ICS invite links',
  'Staff briefings & temperature logs',
  'Partner showcase portal',
  'Goal tracking & revenue planning',
  'Priority support',
]

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  if (status.isGrandfathered) return <Badge variant="info">Founding Member</Badge>
  if (status.isActive) return <Badge variant="success">Active</Badge>
  if (status.isTrial && !status.isTrialExpiring) return <Badge variant="success">Trial</Badge>
  if (status.isTrialExpiring) return <Badge variant="warning">Trial Ending Soon</Badge>
  if (status.isExpired) return <Badge variant="error">Expired</Badge>
  return <Badge variant="default">{status.status ?? 'Unknown'}</Badge>
}

export function BillingClient({ status, upgraded }: Props) {
  return (
    <div className="space-y-6">
      {/* Post-upgrade success message */}
      {upgraded && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <Sparkles size={18} className="text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Welcome to ChefFlow Professional! Your subscription is now active.
          </p>
        </div>
      )}

      {/* Status Card */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">ChefFlow Professional</h2>
            <p className="mt-0.5 text-sm text-stone-500">$29 / month</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 border-t border-stone-100 pt-4 space-y-2">
          {status.isGrandfathered && (
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Star size={15} className="text-amber-500 shrink-0" />
              <span>
                You're on the founding member plan — full access, no subscription charge. Ever.
              </span>
            </div>
          )}

          {status.isTrial && status.daysRemaining !== null && (
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Clock size={15} className="text-amber-500 shrink-0" />
              <span>
                {status.daysRemaining} day{status.daysRemaining === 1 ? '' : 's'} remaining in your
                free trial. Subscribe to keep uninterrupted access.
              </span>
            </div>
          )}

          {status.isActive && status.subscriptionCurrentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <CheckCircle2 size={15} className="text-green-500 shrink-0" />
              <span>
                Next billing date:{' '}
                {new Date(status.subscriptionCurrentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {status.isExpired && (
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={15} className="shrink-0" />
              <span>Your trial has ended. Subscribe to continue using ChefFlow.</span>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="mt-5 flex flex-wrap gap-3">
          {!status.isActive && !status.isGrandfathered && (
            <form action={redirectToCheckout}>
              <Button type="submit" variant="primary">
                <CreditCard size={15} className="mr-2" />
                Upgrade to Professional — $29/mo
              </Button>
            </form>
          )}

          {status.isActive && status.stripeCustomerId && (
            <form action={redirectToBillingPortal}>
              <Button type="submit" variant="secondary">
                Manage Subscription
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Plan Features */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-stone-900">Everything in Professional</h2>
        <ul className="space-y-2.5">
          {PLAN_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-stone-700">
              <CheckCircle2 size={14} className="shrink-0 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Stripe Connect note */}
      <p className="text-xs text-stone-400 text-center">
        ChefFlow subscription is separate from your Stripe Payouts connection.{' '}
        <a href="/settings/stripe-connect" className="underline">
          Manage Stripe Payouts →
        </a>
      </p>
    </div>
  )
}
