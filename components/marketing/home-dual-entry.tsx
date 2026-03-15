'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { ArrowRight, MapPin, Search } from '@/components/ui/icons'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { DISCOVERY_SERVICE_TYPE_OPTIONS } from '@/lib/discovery/constants'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'

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

const CATEGORIES = [
  { label: 'Private Chefs', href: '/chefs?serviceType=private-chef' },
  { label: 'Caterers', href: '/chefs?serviceType=catering' },
  { label: 'Meal Prep', href: '/chefs?serviceType=meal-prep' },
  { label: 'Restaurants', href: '/chefs?partnerType=restaurant' },
  { label: 'Food Trucks', href: '/chefs?partnerType=food-truck' },
  { label: 'Bakeries', href: '/chefs?partnerType=bakery' },
]

const VALUE_PROPS = [
  {
    title: 'Browse real menus',
    description: 'See what each chef or restaurant actually serves. No guessing, no stock photos.',
  },
  {
    title: 'Connect directly',
    description: 'Reach out to any provider directly. No middleman, no commission, no gatekeeping.',
  },
  {
    title: 'Every kind of food',
    description: 'Private chefs, caterers, restaurants, food trucks, bakeries. All in one search.',
  },
]

export function HomeDualEntry() {
  const router = useRouter()
  const isBeta = LAUNCH_MODE === 'beta'

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

    const nextQuery = params.toString()
    router.push(nextQuery ? `/chefs?${nextQuery}` : '/chefs')
  }

  return (
    <>
      {/* Hero with Search */}
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[840px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[100px]" />
        <div className="pointer-events-none absolute right-0 top-12 h-[320px] w-[420px] rounded-full bg-brand-800/20 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-[360px] rounded-full bg-orange-950/25 blur-[90px]" />

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-28 pt-32 text-center sm:px-6 md:pb-36 md:pt-44 lg:px-8">
          <h1 className="mx-auto max-w-3xl fluid-display-xl font-display tracking-tight text-stone-100">
            Find exactly what you want to eat.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-stone-400">
            Browse private chefs, restaurants, caterers, food trucks, and bakeries near you. Explore
            menus and connect directly.
          </p>

          {/* Search Form */}
          <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-stone-700 bg-stone-950/85 p-6 shadow-lg backdrop-blur-sm text-left">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  What are you looking for?
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
                      placeholder="Brooklyn, Miami, Austin, Napa"
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
                  Search
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-stone-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                Popular
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_SEARCH_LINKS.map((link) => (
                  <TrackedLink
                    key={link.label}
                    href={link.href}
                    analyticsName="home_quick_search"
                    analyticsProps={{ label: link.label, section: 'hero_search' }}
                    className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-300 transition-colors hover:border-brand-600 hover:text-stone-100"
                  >
                    {link.label}
                  </TrackedLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <h2 className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
          What are you looking for?
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <TrackedLink
              key={cat.label}
              href={cat.href}
              analyticsName={`home_category_${cat.label.toLowerCase().replace(/\s+/g, '_')}`}
              analyticsProps={{ section: 'categories' }}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-stone-700/60 bg-stone-950 p-6 transition-all hover:-translate-y-1 hover:border-brand-600 hover:bg-stone-900/80 hover:shadow-lg"
            >
              <span className="text-sm font-medium text-stone-300 group-hover:text-stone-100">
                {cat.label}
              </span>
            </TrackedLink>
          ))}
        </div>
      </section>

      {/* Value Props */}
      <section className="border-y border-stone-700/50 bg-stone-900/40 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <h2 className="text-center text-3xl font-display font-bold tracking-tight text-stone-100 md:text-4xl">
            The simplest way to find great food.
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {VALUE_PROPS.map((prop) => (
              <div key={prop.title} className="text-center">
                <h3 className="text-lg font-semibold text-stone-100">{prop.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative mx-auto w-full max-w-5xl px-4 py-24 text-center sm:px-6 md:py-32 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/15 blur-[60px]" />

        <h2 className="relative fluid-display-lg font-display tracking-tight text-stone-100">
          Hungry?
        </h2>
        <p className="relative mt-4 text-base text-stone-400">
          Start browsing chefs, restaurants, and food experiences near you.
        </p>

        <TrackedLink
          href="/chefs"
          analyticsName="home_footer_cta"
          analyticsProps={{ section: 'footer_cta' }}
          className="relative mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-500"
        >
          Explore now
        </TrackedLink>

        {/* Operator sign-up - subtle secondary link */}
        <p className="relative mt-12 text-sm text-stone-500">
          Are you a chef or food business?{' '}
          <TrackedLink
            href={PRIMARY_SIGNUP_HREF}
            analyticsName="home_operator_signup"
            analyticsProps={{ section: 'footer_cta' }}
            className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            {isBeta ? 'Join the beta' : 'List your business'}
          </TrackedLink>
        </p>
      </section>
    </>
  )
}
