import type { Metadata } from 'next'
import Image from 'next/image'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from '@/components/seo/json-ld'
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'
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
    <main>
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

      {/* ── Consumer Hero (above fold) ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(237,168,107,0.16),_transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/8 to-transparent" />

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
          <div className="text-center">
            <h1 className="mx-auto max-w-3xl text-4xl font-display tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find a private chef near you
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-300 sm:text-xl">
              Browse vetted chefs by location and service type, compare profiles, and book directly.
              From intimate dinners to weekly meal prep, ChefFlow connects you with the right fit.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-2xl">
            <HomepageSearch />
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <TrackedLink
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              analyticsName="home_consumer_hero_book"
              analyticsProps={{
                section: 'consumer_hero',
                destination: PUBLIC_PRIMARY_CONSUMER_CTA.href,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-700 bg-stone-950/70 px-6 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
            >
              Or describe your event
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ── Audience divider ── */}
      <div className="border-t border-stone-800/60">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="h-px flex-1 bg-stone-800/60" />
          <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Are you a chef-operator?
          </p>
          <div className="h-px flex-1 bg-stone-800/60" />
        </div>
      </div>

      {/* ── Operator Section ── */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:px-8 lg:pb-20">
          <div>
            <span className="inline-flex rounded-full border border-brand-700/40 bg-brand-950/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">
              ChefFlow for chef-led operators
            </span>
            <h2 className="mt-6 max-w-4xl text-4xl font-display tracking-tight text-white sm:text-5xl">
              Run private chef, catering, and meal prep work without spreadsheet patchwork.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
              ChefFlow keeps inquiries, events, menus, payments, and finance attached in one
              operator workspace. Start with real product proof, then use the walkthrough lane when
              you want the system mapped to your current workflow.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-6 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
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
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-stone-700 bg-stone-950/70 px-6 text-base font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                Request walkthrough
              </TrackedLink>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-stone-700/70 bg-stone-950/80 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  Real product proof
                </p>
                <h3 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
                  Live operator workspace
                </h3>
              </div>
              <span className="rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1 text-xs font-medium text-stone-300">
                Current screen
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-stone-700/70 bg-stone-950/75">
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
                  className="rounded-2xl border border-stone-800/70 bg-stone-950/60 p-4"
                >
                  <p className="text-sm font-semibold text-stone-100">{item.title}</p>
                  <p className="mt-2 text-xs leading-6 text-stone-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
