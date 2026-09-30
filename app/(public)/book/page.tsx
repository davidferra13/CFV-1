import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { SectionViewTracker } from '@/components/analytics/section-view-tracker'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { BookDinnerForm } from './_components/book-dinner-form'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import {
  mergePublicOpenBookingPrefill,
  readPublicOpenBookingPrefillFromSearchParams,
  readPublicSeasonalMarketPulseContext,
} from '@/lib/public/public-seasonal-market-pulse'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_MARKET_SCOPE, buildMarketingMetadata, absoluteUrl } from '@/lib/site/public-site'
import { BreadcrumbJsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Start Your Private Chef Request | ChefFlow',
  description:
    'Tell ChefFlow about your date, location, guest count, preferences, and dietary needs. Get matched with private chefs and compare the right fit for your event.',
  path: '/book',
  imagePath: '/social/cheflow-booking.png',
  imageAlt: 'ChefFlow private chef request flow',
  twitterCard: 'summary_large_image',
})

type BookPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

const steps = [
  {
    step: '01',
    title: 'Share the details',
    body: 'Date, location, guest count, service style, dietary needs, and what would make the meal feel right.',
  },
  {
    step: '02',
    title: 'Hear from matched chefs',
    body: 'Review the chef, proposed menu, pricing, availability, and questions in the context of your event.',
  },
  {
    step: '03',
    title: 'Choose your chef',
    body: 'Refine the menu and details, then confirm when you are comfortable with the fit.',
  },
] as const

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
    <div className="min-h-screen bg-[#120b08] text-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Start a chef request', url: absoluteUrl('/book') },
        ]}
      />
      <PublicPageView
        pageName="open_booking"
        properties={{
          section: 'public_growth',
          entry_context: seasonalContext?.entryContext ?? 'direct',
          ...(seasonalAnalytics ?? { market_scope: analyticsScope }),
        }}
      />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.16),transparent_42%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-7 pt-14 text-center sm:px-6 md:pt-20 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
            start your private chef request
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Tell us about the meal you want.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
            Give ChefFlow the event details once. We use them to connect the request with chefs who
            fit, so you can compare the experience before you decide.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-stone-400">
            <span>Free to submit</span>
            <span>No obligation</span>
            <span>Matched chefs only</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-16 sm:px-6 lg:px-8">
        <SectionViewTracker
          moduleName="booking_form"
          pageName="open_booking"
          properties={seasonalAnalytics}
        />
        <BookDinnerForm
          initialPrefill={initialPrefill}
          seasonalContext={seasonalContext}
          analyticsEntryContext={seasonalContext?.entryContext ?? null}
          trackingParams={{
            referral_source:
              firstSearchParam(resolvedSearchParams.referral_source) ||
              firstSearchParam(resolvedSearchParams.source),
            referral_partner_id: firstSearchParam(resolvedSearchParams.referral_partner_id),
            utm_source: firstSearchParam(resolvedSearchParams.utm_source),
            utm_medium: firstSearchParam(resolvedSearchParams.utm_medium),
            utm_campaign: firstSearchParam(resolvedSearchParams.utm_campaign),
          }}
        />

        <div className="mt-6 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/chefs"
            className="text-sm font-semibold text-stone-200 transition hover:text-orange-300"
          >
            Want to browse first? View chef profiles →
          </Link>
          <span className="hidden text-stone-700 sm:inline">•</span>
          <TrackedLink
            href="/trust"
            analyticsName="booking_trust_link"
            analyticsProps={{ section: 'booking_form_footer' }}
            className="text-sm font-medium text-stone-400 transition hover:text-stone-200"
          >
            How ChefFlow handles trust
          </TrackedLink>
        </div>
      </section>

      <section className="border-y border-stone-800 bg-stone-950/55">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
              what happens next
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              From request to the right chef.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {steps.map((item) => (
              <article
                key={item.step}
                className="rounded-2xl border border-stone-800 bg-[#17100d] p-6"
              >
                <span className="text-sm font-bold text-orange-400">{item.step}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-stone-400">
          Already know you want to explore by chef, cuisine, price, or location?
        </p>
        <Link
          href="/chefs"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-stone-500"
        >
          Browse private chefs
        </Link>
        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.open_booking}
          theme="dark"
        />
      </section>
    </div>
  )
}
