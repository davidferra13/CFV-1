'use client'

// Support page interactive UI - shows current supporter status,
// what ChefFlow includes for free, and voluntary contribution options.
// Replaces the old Pro tier comparison + hard upgrade paywall.

import { redirectToCheckout, redirectToBillingPortal } from './actions'
import type { SubscriptionStatus } from '@/lib/stripe/subscription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Heart, Star, Sparkles, AlertTriangle } from '@/components/ui/icons'

type Props = {
  status: SubscriptionStatus
  thankYou: boolean
}

const EVERYTHING_INCLUDED = [
  'Unlimited events, quotes, and clients',
  'Full event lifecycle (8-state FSM)',
  'Inquiry capture and unified inbox',
  'Professional proposals and contracts',
  'Payment collection (Stripe + offline)',
  'Immutable financial ledger',
  'Invoicing and expense tracking',
  'Recipes, menus, and food costing (unlimited)',
  'Day-of document suite (6 documents)',
  'Calendar (month, day, week, year views)',
  'Client portal and public booking page',
  'Chat and messaging',
  'AI assistant (Remy) for business operations',
  'Analytics, insights, and reporting',
  'Marketing and campaign tools',
  'Staff management and scheduling',
  'Commerce and POS capabilities',
  'Chef community and networking',
  'Professional development tools',
  'Business protection and certifications',
  'Integrations and automations',
]

function SupporterBadge({ status }: { status: SubscriptionStatus }) {
  if (status.isGrandfathered) return <Badge variant="info">Founding Member</Badge>
  if (status.isActive) return <Badge variant="success">Active Supporter</Badge>
  return null
}

export function SupportClient({ status, thankYou }: Props) {
  const isSupporter = status.isGrandfathered || status.isActive
  const isPaymentFailed = status.status === 'past_due' || status.status === 'unpaid'

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
                  : 'Contribution paused - payment could not be collected'}
              </p>
              <p className="mt-1 text-xs text-red-400">
                {status.status === 'past_due'
                  ? 'Your card was declined. Stripe will retry automatically. Update your payment method to resolve this now.'
                  : 'Stripe was unable to collect payment after multiple attempts. Update your payment method to resume your contribution.'}
              </p>
              <form action={redirectToBillingPortal} className="mt-3">
                <Button type="submit" variant="danger">
                  Update Payment Method
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Post-contribution thank you message */}
      {thankYou && (
        <div className="rounded-xl bg-green-950 border border-green-800 p-4 flex items-center gap-3">
          <Heart size={18} className="text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-300">
            Thank you for supporting ChefFlow! Your contribution keeps this platform free for every
            chef.
          </p>
        </div>
      )}

      {/* Supporter Status Card (only if already contributing) */}
      {isSupporter && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Your Support</h2>
              <p className="mt-0.5 text-sm text-stone-400">
                {status.isGrandfathered
                  ? 'Founding member. You believed in ChefFlow from the start.'
                  : 'Your monthly contribution keeps ChefFlow free for everyone.'}
              </p>
            </div>
            <SupporterBadge status={status} />
          </div>

          {status.isGrandfathered && (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <Star size={15} className="text-amber-500 shrink-0" />
                <span>Founding member. No contribution needed, ever.</span>
              </div>
            </div>
          )}

          {status.isActive && status.subscriptionCurrentPeriodEnd && (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                <span>
                  Next contribution date:{' '}
                  {new Date(status.subscriptionCurrentPeriodEnd).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="mt-3">
                <form action={redirectToBillingPortal}>
                  <Button type="submit" variant="secondary">
                    Manage Contribution
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* What's Included - Everything */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-semibold text-stone-100">
            Everything is included. For free.
          </h3>
        </div>
        <p className="text-sm text-stone-400 mb-4">
          No tiers, no limits, no locked features. Every chef gets the full platform.
        </p>
        <ul className="space-y-2 columns-1 sm:columns-2">
          {EVERYTHING_INCLUDED.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-stone-300 break-inside-avoid"
            >
              <CheckCircle2 size={14} className="shrink-0 text-green-500 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Voluntary Support CTA */}
      {!isSupporter && (
        <div className="rounded-xl border border-brand-800 bg-gradient-to-b from-brand-950/30 to-stone-900 p-6 text-center">
          <Heart size={28} className="mx-auto mb-3 text-brand-400" />
          <h3 className="text-lg font-semibold text-stone-100">Support the mission</h3>
          <p className="mt-2 text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
            ChefFlow is built for chefs, not investors. A voluntary monthly contribution helps cover
            server costs, development, and keeps the platform free for everyone. No pressure. No
            locked features. Just gratitude.
          </p>
          <form action={redirectToCheckout} className="mt-5">
            <Button type="submit" variant="primary">
              <Heart size={15} className="mr-2" />
              Become a Supporter
            </Button>
          </form>
          <p className="mt-3 text-xs text-stone-500">
            Cancel anytime. You keep every feature regardless.
          </p>
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
