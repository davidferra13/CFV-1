'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  ClipboardList,
  DollarSign,
  MapPin,
  Search,
  Users,
} from '@/components/ui/icons'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { DISCOVERY_SERVICE_TYPE_OPTIONS } from '@/lib/discovery/constants'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { NEUTRAL_HOME_SEARCH_LOCATION_PLACEHOLDER } from '@/lib/site/national-brand-copy'

const QUICK_SEARCH_LINKS = [
  {
    label: 'Private dinners',
    href: { pathname: '/chefs', query: { serviceType: 'private_dinner' } },
  },
  {
    label: 'Catering',
    href: { pathname: '/chefs', query: { serviceType: 'catering' } },
  },
  {
    label: 'Meal prep',
    href: { pathname: '/chefs', query: { serviceType: 'meal_prep' } },
  },
  {
    label: 'Event chefs',
    href: { pathname: '/chefs', query: { serviceType: 'event_chef' } },
  },
] as const

const OPERATOR_HIGHLIGHTS = [
  {
    icon: Users,
    title: 'Client memory',
    description:
      'Keep households, allergies, pricing context, and repeat-booking history in one record.',
  },
  {
    icon: ClipboardList,
    title: 'Service execution',
    description: 'Turn a booking into prep, shopping, staffing, packing, and day-of coordination.',
  },
  {
    icon: DollarSign,
    title: 'Margin visibility',
    description: 'Track payout, groceries, labor, and what actually compounds into repeat revenue.',
  },
] as const

const BUILD_SIGNALS = [
  {
    icon: Search,
    title: 'Search is first',
    description:
      'Consumers land on an active discovery surface instead of having to infer that search exists.',
  },
  {
    icon: ChefHat,
    title: 'Operators are explicit',
    description:
      'Chefs see the operating-system path above the fold, not buried in nav or generic signup copy.',
  },
  {
    icon: CalendarDays,
    title: 'Marketplace energy, real software',
    description:
      'The front door keeps the feel of live demand while showing the infrastructure behind delivery.',
  },
] as const

