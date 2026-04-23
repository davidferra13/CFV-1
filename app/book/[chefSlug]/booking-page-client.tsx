'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
} from '@/components/ui/icons'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { BookingForm } from '@/components/booking/booking-form'
import { formatCurrency } from '@/lib/utils/currency'

export type BookingConfig = {
  bookingModel: 'inquiry_first' | 'instant_book'
  basePriceCents: number | null
  pricingType: 'flat_rate' | 'per_person'
  depositType: 'percent' | 'fixed'
  depositPercent: number | null
  depositFixedCents: number | null
}

export type BookingPageChefSummary = {
  name: string
  headline: string | null
  bioShort: string | null
  profileHref: string | null
  inquiryHref: string | null
}

type Props = {
  chefSlug: string
  bookingConfig: BookingConfig
  chef: BookingPageChefSummary
}

function formatSelectedDate(value: string | null) {
  if (!value) return 'Choose a date to continue'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStartingPriceLabel(config: BookingConfig) {
  if (!config.basePriceCents) return 'Custom pricing shared after review'
  if (config.pricingType === 'per_person') {
    return `From ${formatCurrency(config.basePriceCents)} per guest`
  }
  return `From ${formatCurrency(config.basePriceCents)} per event`
}

function getDepositLabel(config: BookingConfig) {
  if (config.bookingModel !== 'instant_book') {
    return 'No payment is collected on this form'
  }

  if (config.depositType === 'fixed' && (config.depositFixedCents ?? 0) > 0) {
    return `${formatCurrency(config.depositFixedCents ?? 0)} deposit due at checkout`
  }

  const percent = config.depositPercent ?? 30
  return `${percent}% deposit due at checkout`
}

function getSteps(config: BookingConfig, hasDate: boolean) {
  if (config.bookingModel === 'instant_book') {
    return [
      {
        title: hasDate ? 'Date selected' : 'Pick an available date',
        detail: 'Use the live calendar to select a date the chef has opened for booking.',
      },
      {
        title: 'Share the event details',
        detail: 'Guest count, timing, dietary needs, and service style shape the booking.',
      },
      {
        title: 'Pay the published deposit',
        detail:
          'Checkout is hosted securely by Stripe and reserves the date inside the current booking flow.',
      },
    ]
  }

  return [
    {
      title: hasDate ? 'Date selected' : 'Pick your ideal date',
      detail: 'Choose the date that best fits the dinner or service you want to plan.',
    },
    {
      title: 'Submit the request',
      detail: 'Share the event scope once so the chef can evaluate fit without back-and-forth.',
    },
    {
      title: 'Chef follows up with the next step',
      detail: 'You will receive a confirmation, questions, or a refined quote after review.',
    },
  ]
}

function StepPill({ step, active }: { step: string; active: boolean }) {
  return (
    <div
      className={[
        'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]',
        active
          ? 'border-brand-500/60 bg-brand-500/15 text-brand-200'
          : 'border-stone-700 bg-stone-900 text-stone-500',
      ].join(' ')}
    >
      {step}
    </div>
  )
}

export function BookingPageClient({ chefSlug, bookingConfig, chef }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const isInstantBook = bookingConfig.bookingModel === 'instant_book'
  const steps = getSteps(bookingConfig, Boolean(selectedDate))

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-stone-700 bg-stone-900/90 p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap gap-2">
            <StepPill step="1. Choose date" active={!selectedDate} />
            <StepPill step="2. Share details" active={Boolean(selectedDate)} />
            <StepPill
              step={isInstantBook ? '3. Secure booking' : '3. Submit request'}
              active={Boolean(selectedDate)}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Direct booking
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100 sm:text-3xl">
                Start with the date. Everything else should feel obvious.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-400 sm:text-base">
                The calendar shows the dates {chef.name} has opened for new events. Once you pick
                one, the form will unlock with the exact information needed to move forward cleanly.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 px-4 py-3 text-sm text-stone-300">
              <p className="font-semibold text-stone-100">{formatSelectedDate(selectedDate)}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                {selectedDate ? 'Ready for details' : 'Waiting on date selection'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <BookingCalendar
              chefSlug={chefSlug}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
        </section>

        {selectedDate ? (
          <section className="rounded-[28px] border border-stone-700 bg-stone-900/90 p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Event details
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                  Tell {chef.name} what this service needs.
                </h2>
              </div>
              <div className="rounded-full border border-brand-600/30 bg-brand-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
                {isInstantBook ? 'Secure checkout after submit' : 'Request review after submit'}
              </div>
            </div>

            <div className="mt-5">
              <BookingForm
                chefSlug={chefSlug}
                selectedDate={selectedDate}
                onBack={() => setSelectedDate(null)}
                bookingConfig={bookingConfig}
              />
            </div>
          </section>
        ) : (
          <Alert variant="info" title="Choose a date first">
            The inquiry form stays collapsed until a date is selected. That removes unnecessary
            typing for people who are still deciding whether timing works.
          </Alert>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8">
        <div className="rounded-[28px] border border-stone-700 bg-stone-900/90 p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Booking terms
          </p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-brand-300" />
                <p className="text-sm font-semibold text-stone-100">
                  {isInstantBook ? 'Instant booking path' : 'Inquiry-first path'}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                {isInstantBook
                  ? 'This page supports published pricing and checkout for the deposit step.'
                  : 'This page captures the request cleanly before the chef confirms fit, pricing, or follow-up questions.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-brand-300" />
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Pricing
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-stone-100">
                  {getStartingPriceLabel(bookingConfig)}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
                <div className="flex items-center gap-3">
                  {isInstantBook ? (
                    <CreditCard className="h-4 w-4 text-brand-300" />
                  ) : (
                    <FileText className="h-4 w-4 text-brand-300" />
                  )}
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Payment step
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-stone-100">
                  {getDepositLabel(bookingConfig)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-700 bg-stone-900/90 p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            What happens next
          </p>
          <div className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-950">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-100">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-400">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-700 bg-stone-900/90 p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-stone-100">Keep the scope clean</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Use this path when your date is clear and you want the fastest route to a decision.
                For broader ideas, custom scope, or questions first, use the general inquiry path.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {chef.inquiryHref ? (
              <Button
                href={chef.inquiryHref}
                variant="secondary"
                className="w-full justify-between"
              >
                Need a custom inquiry instead?
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
            {chef.profileHref ? (
              <Link
                href={chef.profileHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-stone-300 transition-colors hover:text-stone-100"
              >
                <Calendar className="h-4 w-4" />
                Review chef profile
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-[28px] border border-emerald-900/60 bg-emerald-950/20 p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-stone-100">Built to reduce back-and-forth</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                The form is structured so the chef can move directly into confirmation, pricing, or
                checkout without re-collecting the basics.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
