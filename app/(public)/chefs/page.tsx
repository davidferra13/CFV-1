import type { Metadata } from 'next'
import Link from 'next/link'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import type { DirectoryChef, DirectoryPartner } from '@/lib/directory/actions'
import { ChefHero } from './_components/chef-hero'
import { DirectoryFiltersForm } from './_components/directory-filters-form'
import { DirectoryResultsTracker } from './_components/directory-results-tracker'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Hire a Private Chef Near You - ChefFlow Chef Directory',
  description:
    'Search vetted private chefs by location and partner venues, compare profiles, and send an inquiry in minutes.',
  keywords: [
    'hire private chef',
    'private chef near me',
    'personal chef for hire',
    'private dinner party chef',
    'book a private chef',
    'private chef directory',
    'catering chef',
  ],
  openGraph: {
    title: 'Hire a Private Chef | ChefFlow',
    description: 'Browse vetted private chefs and send an inquiry in minutes.',
    url: `${APP_URL}/chefs`,
    type: 'website',
  },
  alternates: {
    canonical: `${APP_URL}/chefs`,
  },
}

const MAX_QUERY_LENGTH = 80

const PARTNER_TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Hotel & Lodging',
  venue: 'Venue',
  platform: 'Platform',
  individual: 'Partner',
  other: 'Partner',
}

type SortMode = 'featured' | 'alpha' | 'partners'

type PageProps = {
  searchParams?: {
    q?: string | string[]
    state?: string | string[]
    partnerType?: string | string[]
    sort?: string | string[]
  }
}

type FacetOption = {
  value: string
  label: string
  count: number
}

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'featured', label: 'Featured first' },
  { value: 'partners', label: 'Most partner venues' },
  { value: 'alpha', label: 'Name A-Z' },
]

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function sanitizeQuery(value: string): string {
  return value.trim().slice(0, MAX_QUERY_LENGTH)
}

function parseSortMode(value: string): SortMode {
  if (value === 'alpha' || value === 'partners' || value === 'featured') return value
  return 'featured'
}

