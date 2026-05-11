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
import { HomepageDiscovery } from './_components/homepage-discovery'
import { ScrollReveal } from './_components/scroll-reveal'
import { getPublicPlatformStats } from '@/lib/directory/public-stats'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { getPublicSeasonalMarketPulse } from '@/lib/public/public-seasonal-market-pulse'
import type { FeaturedChefRailData, DiscoveryRailItem } from './_components/cuisine-marquee'

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

import React from 'react'
import type { PublicPlatformStats } from '@/lib/directory/public-stats'

/** Renders only the stat badges that are backed by real platform data. Hidden when all stats are null. */
function HeroStatBadges({ stats }: { stats: PublicPlatformStats }) {
  const items: { value: string; label: string }[] = []

  if (stats.verifiedChefCount !== null) {
    items.push({ value: String(stats.verifiedChefCount), label: 'Verified chefs' })
  }
  if (stats.cuisineTypeCount !== null) {
    items.push({ value: String(stats.cuisineTypeCount), label: 'Cuisine types' })
  }
  if (stats.cityCoveredCount !== null) {
    items.push({ value: String(stats.cityCoveredCount), label: 'Cities covered' })
  }
  if (stats.avgRating !== null) {
    items.push({ value: stats.avgRating.toFixed(1), label: 'Avg. rating' })
  }

  if (items.length === 0) return null

  return (
    <div className="mt-10 flex flex-col items-center gap-5 sm:mt-12">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-2xl border border-[#4a3020]/40 bg-[#1a0e08]/60 px-8 py-4 backdrop-blur-sm">
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div className="h-8 w-px bg-[#5c3520]/40" />}
            <div className="hero-stat-badge">
              <span className="hero-stat-badge-value">{item.value}</span>
              <span className="hero-stat-badge-label">{item.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default async function Home() {
  const [platformStats, allChefs, seasonalPulse] = await Promise.all([
    getPublicPlatformStats(),
    getDiscoverableChefs(),
    getPublicSeasonalMarketPulse().catch(() => null),
  ])

  // Select up to 5 featured chefs for the discovery rail.
  // Prefer chefs with: cuisine info, city/state, and profile image.
  // Avoid test/demo accounts (already filtered by getDiscoverableChefs).
  const featuredChefs: FeaturedChefRailData[] = allChefs
    .filter((c) => c.slug && c.display_name && c.discovery.cuisine_types.length > 0)
    .sort((a, b) => {
      // Prefer chefs with more complete profile data
      const scoreA =
        (a.profile_image_url ? 2 : 0) +
        (a.discovery.service_area_city ? 1 : 0) +
        (a.is_founder ? 1 : 0)
      const scoreB =
        (b.profile_image_url ? 2 : 0) +
        (b.discovery.service_area_city ? 1 : 0) +
        (b.is_founder ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, 5)
    .map((c) => ({
      slug: c.slug!,
      displayName: c.display_name,
      primaryCuisine: c.discovery.cuisine_types[0] ?? null,
      city: c.discovery.service_area_city ?? null,
      state: c.discovery.service_area_state ?? null,
    }))

  // Build culinary signal rail items from the seasonal market pulse.
  // These are seasonal ingredient discovery inserts routed to /ingredients.
  // Derived from the public seasonal calendar — no fake events or external data.
  const culinarySignals: DiscoveryRailItem[] = seasonalPulse
    ? [
        ...seasonalPulse.peakNow.slice(0, 2).map(
          (ingredient): DiscoveryRailItem => ({
            type: 'culinary_signal',
            label: ingredient.name,
            sublabel: `In season · ${seasonalPulse.season.name}`,
            href: '/ingredients',
          })
        ),
        ...(seasonalPulse.endingSoon
          ? [
              {
                type: 'culinary_signal' as const,
                label: seasonalPulse.endingSoon.name,
                sublabel: 'Ending soon',
                href: '/ingredients',
              },
            ]
          : []),
      ].slice(0, 3)
    : []
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
        {/* Deep warm brown gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-[#1a0e08]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_40%,_rgba(120,60,20,0.55),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,_rgba(80,35,10,0.4),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_70%_70%,_rgba(60,25,5,0.3),_transparent)]" />
          {/* Extra depth glow spots */}
          <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-[radial-gradient(ellipse,_rgba(180,80,20,0.18),_transparent_70%)] blur-2xl" />
          <div className="absolute bottom-1/3 left-1/5 h-56 w-56 rounded-full bg-[radial-gradient(ellipse,_rgba(220,120,40,0.12),_transparent_70%)] blur-2xl" />
        </div>

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-32">
          <div className="text-center">
            <h1 className="font-display-serif mx-auto max-w-3xl text-5xl font-extrabold tracking-[-0.02em] sm:text-6xl lg:text-7xl lg:tracking-[-0.03em]">
              <span className="homepage-hero-shimmer hero-line hero-line-1">
                Find a private chef
              </span>
              <span className="homepage-hero-shimmer-orange hero-line hero-line-2 block">
                near you
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-stone-300 sm:text-xl">
              Browse by cuisine, location, or occasion. Connect directly with vetted chefs for
              private dinners, catering, meal prep, and more.
            </p>
          </div>

          <HomepageDiscovery featuredChefs={featuredChefs} culinarySignals={culinarySignals} />

          {/* Social proof: stat badges - hidden */}
          {/* <HeroStatBadges stats={platformStats} /> */}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <TrackedLink
              href={PUBLIC_CONSUMER_DISCOVERY_ENTRY.href}
              analyticsName="home_consumer_hero_discovery"
              analyticsProps={{
                section: 'consumer_hero',
                destination: PUBLIC_CONSUMER_DISCOVERY_ENTRY.href,
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white shadow-lg shadow-[#8b4513]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#8b4513]/40 active:scale-[0.98]"
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
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#5c3520]/60 bg-[#2a1610]/50 px-8 text-base font-medium text-stone-200 backdrop-blur-sm transition-all hover:border-[#8b5e3c]/60 hover:bg-[#3a2218]/60"
            >
              Or describe your event
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ── Audience divider ── */}
      <div className="py-14 sm:py-20">
        <div className="divider-warm" />
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 pt-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-warm-gradient">
            Are you a chef-operator?
          </span>
        </div>
      </div>

      {/* ── Operator Section ── */}
      <section className="relative overflow-hidden pb-24 sm:pb-32">
        {/* Subtle warm glow behind section */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,_rgba(142,74,36,0.08),_transparent_70%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center">
            <span className="inline-flex rounded-full border border-[#8b5e3c]/30 bg-[#1a110c]/80 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8a96b] shadow-[0_0_20px_rgba(142,74,36,0.1)]">
              ChefFlow for chef-led operators
            </span>
            <h2 className="font-display-serif mx-auto mt-8 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Run private chef, catering, and meal prep work without spreadsheet patchwork.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-stone-300/90">
              ChefFlow keeps inquiries, events, menus, payments, and finance attached in one
              operator workspace. Start with real product proof, then get a walkthrough mapped to
              your current workflow.
            </p>
          </ScrollReveal>

          {/* Product screenshot - prominent with warm frame */}
          <ScrollReveal className="mt-14 sm:mt-20" delay={1}>
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#4a3020]/40 bg-[#1a110c]/80 p-2 shadow-[0_32px_80px_rgba(0,0,0,0.5),_0_0_60px_rgba(142,74,36,0.08)] backdrop-blur-sm sm:rounded-3xl sm:p-3">
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
          <div className="mt-16 grid gap-5 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map((card, i) => (
              <ScrollReveal key={card.title} delay={i < 4 ? (i as 0 | 1 | 2 | 3) : 0}>
                <div className="glass-warm group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.3),_0_0_20px_rgba(142,74,36,0.06)]">
                  <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-[#3a2218] to-[#2a1610] p-3 text-[#e8a96b] shadow-[inset_0_1px_0_rgba(232,169,107,0.1)]">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-semibold text-stone-100">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{card.detail}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* CTA buttons */}
          <ScrollReveal className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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
              className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-8 text-base font-semibold text-white shadow-[0_4px_16px_rgba(177,92,38,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(177,92,38,0.4)] active:scale-[0.98]"
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
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#4a3020]/50 bg-[#1a110c]/60 px-8 text-base font-medium text-stone-200 backdrop-blur-sm transition-all duration-300 hover:border-[#8b5e3c]/50 hover:bg-[#2a1a10]/60"
            >
              Request walkthrough
            </TrackedLink>
          </ScrollReveal>
        </div>
      </section>
    </main>
  )
}
