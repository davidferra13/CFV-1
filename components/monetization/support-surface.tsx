'use client'

import { useMemo, useState } from 'react'
import type { SupportStatus } from '@/lib/monetization/status'
import {
  SUPPORT_COPY,
  formatSupportAmount,
  getSupportOffersByFrequency,
  type SupportFrequency,
  type SupportOffer,
} from '@/lib/monetization/offers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, CreditCard, Heart } from '@/components/ui/icons'

type SupportSurfaceProps = {
  status: SupportStatus
  thankYou: boolean
  pendingOfferId: string | null
  pendingPortal: boolean
  checkoutError: string | null
  portalError: string | null
  onCheckout: (offerId: string, customAmount: string) => void
  onManage: () => void
}

function formatMonthYear(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatFullDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusLine(status: SupportStatus): string {
  if (status.supportState === 'monthly_supporter') {
    const amount = status.monthlyAmountCents
      ? `${formatSupportAmount(status.monthlyAmountCents)} / month`
      : 'monthly'
    const since = formatMonthYear(status.supporterSince)
    return since
      ? `You're supporting ChefFlow at ${amount} since ${since}.`
      : `You're supporting ChefFlow ${amount}.`
  }

  if (status.supportState === 'one_time_supporter') {
    const amount = status.lastSupportAmountCents
      ? formatSupportAmount(status.lastSupportAmountCents)
      : 'a one-time contribution'
    const date = formatFullDate(status.lastSupportedAt)
    return date
      ? `You last supported ChefFlow with ${amount} on ${date}.`
      : `You supported ChefFlow with ${amount}.`
  }

  return "You're using ChefFlow for free."
}

function SupportOptionButton({
  offer,
  pendingOfferId,
  onCheckout,
}: {
  offer: SupportOffer
  pendingOfferId: string | null
  onCheckout: (offerId: string, customAmount: string) => void
}) {
  if (offer.amountCents == null) return null

  return (
    <Button
      type="button"
      variant={offer.isPreferred ? 'primary' : 'secondary'}
      className="w-full"
      loading={pendingOfferId === offer.id}
      onClick={() => onCheckout(offer.id, '')}
    >
      {offer.ctaLabel}
    </Button>
  )
}

export function SupportSurface({
  status,
  thankYou,
  pendingOfferId,
  pendingPortal,
  checkoutError,
  portalError,
  onCheckout,
  onManage,
}: SupportSurfaceProps) {
  const [frequency, setFrequency] = useState<SupportFrequency>('monthly')
  const [customAmount, setCustomAmount] = useState('')
  const offers = useMemo(() => getSupportOffersByFrequency(frequency), [frequency])
  const fixedOffers = offers.filter((offer) => offer.amountCents != null)
  const customOffer = offers.find((offer) => offer.amountCents == null)
  const showContributionOptions = status.supportState !== 'monthly_supporter'

  return (
    <div className="space-y-6">
      {thankYou && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                Thank you for supporting ChefFlow.
              </p>
              <p className="mt-1 text-sm text-emerald-300/80">
                Your contribution helps development continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {status.lookupFailed && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Support status could not be loaded.
              </p>
              <p className="mt-1 text-sm text-amber-300/80">
                The support options are still available. No account status has been guessed.
              </p>
            </div>
          </div>
        </div>
      )}

      {status.subscriptionStatus === 'past_due' && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200">
                Stripe could not process the latest monthly contribution.
              </p>
              <p className="mt-1 text-sm text-amber-300/80">
                You can update your card or end support from Stripe.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                loading={pendingPortal}
                onClick={onManage}
              >
                Manage support
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-stone-800 bg-stone-950/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-brand-300" />
              <h2 className="text-lg font-semibold text-stone-100">Support status</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">{getStatusLine(status)}</p>
            <p className="mt-2 text-xs text-stone-500">{SUPPORT_COPY.accessNote}</p>
          </div>
          {status.badgeLabel && <Badge variant="success">{status.badgeLabel}</Badge>}
        </div>

        {status.canManageRecurringSupport && (
          <div className="mt-4 border-t border-stone-800 pt-4">
            <Button type="button" variant="secondary" loading={pendingPortal} onClick={onManage}>
              Change or end support
            </Button>
            {portalError && <p className="mt-2 text-xs text-red-400">{portalError}</p>}
          </div>
        )}
      </section>

      {showContributionOptions && (
        <section className="rounded-lg border border-stone-800 bg-stone-950/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Contribute voluntarily</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
                {SUPPORT_COPY.story}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-stone-700 bg-stone-900 p-1">
              <button
                type="button"
                onClick={() => setFrequency('monthly')}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  frequency === 'monthly'
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setFrequency('one_time')}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  frequency === 'one_time'
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                One-time
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {fixedOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-lg border border-stone-800 bg-stone-900/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-stone-100">{offer.label}</p>
                  {offer.isPreferred && <Badge variant="info">Suggested</Badge>}
                </div>
                <p className="mt-2 min-h-[40px] text-sm leading-5 text-stone-400">
                  Helps cover hosting, reliability work, and continued product development.
                </p>
                <div className="mt-4">
                  <SupportOptionButton
                    offer={offer}
                    pendingOfferId={pendingOfferId}
                    onCheckout={onCheckout}
                  />
                </div>
              </div>
            ))}
          </div>

          {customOffer && (
            <div className="mt-4 rounded-lg border border-stone-800 bg-stone-900/70 p-4">
              <label htmlFor="support-custom-amount" className="text-sm font-medium text-stone-200">
                Custom amount
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="relative sm:max-w-[220px]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                    $
                  </span>
                  <input
                    id="support-custom-amount"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="h-11 w-full rounded-lg border border-stone-700 bg-stone-950 pl-7 pr-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    placeholder="18"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  loading={pendingOfferId === customOffer.id}
                  onClick={() => onCheckout(customOffer.id, customAmount)}
                >
                  {customOffer.ctaLabel}
                </Button>
              </div>
              <p className="mt-2 text-xs text-stone-500">Choose any amount from $1 to $500.</p>
            </div>
          )}

          {checkoutError && <p className="mt-3 text-sm text-red-400">{checkoutError}</p>}
        </section>
      )}

      <p className="text-center text-xs text-stone-500">
        ChefFlow support is separate from Stripe Payouts for client event money.
      </p>
    </div>
  )
}
