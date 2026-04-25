import Link from 'next/link'
import { ArrowRight, CalendarDays, ChefHat, Gift, Search } from 'lucide-react'
import type { PlanningBrief } from '@/lib/hub/types'
import type {
  ConsumerDiscoveryFeed,
  ConsumerDiscoveryFilters,
} from '@/lib/public-consumer/discovery-actions'
import { ConsumerIntentFilters } from './consumer-intent-filters'
import { ConsumerResultCard } from './consumer-result-card'

function describeActiveFilters(filters: ConsumerDiscoveryFilters) {
  const parts = [
    filters.intent ? filters.intent.replace(/_/g, ' ') : null,
    filters.location,
    filters.dietary,
    filters.budget,
    filters.partySize ? `${filters.partySize} guests` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : 'Browse chefs, menus, and food options'
}

function serviceTypeFromIntent(intent: ConsumerDiscoveryFilters['intent']) {
  if (intent === 'meal_prep') return 'meal_prep'
  if (intent === 'team_dinner' || intent === 'work_lunch') return 'catering'
  if (intent === 'dinner_party' || intent === 'private_chef') return 'dinner_party'
  return ''
}

function buildBookingHref(filters: ConsumerDiscoveryFilters) {
  const params = new URLSearchParams()
  const serviceType = serviceTypeFromIntent(filters.intent)
  const notes = [
    filters.craving ? `Craving: ${filters.craving}` : null,
    filters.location ? `Location: ${filters.location}` : null,
    filters.budget ? `Budget: ${filters.budget}` : null,
    filters.dietary ? `Dietary: ${filters.dietary}` : null,
    filters.eventStyle ? `Style: ${filters.eventStyle}` : null,
    filters.partySize ? `Party size: ${filters.partySize}` : null,
  ].filter(Boolean)

  if (filters.intent) params.set('occasion', filters.intent.replace(/_/g, ' '))
  if (serviceType) params.set('service_type', serviceType)
  if (notes.length > 0) params.set('additional_notes', notes.join('\n'))

  const query = params.toString()
  return query ? `/book?${query}` : '/book'
}

export function ConsumerIntentShell({
  feed,
  filters,
  planningBrief,
}: {
  feed: ConsumerDiscoveryFeed
  filters: ConsumerDiscoveryFilters
  planningBrief: PlanningBrief
}) {
  const visualMode = Boolean(filters.visualMode)
  const bookingHref = buildBookingHref(filters)
  const gridClass = visualMode
    ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
    : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden border-b border-stone-800/70">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-brand-600/12 via-brand-600/5 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-brand-700/70 bg-stone-900/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Food discovery
            </p>
            <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
              What should we eat?
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
              Start with the occasion, craving, or group size. ChefFlow will surface private chefs,
              sample menus, meal prep options, and local food listings without forcing you into the
              booking form first.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 shadow-[var(--shadow-card)] sm:p-5">
            <ConsumerIntentFilters activeIntent={filters.intent ?? null} visualMode={visualMode} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {describeActiveFilters(filters)}
            </p>
            <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
              Best matches
            </h2>
          </div>
          <Link
            href={bookingHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
          >
            Describe a request
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {feed.results.length > 0 ? (
          <div className={gridClass}>
            {feed.results.map((card) => (
              <ConsumerResultCard
                key={card.id}
                card={card}
                visualMode={visualMode}
                planningBrief={planningBrief}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-stone-500" />
            <h3 className="mt-4 text-xl font-semibold text-stone-100">No exact matches yet</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-400">
              Try a broader location or remove one filter. You can still send an open request and
              let matched chefs decide whether they can help.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={bookingHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Send open request
              </Link>
              <Link
                href="/chefs"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600"
              >
                Browse chefs
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/how-it-works"
            className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900"
          >
            <CalendarDays className="h-5 w-5 text-brand-300" />
            <h3 className="mt-4 text-base font-semibold text-stone-100">
              How private chef booking works
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Practical steps, pricing expectations, and what to prepare before you inquire.
            </p>
          </Link>
          <Link
            href="/chefs"
            className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900"
          >
            <ChefHat className="h-5 w-5 text-brand-300" />
            <h3 className="mt-4 text-base font-semibold text-stone-100">Chef directory</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Filter by service type, cuisine, location, price range, and availability.
            </p>
          </Link>
          <Link
            href="/gift-cards"
            className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900"
          >
            <Gift className="h-5 w-5 text-brand-300" />
            <h3 className="mt-4 text-base font-semibold text-stone-100">Gift cards</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Browse chef-specific gift card pages and send prepaid chef credit by email.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
