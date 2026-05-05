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
  PUBLIC_CONSUMER_DISCOVERY_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { HomepageSearch } from './_components/homepage-search'
import { ScrollReveal } from './_components/scroll-reveal'

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

const FEATURE_CARDS = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    title: 'Events and menus',
    detail: 'Build menus, track guests, manage timelines. Every detail in one workspace.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: 'Quotes and payments',
    detail: 'Send proposals, collect deposits, track every dollar. No spreadsheets needed.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    title: 'Client relationships',
    detail: 'Inquiries, preferences, dietary needs, communication history. All connected.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    title: 'Recipes and ingredients',
    detail: 'Document recipes, scale portions, track seasonal availability and pricing.',
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

      {/* ── Consumer Hero ── */}
      <section className="relative overflow-hidden">
        {/* Warm gradient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,_rgba(237,168,107,0.18),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,_rgba(177,92,38,0.06),_transparent)]" />
        </div>

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-32">
          <div className="text-center">
            <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Find a private chef
              <span className="block bg-gradient-to-r from-brand-400 via-brand-300 to-brand-500 bg-clip-text text-transparent">
                near you
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-stone-300/90 sm:text-xl">
              Browse vetted chefs by location and service type, compare profiles, and book directly.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl sm:mt-12">
            <HomepageSearch />
          </div>

          {/* Social proof strip */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:mt-12">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full border-2 border-stone-900 bg-gradient-to-br from-brand-600/60 to-brand-800/60"
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-stone-400">
              Trusted by private chefs, caterers, and meal prep professionals nationwide
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <TrackedLink
              href={PUBLIC_CONSUMER_DISCOVERY_ENTRY.href}
              analyticsName="home_consumer_hero_discovery"
              analyticsProps={{
                section: 'consumer_hero',
                destination: PUBLIC_CONSUMER_DISCOVERY_ENTRY.href,
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              Find food now
            </TrackedLink>
            <TrackedLink
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              analyticsName="home_consumer_hero_book"
              analyticsProps={{
                section: 'consumer_hero',
                destination: PUBLIC_PRIMARY_CONSUMER_CTA.href,
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-900/50 px-8 text-base font-medium text-stone-200 backdrop-blur-sm transition-all hover:border-stone-600 hover:bg-stone-800/60"
            >
              Or describe your event
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ── Audience divider ── */}
      <div className="relative py-12 sm:py-16">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-stone-700/60 to-transparent" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4">
          <span className="bg-stone-950 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Are you a chef-operator?
          </span>
        </div>
      </div>

      {/* ── Operator Section ── */}
      <section className="relative overflow-hidden pb-20 sm:pb-28">
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center">
            <span className="inline-flex rounded-full border border-brand-700/40 bg-brand-950/30 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-200">
              ChefFlow for chef-led operators
            </span>
            <h2 className="mx-auto mt-8 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Run private chef, catering, and meal prep work without spreadsheet patchwork.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-stone-300/90">
              ChefFlow keeps inquiries, events, menus, payments, and finance attached in one
              operator workspace. Start with real product proof, then get a walkthrough mapped to
              your current workflow.
            </p>
          </ScrollReveal>

          {/* Product screenshot - prominent */}
          <ScrollReveal className="mt-12 sm:mt-16" delay={1}>
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-stone-700/60 bg-stone-950/60 p-2 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:rounded-3xl sm:p-3">
              <div className="overflow-hidden rounded-xl sm:rounded-2xl">
                <Image
                  src="/proof/operator-dashboard.png"
                  alt="ChefFlow operator dashboard with inquiries, events, finance, and command center modules"
                  width={1280}
                  height={800}
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Feature cards grid */}
          <div className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map((card, i) => (
              <ScrollReveal key={card.title} delay={i < 4 ? (i as 0 | 1 | 2 | 3) : 0}>
                <div className="group rounded-2xl border border-stone-800/60 bg-stone-900/30 p-6 backdrop-blur-sm transition-all hover:border-stone-700/80 hover:bg-stone-900/50">
                  <div className="mb-4 inline-flex rounded-xl bg-brand-950/50 p-2.5 text-brand-400">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-semibold text-stone-100">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{card.detail}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* CTA buttons */}
          <ScrollReveal className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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
              className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
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
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-900/50 px-8 text-base font-medium text-stone-200 backdrop-blur-sm transition-all hover:border-stone-600 hover:bg-stone-800/60"
            >
              Request walkthrough
            </TrackedLink>
          </ScrollReveal>
        </div>
      </section>
    </main>
  )
}