export function HomeDualEntry() {
  const router = useRouter()
  const isBeta = LAUNCH_MODE === 'beta'

  const handleAudienceSelect = (audience: 'consumer' | 'operator', target: string) => {
    trackEvent(ANALYTICS_EVENTS.AUDIENCE_SELECTED, {
      audience,
      target,
      surface: 'home',
    })
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const need = `${formData.get('need') || ''}`.trim()
    const location = `${formData.get('location') || ''}`.trim()
    const serviceType = `${formData.get('serviceType') || ''}`.trim()
    const acceptingOnly = formData.get('accepting') === '1'
    const query = [need, location].filter(Boolean).join(' ').trim()
    const params = new URLSearchParams()

    if (query) params.set('q', query)
    if (serviceType) params.set('serviceType', serviceType)
    if (acceptingOnly) params.set('accepting', '1')

    trackEvent(ANALYTICS_EVENTS.HOME_SEARCH_SUBMITTED, {
      query_length: query.length,
      has_location: Boolean(location),
      has_need: Boolean(need),
      service_type: serviceType || 'any',
      accepting_only: acceptingOnly,
      surface: 'home_search',
    })

    trackEvent(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      search_area: 'home',
      query_length: query.length,
      has_service_type_filter: Boolean(serviceType),
      accepting_only: acceptingOnly,
    })

    handleAudienceSelect('consumer', 'search')

    const nextQuery = params.toString()
    router.push(nextQuery ? `/chefs?${nextQuery}` : '/chefs')
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[100px]" />
        <div className="pointer-events-none absolute right-0 top-12 h-[320px] w-[420px] rounded-full bg-brand-800/20 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-[360px] rounded-full bg-orange-950/25 blur-[90px]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-20 sm:px-6 md:pb-24 md:pt-24 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-brand-700/60 bg-brand-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-200">
                Search chefs
              </span>
              <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-stone-300">
                Chef operating system
              </span>
            </div>

            <h1 className="mt-6 max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
              Search chefs for dinner, catering, or meal prep. Start operating in ChefFlow.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
              Consumers should immediately know how to search. Chefs should immediately know where
              to sign up. ChefFlow now leads with both paths in the first screen.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <section className="rounded-[28px] border border-stone-700 bg-stone-950/85 p-6 shadow-[var(--shadow-card)] md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                    For diners
                  </p>
                  <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100">
                    Search chefs or where they cook.
                  </h2>
                </div>
                <span className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs font-medium text-stone-300">
                  Search cities, cuisines, and partner venues
                </span>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                    What do you need?
                  </span>
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      name="need"
                      placeholder="Private dinner, omakase, pasta night, brunch"
                      className="w-full rounded-2xl border border-stone-600 bg-stone-950 px-10 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </label>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                      Where?
                    </span>
                    <div className="relative mt-1.5">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        name="location"
                        placeholder={NEUTRAL_HOME_SEARCH_LOCATION_PLACEHOLDER}
                        className="w-full rounded-2xl border border-stone-600 bg-stone-950 px-10 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                      Service type
                    </span>
                    <select
                      name="serviceType"
                      className="mt-1.5 w-full rounded-2xl border border-stone-600 bg-stone-950 px-3 py-3 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      defaultValue=""
                    >
                      <option value="">Any service</option>
                      {DISCOVERY_SERVICE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-col gap-4 border-t border-stone-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      name="accepting"
                      value="1"
                      className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-brand-600 focus:ring-brand-500"
                    />
                    Accepting inquiries now
                  </label>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Search chefs
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Start fast
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_SEARCH_LINKS.map((link) => (
                    <TrackedLink
                      key={link.label}
                      href={link.href}
                      analyticsName="home_quick_search"
                      analyticsProps={{ label: link.label, section: 'consumer_card' }}
                      onClick={() => handleAudienceSelect('consumer', link.label)}
                      className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300 transition-colors hover:border-brand-600 hover:text-stone-100"
                    >
                      {link.label}
                    </TrackedLink>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-brand-700/40 bg-gradient-to-br from-stone-950 via-stone-950 to-brand-950/40 p-6 shadow-[var(--shadow-card)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                For chefs and operators
              </p>
              <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
                Build the system behind every booking.
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                Keep referrals, inbound leads, and marketplace demand flowing. Use ChefFlow for the
                work that compounds after the inquiry arrives.
              </p>

              <div className="mt-6 space-y-4">
                {OPERATOR_HIGHLIGHTS.map((item) => {
                  const Icon = item.icon

                  return (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-stone-700 bg-stone-900/80 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="inline-flex rounded-xl bg-brand-950 p-2.5 text-brand-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-stone-100">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-stone-300">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <TrackedLink
                  href={buildMarketingSourceHref({
                    pathname: '/marketplace-chefs',
                    sourcePage: 'home',
                    sourceCta: 'operator_card_workflow',
                  })}
                  analyticsName="home_operator_path"
                  analyticsProps={{ section: 'operator_card' }}
                  onClick={() => handleAudienceSelect('operator', 'operator_path')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  See the operator workflow
                  <ArrowRight className="h-4 w-4" />
                </TrackedLink>
                <TrackedLink
                  href={buildMarketingSignupHref({
                    sourcePage: 'home',
                    sourceCta: 'operator_card_signup',
                  })}
                  analyticsName="home_operator_signup"
                  analyticsProps={{ section: 'operator_card', launch_mode: LAUNCH_MODE }}
                  onClick={() => handleAudienceSelect('operator', 'signup')}
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  {isBeta ? 'Request operator access' : PRIMARY_SIGNUP_LABEL}
                </TrackedLink>
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-400">
            <span className="rounded-full border border-stone-700/80 bg-stone-900/70 px-3 py-1.5">
              Search starts on the homepage
            </span>
            <span className="rounded-full border border-stone-700/80 bg-stone-900/70 px-3 py-1.5">
              Operator path is visible before the nav menu
            </span>
            <span className="rounded-full border border-stone-700/80 bg-stone-900/70 px-3 py-1.5">
              Marketplace feel with real operating depth
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {BUILD_SIGNALS.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.title}
                className="rounded-3xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
              >
                <div className="inline-flex rounded-2xl bg-brand-950 p-3 text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-stone-100">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-3xl border border-stone-700 bg-stone-950/80 p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Consumer journey
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              Search, compare, and inquire without guessing where to start.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              The consumer experience leads with search, speaks in occasions and service types, and
              keeps discovery tied to real chef profiles and partner venues.
            </p>
            <TrackedLink
              href="/chefs"
              analyticsName="home_consumer_lower_cta"
              analyticsProps={{ section: 'consumer_journey' }}
              onClick={() => handleAudienceSelect('consumer', 'lower_cta')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-300 transition-colors hover:text-brand-200"
            >
              Browse the directory
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
          </article>

          <article className="rounded-3xl border border-brand-700/40 bg-gradient-to-br from-stone-900 via-stone-900 to-brand-950/40 p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Operator journey
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              Move from profile to operating system in a single click.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              The operator path names the problem clearly: client records, execution, menu flow,
              payouts, and repeat business need a dedicated system, not inbox improvisation.
            </p>
            <TrackedLink
              href={buildMarketingSourceHref({
                pathname: '/marketplace-chefs',
                sourcePage: 'home',
                sourceCta: 'operator_journey',
              })}
              analyticsName="home_operator_lower_cta"
              analyticsProps={{ section: 'operator_journey' }}
              onClick={() => handleAudienceSelect('operator', 'lower_cta')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-300 transition-colors hover:text-brand-200"
            >
              Open the operator page
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 md:py-24 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
          Next build direction
        </p>
        <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-display tracking-tight text-stone-100">
          One front door for discovery. One explicit path for operators.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-stone-300">
          This is the shape of the public product going forward: search-first for guests, operator
          intent made visible immediately, and a clearer bridge between marketplace demand and the
          ChefFlow operating layer.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrackedLink
            href="/chefs"
            analyticsName="home_final_consumer_cta"
            analyticsProps={{ section: 'final_cta' }}
            onClick={() => handleAudienceSelect('consumer', 'final_cta')}
            className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Search chefs
          </TrackedLink>
          <TrackedLink
            href={buildMarketingSourceHref({
              pathname: '/marketplace-chefs',
              sourcePage: 'home',
              sourceCta: 'final_operator_cta',
            })}
            analyticsName="home_final_operator_cta"
            analyticsProps={{ section: 'final_cta' }}
            onClick={() => handleAudienceSelect('operator', 'final_cta')}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
          >
            For chefs and operators
          </TrackedLink>
        </div>
      </section>
    </>
  )
}
