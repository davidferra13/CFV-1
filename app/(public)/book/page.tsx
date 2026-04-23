import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { SectionViewTracker } from '@/components/analytics/section-view-tracker'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { BookDinnerForm } from './_components/book-dinner-form'
import { IntakeLaneExpectations } from '@/components/public/intake-lane-expectations'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import {
  mergePublicOpenBookingPrefill,
  readPublicOpenBookingPrefillFromSearchParams,
  readPublicSeasonalMarketPulseContext,
} from '@/lib/public/public-seasonal-market-pulse'
import { PUBLIC_INTAKE_LANE_KEYS } from '@/lib/public/intake-lane-config'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_DIRECTORY_HELPER } from '@/lib/public/public-surface-config'
import { PUBLIC_MARKET_SCOPE, buildMarketingMetadata } from '@/lib/site/public-site'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Book a Private Chef',
  description:
    'Tell us about your event and ChefFlow will share your request with matched private chefs in your area. Matched chefs reach out directly. Free to submit, no obligation.',
  path: '/book',
  imagePath: '/social/chefflow-booking.png',
  imageAlt: 'ChefFlow booking flow preview',
  twitterCard: 'summary_large_image',
})

type BookPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const resolvedSearchParams = await searchParams
  const urlPrefill = readPublicOpenBookingPrefillFromSearchParams(resolvedSearchParams)
  const seasonalContext = readPublicSeasonalMarketPulseContext(resolvedSearchParams)
  const initialPrefill = mergePublicOpenBookingPrefill(seasonalContext?.prefill, urlPrefill)
  const analyticsScope = seasonalContext?.scope.label ?? PUBLIC_MARKET_SCOPE
  const seasonalAnalytics = seasonalContext
    ? {
        season: seasonalContext.season,
        source_mode: seasonalContext.sourceMode,
        market_scope: seasonalContext.scope.label,
        market_scope_mode: seasonalContext.scope.mode,
        lead_ingredients: seasonalContext.peakNow.join(' | '),
        fallback_reason:
          seasonalContext.intent.provenance.fallbackReason === 'none'
            ? null
            : seasonalContext.intent.provenance.fallbackReason,
        market_freshness_status: seasonalContext.intent.provenance.marketStatus,
      }
    : undefined

  return (
    <div className="min-h-screen">
      <PublicPageView
        pageName="open_booking"
        properties={{
          section: 'public_growth',
          entry_context: seasonalContext?.entryContext ?? 'direct',
          ...(seasonalAnalytics ?? { market_scope: analyticsScope }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-600/8 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-16 pb-8 text-center sm:px-6 md:pt-24 lg:px-8">
          <h1 className="text-3xl font-display tracking-tight text-white md:text-4xl lg:text-5xl">
            Book a private chef
          </h1>
          <p className="mt-4 text-base text-stone-300 md:text-lg leading-relaxed max-w-xl mx-auto">
            Tell us about your event. ChefFlow shares your request only with matched chefs in your
            area, and matched chefs reach out to you directly. Free to submit, no obligation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionViewTracker
          moduleName="booking_expectations"
          pageName="open_booking"
          properties={seasonalAnalytics}
        />
        <IntakeLaneExpectations lane={PUBLIC_INTAKE_LANE_KEYS.open_booking} />

        <div className="mt-6 flex flex-col gap-3 rounded-[1.75rem] border border-stone-700 bg-stone-900/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-stone-500">
            Need more context before you send the lead? Review how ChefFlow handles trust and
            support.
          </p>
          <TrackedLink
            href="/trust"
            analyticsName="booking_trust_link"
            analyticsProps={{ section: 'booking_expectations' }}
            className="inline-flex items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            Review trust center
          </TrackedLink>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-2xl px-4 pb-20 sm:px-6 lg:px-8">
        <BookDinnerForm
          initialPrefill={initialPrefill}
          seasonalContext={seasonalContext}
          analyticsEntryContext={seasonalContext?.entryContext ?? null}
        />
        <p className="mt-8 text-center text-sm text-stone-500">
          {PUBLIC_DIRECTORY_HELPER}{' '}
          <Link
            href="/nearby"
            className="font-medium text-brand-400 transition-colors hover:text-brand-300"
          >
            Browse the food directory
          </Link>
        </p>
        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.open_booking}
          theme="dark"
        />
      </section>

      {/* Trust footer */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-400">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Free to submit
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              No obligation
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Chefs contact you directly
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Zero commission
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
