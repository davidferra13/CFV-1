'use client'

// Billing page interactive UI - renders the subscription status card,
// Free vs Pro comparison, and CTA buttons (upgrade / manage subscription).

import { redirectToCheckout, redirectToBillingPortal } from './actions'
import type { SubscriptionStatus } from '@/lib/stripe/subscription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PRO_FEATURES } from '@/lib/billing/pro-features'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Star,
  Sparkles,
  X,
} from '@/components/ui/icons'

type Props = {
  status: SubscriptionStatus
  upgraded: boolean
}

const FREE_FEATURES = [
  'Unlimited events & quotes',
  'Full event lifecycle (8-state FSM)',
  'Client directory with preferences',
  'Inquiry capture & unified inbox',
  'Professional proposals',
  'Payment collection (Stripe + offline)',
  'Immutable financial ledger',
  'Invoicing & expense tracking',
  'Recipes & menus (unlimited)',
  'Day-of document suite (6 documents)',
  'Calendar (month, day, week views)',
  'Client portal & public booking page',
  'Chat & messaging',
]

// Group Pro features by category for display
const PRO_CATEGORIES = [
  { label: 'AI Assistant (Remy)', features: PRO_FEATURES.filter((f) => f.category === 'ai') },
  {
    label: 'Analytics & Insights',
    features: PRO_FEATURES.filter((f) => f.category === 'analytics'),
  },
  { label: 'Advanced Finance', features: PRO_FEATURES.filter((f) => f.category === 'finance') },
  { label: 'Marketing & Social', features: PRO_FEATURES.filter((f) => f.category === 'marketing') },
  { label: 'Client Intelligence', features: PRO_FEATURES.filter((f) => f.category === 'clients') },
  { label: 'Loyalty Program', features: PRO_FEATURES.filter((f) => f.category === 'loyalty') },
  { label: 'Staff Management', features: PRO_FEATURES.filter((f) => f.category === 'staff') },
  {
    label: 'Operations & Inventory',
    features: PRO_FEATURES.filter((f) => f.category === 'operations'),
  },
  {
    label: 'Business Protection',
    features: PRO_FEATURES.filter((f) => f.category === 'protection'),
  },
  { label: 'Community', features: PRO_FEATURES.filter((f) => f.category === 'community') },
  {
    label: 'Professional Development',
    features: PRO_FEATURES.filter((f) => f.category === 'professional'),
  },
  { label: 'Integrations', features: PRO_FEATURES.filter((f) => f.category === 'integrations') },
  { label: 'Advanced Calendar', features: PRO_FEATURES.filter((f) => f.category === 'calendar') },
].filter((c) => c.features.length > 0)

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  if (status.isGrandfathered) return <Badge variant="info">Founding Member</Badge>
  if (status.isActive) return <Badge variant="success">Active</Badge>
  if (status.isTrial && !status.isTrialExpiring) return <Badge variant="success">Trial</Badge>
  if (status.isTrialExpiring) return <Badge variant="warning">Trial Ending Soon</Badge>
  if (status.isExpired) return <Badge variant="error">Expired</Badge>
  return <Badge variant="default">{status.status ?? 'Unknown'}</Badge>
}

export function BillingClient({ status, upgraded }: Props) {
  const isPro = status.isGrandfathered || status.isActive || (status.isTrial && !status.isExpired)

  return (
    <div className="space-y-6">
      {/* Post-upgrade success message */}
      {upgraded && (
        <div className="rounded-xl bg-green-950 border border-green-200 p-4 flex items-center gap-3">
          <Sparkles size={18} className="text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Welcome to ChefFlow Pro! Your subscription is now active.
          </p>
        </div>
      )}

      {/* Status Card */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">
              {isPro ? 'ChefFlow Pro' : 'ChefFlow Free'}
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">
              {status.isGrandfathered
                ? 'Founding member - free forever'
                : isPro
                  ? 'Full access to all features'
                  : 'Core features included'}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 border-t border-stone-800 pt-4 space-y-2">
          {status.isGrandfathered && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Star size={15} className="text-amber-500 shrink-0" />
              <span>
                You're on the founding member plan - full Pro access, no subscription charge. Ever.
              </span>
            </div>
          )}

          {status.isTrial && status.daysRemaining !== null && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Clock size={15} className="text-amber-500 shrink-0" />
              <span>
                {status.daysRemaining} day{status.daysRemaining === 1 ? '' : 's'} remaining in your
                free trial. Subscribe to keep Pro access.
              </span>
            </div>
          )}

          {status.isActive && status.subscriptionCurrentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
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
              <span>Your trial has ended. Upgrade to Pro to unlock all features.</span>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="mt-5 flex flex-wrap gap-3">
          {!status.isActive && !status.isGrandfathered && (
            <form action={redirectToCheckout}>
              <Button type="submit" variant="primary">
                <CreditCard size={15} className="mr-2" />
                Upgrade to Pro
              </Button>
            </form>
          )}

          {status.isActive && status.hasStripeCustomer && (
            <form action={redirectToBillingPortal}>
              <Button type="submit" variant="secondary">
                Manage Subscription
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Free vs Pro Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Free Tier */}
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-stone-100">Free</h3>
            <span className="text-xs text-stone-400 font-medium">Forever</span>
          </div>
          <ul className="space-y-2">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-stone-300">
                <CheckCircle2 size={14} className="shrink-0 text-green-500 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Tier */}
        <div className="rounded-xl border-2 border-brand-600 bg-gradient-to-b from-brand-50/50 to-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-stone-100">Pro</h3>
            <Sparkles size={14} className="text-brand-500" />
          </div>
          <p className="text-xs text-stone-500 mb-3">Everything in Free, plus:</p>
          <div className="space-y-3">
            {PRO_CATEGORIES.map((category) => (
              <div key={category.label}>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  {category.label}
                </p>
                <ul className="space-y-1">
                  {category.features.map((feature) => (
                    <li
                      key={feature.slug}
                      className="flex items-start gap-2.5 text-sm text-stone-300"
                    >
                      <Sparkles size={12} className="shrink-0 text-brand-500 mt-0.5" />
                      {feature.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {!isPro && (
            <form action={redirectToCheckout} className="mt-5">
              <Button type="submit" variant="primary" className="w-full">
                <Sparkles size={15} className="mr-2" />
                Upgrade to Pro
              </Button>
            </form>
          )}
        </div>
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
