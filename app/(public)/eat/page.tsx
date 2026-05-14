import type { Metadata } from 'next'
import {
  getConsumerDiscoveryFeed,
  type ConsumerDiscoveryFilters,
  type ConsumerIntent,
} from '@/lib/public-consumer/discovery-actions'
import { planningBriefFromSearchParams } from '@/lib/hub/planning-brief'
import { buildDiscoveryRuntimePlan } from '@/lib/discovery/discovery-runtime-module'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { ConsumerIntentShell } from './_components/consumer-intent-shell'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Find Food, Chefs, and Dinner Ideas',
  description:
    'Browse private chefs, sample menus, meal prep options, giftable experiences, and local food listings by craving, occasion, location, and group size.',
  path: '/eat',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow food discovery',
  twitterCard: 'summary_large_image',
})

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function parsePartySize(value: string | string[] | undefined): number | undefined {
  const raw = firstParam(value)
  if (raw === 'family') return 4
  if (raw === 'large' || raw === 'big_group') return 10
  const parsed = Number(firstParam(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}

function parseIntent(value: string | string[] | undefined): ConsumerIntent | undefined {
  const raw = firstParam(value)
  if (
    raw === 'tonight' ||
    raw === 'weekend' ||
    raw === 'dinner_party' ||
    raw === 'meal_prep' ||
    raw === 'private_chef' ||
    raw === 'going_out' ||
    raw === 'team_dinner' ||
    raw === 'work_lunch' ||
    raw === 'late_night' ||
    raw === 'quick_eats' ||
    raw === 'surprise_me' ||
    raw === 'visual'
  ) {
    return raw
  }
  return undefined
}

function buildFilters(
  searchParams: Record<string, string | string[] | undefined>
): ConsumerDiscoveryFilters {
  const intent = parseIntent(searchParams.intent)
  return {
    intent,
    craving: firstParam(searchParams.craving),
    location: firstParam(searchParams.location),
    budget: firstParam(searchParams.budget) ?? firstParam(searchParams.priceRange),
    dietary: firstParam(searchParams.dietary),
    visualMode: firstParam(searchParams.visual) === '1',
    dateWindow:
      firstParam(searchParams.dateWindow) ??
      (intent === 'weekend' ? 'this_weekend' : intent === 'tonight' ? 'tonight' : undefined),
    partySize: parsePartySize(searchParams.partySize),
    eventStyle: firstParam(searchParams.eventStyle),
    useCase:
      firstParam(searchParams.useCase) ?? (intent === 'surprise_me' ? 'adventurous' : undefined),
  }
}

export default async function EatPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const filters = buildFilters(resolvedSearchParams)
  const planningBrief = planningBriefFromSearchParams(resolvedSearchParams)
  const runtimePlan = buildDiscoveryRuntimePlan({
    surface: 'eat',
    actor: 'public',
    query: filters.craving ?? filters.intent,
    preferenceSignals: [filters.dietary, filters.budget].filter((value): value is string =>
      Boolean(value)
    ),
  })
  const feed = await getConsumerDiscoveryFeed(filters)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ChefFlow Food Discovery',
    url: `${APP_URL}/eat`,
    description:
      'Browse private chefs, sample menus, meal prep options, and local food listings by occasion and craving.',
    hasPart: feed.results.slice(0, 12).map((result) => ({
      '@type': result.type === 'listing' ? 'LocalBusiness' : 'FoodService',
      name: result.title,
      url: `${APP_URL}${result.ctaHref}`,
      ...(result.subtitle ? { description: result.subtitle } : {}),
      ...(result.imageUrl ? { image: result.imageUrl } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ConsumerIntentShell
        feed={feed}
        filters={filters}
        planningBrief={planningBrief}
        runtimePlan={runtimePlan}
      />
    </>
  )
}
