import type { Metadata } from 'next'
import Image from 'next/image'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from '@/components/seo/json-ld'
import {
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_SECONDARY_CONSUMER_CTA,
} from '@/lib/public/public-navigation-config'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { HomepageSearch } from './_components/homepage-search'

export const revalidate = 60

const marketingMetadata = buildMarketingMetadata({
  title: 'ChefFlow | Find a Private Chef, Caterer, or Meal Prep Service Near You',
  description:
    'Search for private chefs, caterers, and meal prep professionals in your area. Browse profiles, compare services, and book directly. ChefFlow connects you with vetted food professionals.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow homepage preview',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: [
    'hire private chef',
    'private chef near me',
    'book a private chef',
    'catering near me',
    'meal prep service',
    'personal chef for hire',
    'private chef software',
    'catering software',
  ],
}

const HOME_OPERATOR_PROOF_ITEMS = [
  {
    title: '64-second demo',
    detail: 'See the operator workflow before you create an account or request access.',
  },
  {
    title: 'Real workspace screens',
    detail: 'Dashboard, inquiry, event, and finance views are already public on the proof page.',
  },
  {
    title: 'Founder-led walkthrough',
    detail:
      'Qualified operators can request a live review against their actual intake and ops flow.',
  },
] as const

export default function Home() {
  return (
    <>
      <PublicPageView
        pageName="home"
        properties={{
          section: 'consumer_and_operator',
          entry_context: 'direct',
          primary_intent: 'consumer_search',
        }}
      />
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <WebSiteJsonLd />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(237,168,107,0.10),_transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/6 to-transparent" />

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
          <div className="text-center">
            <h1 className="text-mask-hero mx-auto max-w-3xl text-[2.5rem] font-display tracking-[-0.045em] leading-[1.08] sm:text-5xl lg:text-[3.75rem]">
              Find a private chef near you
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 tracking-[-0.01em] text-stone-400 sm:text-lg sm:leading-8">
              Browse vetted chefs by location and service type, compare profiles, and book directly.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl">
            <HomepageSearch />
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <TrackedLink
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              analyticsName="home_consumer_hero_book"
              analyticsProps={{
                section: 'consumer_hero',
                destination: PUBLIC_PRIMARY_CONSUMER_CTA.href,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl gradient-accent px-7 py-3 text-sm font-semibold tracking-[-0.01em] text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {PUBLIC_PRIMARY_CONSUMER_CTA.label}
            </TrackedLink>
            <TrackedLink
              href={PUBLIC_SECONDARY_CONSUMER_CTA.href}
              analyticsName="home_consumer_hero_browse"
              analyticsProps={{
                section: 'consumer_hero',
                destination: PUBLIC_SECONDARY_CONSUMER_CTA.href,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-950/60 px-7 py-3 text-sm font-medium tracking-[-0.01em] text-stone-300 transition-all duration-200 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
            >
              {PUBLIC_SECONDARY_CONSUMER_CTA.label}
            </TrackedLink>
          </div>
        </div>
      </section>

      <div className="py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-800/60 to-transparent" />
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Are you a chef-operator?
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-800/60 to-transparent" />
        </div>
      </div>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(237,168,107,0.06),_transparent_50%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:gap-16 lg:px-8 lg:pb-24">
          <div>
            <span className="inline-flex rounded-full border border-brand-700/30 bg-brand-950/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/80">
              ChefFlow for chef-led operators
            </span>
            <h2 className="mt-7 max-w-lg text-[2rem] font-display tracking-[-0.04em] leading-[1.12] text-white sm:text-4xl lg:text-[2.75rem]">
              Run private chef, catering, and meal prep work without spreadsheet patchwork.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 tracking-[-0.01em] text-stone-400">
              Inquiries, events, menus, payments, and finance in one operator workspace. Start with
              real product proof, then map it to your workflow.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href={buildMarketingSourceHref({
                  pathname: '/for-operators',
                  sourcePage: 'home',
                  sourceCta: 'hero_operator_proof',
                })}
                analyticsName="home_hero_operator_proof"
                analyticsProps={{
                  section: 'operator',
                  destination: '/for-operators',
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-950/60 px-7 py-3 text-sm font-semibold tracking-[-0.01em] text-stone-200 transition-all duration-200 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100 active:scale-[0.98]"
              >
                See operator proof
              </TrackedLink>
              <TrackedLink
                href={buildOperatorWalkthroughHref({
                  sourcePage: 'home',
                  sourceCta: 'hero_operator_walkthrough',
                })}
                analyticsName="home_hero_operator_walkthrough"
                analyticsProps={{ section: 'operator' }}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-950/60 px-7 py-3 text-sm font-medium tracking-[-0.01em] text-stone-300 transition-all duration-200 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
              >
                Request walkthrough
              </TrackedLink>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-stone-800/30 bg-stone-950/70 p-5 shadow-[0_32px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/70">
                  Real product proof
                </p>
                <h3 className="mt-2 text-xl font-display tracking-[-0.03em] text-stone-100">
                  Live operator workspace
                </h3>
              </div>
              <span className="rounded-full border border-stone-800 bg-stone-900/60 px-3 py-1 text-[11px] font-medium text-stone-400">
                Current screen
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-stone-800/30 bg-stone-950/75">
              <Image
                src="/proof/operator-dashboard.png"
                alt="ChefFlow operator dashboard with inquiries, events, finance, and command center modules"
                width={1280}
                height={800}
                className="h-auto w-full"
                priority
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {HOME_OPERATOR_PROOF_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-stone-800/30 bg-stone-900/30 p-3.5"
                >
                  <p className="text-sm font-semibold tracking-[-0.01em] text-stone-200">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-stone-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