function buildStateFacets(chefs: DirectoryChef[]): FacetOption[] {
  const stateMap = new Map<string, { label: string; chefs: Set<string> }>()

  for (const chef of chefs) {
    const seenByChef = new Set<string>()

    for (const partner of chef.partners) {
      for (const location of partner.partner_locations) {
        const rawState = location.state?.trim()
        if (!rawState) continue

        const key = normalize(rawState)
        if (seenByChef.has(key)) continue

        seenByChef.add(key)

        if (!stateMap.has(key)) {
          stateMap.set(key, { label: rawState, chefs: new Set<string>() })
        }

        stateMap.get(key)?.chefs.add(chef.id)
      }
    }
  }

  return Array.from(stateMap.entries())
    .map(([value, { label, chefs: stateChefs }]) => ({
      value,
      label,
      count: stateChefs.size,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildPartnerTypeFacets(chefs: DirectoryChef[]): FacetOption[] {
  const partnerTypeMap = new Map<string, Set<string>>()

  for (const chef of chefs) {
    const seenByChef = new Set<string>()

    for (const partner of chef.partners) {
      const key = normalize(partner.partner_type)
      if (!key || seenByChef.has(key)) continue

      seenByChef.add(key)
      if (!partnerTypeMap.has(key)) {
        partnerTypeMap.set(key, new Set<string>())
      }
      partnerTypeMap.get(key)?.add(chef.id)
    }
  }

  return Array.from(partnerTypeMap.entries())
    .map(([value, chefIds]) => ({
      value,
      label: PARTNER_TYPE_LABELS[value] ?? 'Partner',
      count: chefIds.size,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildSearchHaystack(chef: DirectoryChef): string {
  const partnerText = chef.partners.flatMap((partner) => [
    partner.name,
    partner.description,
    ...partner.partner_locations.flatMap((location) => [
      location.name,
      location.city,
      location.state,
    ]),
  ])

  return [chef.display_name, chef.tagline, chef.bio, ...partnerText]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

function hasStateCoverage(chef: DirectoryChef, stateFilter: string): boolean {
  if (!stateFilter) return true

  return chef.partners.some((partner) =>
    partner.partner_locations.some((location) => normalize(location.state) === stateFilter)
  )
}

function hasPartnerType(chef: DirectoryChef, partnerTypeFilter: string): boolean {
  if (!partnerTypeFilter) return true

  return chef.partners.some((partner) => normalize(partner.partner_type) === partnerTypeFilter)
}

function sortChefs(chefs: DirectoryChef[], sortMode: SortMode): DirectoryChef[] {
  const sorted = [...chefs]

  if (sortMode === 'alpha') {
    sorted.sort((a, b) => a.display_name.localeCompare(b.display_name))
    return sorted
  }

  if (sortMode === 'partners') {
    sorted.sort((a, b) => {
      const byPartnerCount = b.partners.length - a.partners.length
      if (byPartnerCount !== 0) return byPartnerCount
      return a.display_name.localeCompare(b.display_name)
    })
    return sorted
  }

  sorted.sort((a, b) => {
    if (a.is_founder !== b.is_founder) return a.is_founder ? -1 : 1

    const byPartnerCount = b.partners.length - a.partners.length
    if (byPartnerCount !== 0) return byPartnerCount

    return a.display_name.localeCompare(b.display_name)
  })

  return sorted
}

function getChefCoverage(chef: DirectoryChef): string[] {
  const uniqueCoverage = new Set<string>()

  for (const partner of chef.partners) {
    for (const location of partner.partner_locations) {
      const cityState = [location.city, location.state].filter(Boolean).join(', ').trim()
      if (cityState) uniqueCoverage.add(cityState)
    }
  }

  return Array.from(uniqueCoverage)
}

function PartnerPill({ partner }: { partner: DirectoryPartner }) {
  const locations = partner.partner_locations
  const cityState =
    locations.length > 0 ? [locations[0].city, locations[0].state].filter(Boolean).join(', ') : null

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-stone-800 px-3 py-2">
      {partner.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.cover_image_url}
          alt={partner.name}
          className="h-8 w-8 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-700 flex-shrink-0">
          <svg
            className="h-4 w-4 text-stone-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-stone-200 truncate">{partner.name}</p>
        {cityState && <p className="text-[11px] text-stone-300 truncate">{cityState}</p>}
      </div>
      <span className="flex-shrink-0 rounded-full bg-stone-700/70 px-2 py-0.5 text-[10px] font-medium text-stone-300">
        {PARTNER_TYPE_LABELS[partner.partner_type] || 'Partner'}
      </span>
    </div>
  )
}

function ChefTile({ chef }: { chef: DirectoryChef }) {
  const hasPartners = chef.partners.length > 0
  const visiblePartners = chef.partners.slice(0, 3)
  const extraCount = chef.partners.length - visiblePartners.length
  const coverage = getChefCoverage(chef)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 shadow-[0_2px_20px_rgb(0,0,0,0.06)] ring-1 ring-stone-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)] hover:ring-brand-600">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50">
        {chef.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chef.profile_image_url}
            alt={chef.display_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-7xl font-display text-brand-300">
              {chef.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="text-xl font-bold text-white drop-shadow-sm">{chef.display_name}</h2>
          {chef.tagline && (
            <p className="mt-0.5 text-sm text-white/85 truncate drop-shadow-sm">{chef.tagline}</p>
          )}
        </div>

        {chef.is_founder && (
          <div className="absolute top-4 right-4 rounded-full bg-stone-900/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-brand-400 shadow-sm">
            Featured
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {chef.bio && (
          <p className="text-sm leading-relaxed text-stone-300 line-clamp-2">{chef.bio}</p>
        )}

        {coverage.length > 0 && (
          <p className="mt-2 text-xs text-stone-400">
            Serves {coverage.slice(0, 2).join(' - ')}
            {coverage.length > 2 ? ` +${coverage.length - 2} more` : ''}
          </p>
        )}

        {hasPartners && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-300">
              Where I Cook
            </p>
            <div className="space-y-1.5">
              {visiblePartners.map((partner) => (
                <PartnerPill key={partner.id} partner={partner} />
              ))}
              {extraCount > 0 && (
                <p className="text-center text-[11px] text-stone-300">
                  + {extraCount} more venue{extraCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-5 flex gap-3">
          <TrackedLink
            href={`/chef/${chef.slug}/inquire`}
            analyticsName="directory_inquire"
            analyticsProps={{ chef_slug: chef.slug }}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
          >
            Inquire
          </TrackedLink>
          <TrackedLink
            href={`/chef/${chef.slug}`}
            analyticsName="directory_profile_view"
            analyticsProps={{ chef_slug: chef.slug }}
            className="rounded-xl border border-stone-700 px-4 py-3 text-center text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 hover:border-stone-600"
          >
            Profile
          </TrackedLink>
        </div>
      </div>
    </article>
  )
}

export default async function ChefDirectoryPage({ searchParams }: PageProps) {
  const allChefs = await getDiscoverableChefs()
  const stateFacets = buildStateFacets(allChefs)
  const partnerTypeFacets = buildPartnerTypeFacets(allChefs)

  const query = sanitizeQuery(firstParam(searchParams?.q))
  const requestedState = normalize(firstParam(searchParams?.state))
  const requestedPartnerType = normalize(firstParam(searchParams?.partnerType))
  const sortMode = parseSortMode(firstParam(searchParams?.sort))

  const stateFilter = stateFacets.some((option) => option.value === requestedState)
    ? requestedState
    : ''
  const partnerTypeFilter = partnerTypeFacets.some(
    (option) => option.value === requestedPartnerType
  )
    ? requestedPartnerType
    : ''

  const filteredChefs = allChefs.filter((chef) => {
    if (query && !buildSearchHaystack(chef).includes(query.toLowerCase())) return false
    if (!hasStateCoverage(chef, stateFilter)) return false
    if (!hasPartnerType(chef, partnerTypeFilter)) return false
    return true
  })

  const chefs = sortChefs(filteredChefs, sortMode)

  const selectedStateLabel =
    stateFacets.find((option) => option.value === stateFilter)?.label ?? null
  const selectedPartnerTypeLabel =
    partnerTypeFacets.find((option) => option.value === partnerTypeFilter)?.label ?? null
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? 'Featured first'

  const activeFilters: string[] = []
  if (query) activeFilters.push(`Query: "${query}"`)
  if (selectedStateLabel) activeFilters.push(`State: ${selectedStateLabel}`)
  if (selectedPartnerTypeLabel) activeFilters.push(`Partner Type: ${selectedPartnerTypeLabel}`)
  if (sortMode !== 'featured') activeFilters.push(`Sort: ${selectedSortLabel}`)

  const directoryStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ChefFlow Private Chef Directory',
    url: `${APP_URL}/chefs`,
    numberOfItems: allChefs.length,
    itemListElement: allChefs.slice(0, 50).map((chef, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: chef.display_name,
        url: `${APP_URL}/chef/${chef.slug}`,
        description: chef.tagline || chef.bio || 'Private chef listed on ChefFlow',
        areaServed: getChefCoverage(chef)
          .slice(0, 3)
          .map((coverage) => ({
            '@type': 'Place',
            name: coverage,
          })),
      },
    })),
  }

  return (
    <div className="min-h-screen bg-stone-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryStructuredData) }}
      />
      <DirectoryResultsTracker
        query={query}
        stateFilter={stateFilter}
        partnerTypeFilter={partnerTypeFilter}
        sortMode={sortMode}
        resultCount={chefs.length}
        totalCount={allChefs.length}
      />
      <ChefHero />

      <section className="mx-auto -mt-8 max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 p-4 shadow-lg backdrop-blur-sm sm:p-6">
          <DirectoryFiltersForm
            query={query}
            stateFilter={stateFilter}
            partnerTypeFilter={partnerTypeFilter}
            sortMode={sortMode}
            maxQueryLength={MAX_QUERY_LENGTH}
            stateOptions={stateFacets}
            partnerTypeOptions={partnerTypeFacets}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-brand-500">
            Showing {chefs.length} of {allChefs.length} vetted chef
            {allChefs.length !== 1 ? 's' : ''}
          </p>
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((filterValue) => (
                <span
                  key={filterValue}
                  className="rounded-full border border-stone-600 bg-stone-900 px-3 py-1 text-xs text-stone-300"
                >
                  {filterValue}
                </span>
              ))}
            </div>
          )}
        </div>

        {chefs.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="text-xl font-semibold text-stone-300">
              No chefs match these filters yet
            </h2>
            <p className="mt-2 text-stone-500 max-w-md mx-auto">
              Try broadening your location or partner-type filters, or reset everything and start
              over.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Link
                href="/chefs"
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Reset filters
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-stone-600 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                Contact ChefFlow
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {chefs.map((chef) => (
              <ChefTile key={chef.id} chef={chef} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-200">Every chef on ChefFlow is vetted</p>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
              We only list experienced chefs with strong service standards.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
