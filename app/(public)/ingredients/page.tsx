/**
 * /ingredients - Public ingredient knowledge browse page
 *
 * Searchable A-Z culinary encyclopedia powered by the ingredient knowledge layer.
 * Each card links to the full /ingredient/[slug] detail page.
 * Grouped by category with food imagery and seasonal highlights.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { pgClient } from '@/lib/db'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_MARKET_SCOPE } from '@/lib/public/public-market-scope'
import {
  buildPublicSeasonalMarketPulseSearchParamsFromContext,
  readPublicSeasonalMarketPulseContext,
} from '@/lib/public/public-seasonal-market-pulse'
import {
  getIngredientCategories,
  getRecentlyEnrichedIngredients,
  INGREDIENT_CATEGORIES,
  type CategoryIngredient,
} from '@/lib/openclaw/ingredient-knowledge-queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Ingredient Guide',
  description:
    'Browse our culinary ingredient database: flavor profiles, origin, dietary info, and live pricing for thousands of ingredients used by professional chefs.',
  openGraph: {
    title: 'Ingredient Guide',
    description:
      'Browse flavor profiles, origin, dietary info, and live pricing for thousands of culinary ingredients.',
    url: `${BASE_URL}/ingredients`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Ingredient Guide',
    description:
      'Browse flavor profiles, origin, dietary info, and live pricing for thousands of culinary ingredients.',
  },
  alternates: {
    canonical: `${BASE_URL}/ingredients`,
  },
}

// ---------------------------------------------------------------------------
// Category emoji mapping for visual flair when no image exists
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<string, string> = {
  produce: '🥦',
  protein: '🥩',
  pantry: '🫙',
  baking: '🧁',
  dairy: '🧀',
  beverage: '☕',
  oil: '🫒',
  canned: '🥫',
  specialty: '✨',
  frozen: '🧊',
  alcohol: '🍷',
  condiment: '🫗',
  spice: '🌶️',
  fresh_herb: '🌿',
  other: '🍴',
}

// Category gradient backgrounds for cards without images
const CATEGORY_GRADIENTS: Record<string, string> = {
  produce: 'from-emerald-950/60 to-emerald-900/20',
  protein: 'from-red-950/60 to-red-900/20',
  pantry: 'from-amber-950/60 to-amber-900/20',
  baking: 'from-pink-950/60 to-pink-900/20',
  dairy: 'from-sky-950/60 to-sky-900/20',
  beverage: 'from-teal-950/60 to-teal-900/20',
  oil: 'from-lime-950/60 to-lime-900/20',
  canned: 'from-orange-950/60 to-orange-900/20',
  specialty: 'from-purple-950/60 to-purple-900/20',
  frozen: 'from-sky-950/60 to-sky-900/20',
  alcohol: 'from-rose-950/60 to-rose-900/20',
  condiment: 'from-yellow-950/60 to-yellow-900/20',
  spice: 'from-red-950/60 to-red-900/20',
  fresh_herb: 'from-emerald-950/60 to-emerald-900/20',
  other: 'from-stone-800/60 to-stone-800/20',
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type IngredientEntry = {
  slug: string
  name: string
  category: string | null
  wikiSummary: string | null
  flavorProfile: string | null
  dietaryFlags: string[]
  imageUrl: string | null
  originCountries: string[]
}

async function getIngredients(
  search: string,
  offset: number
): Promise<{
  items: IngredientEntry[]
  total: number
  hasMore: boolean
}> {
  const PAGE = 48
  const q = search.trim()

  const rows =
    q.length >= 2
      ? await pgClient`
        SELECT
          iks.slug, si.name, si.category,
          k.wiki_summary, k.flavor_profile, k.dietary_flags,
          k.image_url, k.origin_countries,
          COUNT(*) OVER() AS total_count
        FROM ingredient_knowledge_slugs iks
        JOIN system_ingredients si ON si.id = iks.system_ingredient_id
        JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
        WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
          AND si.name ILIKE ${'%' + q + '%'}
        ORDER BY si.name ASC
        LIMIT ${PAGE} OFFSET ${offset}
      `
      : await pgClient`
        SELECT
          iks.slug, si.name, si.category,
          k.wiki_summary, k.flavor_profile, k.dietary_flags,
          k.image_url, k.origin_countries,
          COUNT(*) OVER() AS total_count
        FROM ingredient_knowledge_slugs iks
        JOIN system_ingredients si ON si.id = iks.system_ingredient_id
        JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
        WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
        ORDER BY si.name ASC
        LIMIT ${PAGE} OFFSET ${offset}
      `

  const total = (rows as any[]).length > 0 ? Number((rows as any[])[0].total_count) : 0

  return {
    total,
    hasMore: offset + PAGE < total,
    items: (rows as any[]).map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category ?? null,
      wikiSummary: r.wiki_summary ?? null,
      flavorProfile: r.flavor_profile ?? null,
      dietaryFlags: (r.dietary_flags as string[]) ?? [],
      imageUrl: r.image_url ?? null,
      originCountries: (r.origin_countries as string[]) ?? [],
    })),
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IngredientsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const qParam = resolvedSearchParams.q
  const pageParam = resolvedSearchParams.page
  const q = typeof qParam === 'string' ? qParam : Array.isArray(qParam) ? (qParam[0] ?? '') : ''
  const page =
    typeof pageParam === 'string'
      ? pageParam
      : Array.isArray(pageParam)
        ? (pageParam[0] ?? '1')
        : '1'
  const pageNum = Math.max(1, parseInt(page) || 1)
  const offset = (pageNum - 1) * 48
  const seasonalContext = readPublicSeasonalMarketPulseContext(resolvedSearchParams)
  const seasonalContextParams = seasonalContext
    ? buildPublicSeasonalMarketPulseSearchParamsFromContext(seasonalContext)
    : null
  const marketScope = seasonalContext?.scope.label ?? PUBLIC_MARKET_SCOPE
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
    : null

  function buildHref(
    pathname: string,
    extraParams: Record<string, string | number | undefined> = {}
  ) {
    const params = new URLSearchParams()

    if (seasonalContext) {
      for (const [key, value] of seasonalContextParams!.entries()) {
        params.set(key, value)
      }
    }

    for (const [key, value] of Object.entries(extraParams)) {
      if (value == null) continue
      const normalized = String(value).trim()
      if (!normalized) continue
      params.set(key, normalized)
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const [{ items, total, hasMore }, categories, recentlyAdded] = await Promise.all([
    getIngredients(q, offset).catch(() => ({ items: [], total: 0, hasMore: false })),
    getIngredientCategories().catch(() => []),
    !q && pageNum === 1 ? getRecentlyEnrichedIngredients(8).catch(() => []) : Promise.resolve([]),
  ])

  // Group items by category for sectioned display (only when not searching)
  const grouped = !q
    ? items.reduce<Record<string, IngredientEntry[]>>((acc, item) => {
        const cat = item.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
      }, {})
    : null

  // Sort category groups by count descending
  const sortedCategories = grouped
    ? Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)
    : null

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Ingredient Guide',
    url: `${BASE_URL}/ingredients`,
    description:
      'Culinary ingredient encyclopedia with flavor profiles, origin, dietary info, and live pricing.',
    numberOfItems: total,
    publisher: { '@type': 'Organization', name: 'ChefFlow', url: BASE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Ingredient Guide',
          item: `${BASE_URL}/ingredients`,
        },
      ],
    },
  }

  return (
    <>
      <JsonLd data={collectionLd} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <PublicPageView
          pageName="ingredients"
          properties={{
            section: 'public_growth',
            entry_context: seasonalContext?.entryContext ?? 'direct',
            ...(seasonalAnalytics ?? { market_scope: marketScope }),
          }}
        />

        {/* Hero header */}
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-stone-100 mb-3 tracking-tight">
            Ingredient Guide
          </h1>
          <p className="text-stone-400 text-lg max-w-2xl">
            {total.toLocaleString()} culinary ingredients with flavor profiles, origin, dietary
            info, and live pricing.
          </p>
        </div>

        {/* Seasonal context banner */}
        {seasonalContext && (
          <div className="mb-10 rounded-2xl border border-stone-700 bg-gradient-to-br from-emerald-950/30 via-stone-900/60 to-stone-900 p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {seasonalContext.summary.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-100">
              {seasonalContext.summary.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">{seasonalContext.summary.body}</p>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              {seasonalContext.summary.sourceNote} {seasonalContext.summary.scopeNote}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <TrackedLink
                href={buildHref('/book')}
                analyticsName="ingredients_market_note_book"
                analyticsProps={{
                  section: 'market_note_continuity',
                  ...(seasonalAnalytics ?? {}),
                }}
                className="inline-flex items-center justify-center rounded-xl gradient-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                Carry This Note Into Booking
              </TrackedLink>
            </div>
          </div>
        )}

        {/* Recently added - hero gallery with images */}
        {recentlyAdded.length > 0 && (
          <div className="mb-12">
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-lg font-semibold text-stone-100">Fresh Additions</h2>
              <span className="text-xs text-stone-500">Recently enriched</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {recentlyAdded.map((item) => (
                <Link
                  key={item.slug}
                  href={buildHref(`/ingredient/${item.slug}`)}
                  className="group flex flex-col items-center text-center gap-2"
                >
                  {item.imageUrl ? (
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-stone-800 border-2 border-stone-700/50 group-hover:border-brand-500/40 transition-all duration-300 shadow-lg group-hover:shadow-brand-500/10">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 border-2 border-stone-700/50 flex items-center justify-center text-3xl group-hover:border-brand-500/40 transition-colors">
                      🥬
                    </div>
                  )}
                  <span className="text-xs font-medium text-stone-300 group-hover:text-white leading-tight line-clamp-2 transition-colors">
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        <form method="get" className="mb-8">
          {seasonalContext &&
            Array.from(seasonalContextParams!.entries()).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          <div className="relative max-w-lg">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search ingredients..."
              className="w-full bg-stone-900/80 border border-stone-700 rounded-xl pl-12 pr-20 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-900 bg-brand-500 hover:bg-brand-400 rounded-lg px-3 py-1.5 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category filter chips */}
        {!q && categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.category}
                href={buildHref(`/ingredients/${c.category}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-stone-700 bg-stone-800/50 text-stone-300 hover:border-brand-500/40 hover:bg-stone-800 hover:text-stone-100 transition-all duration-200"
              >
                <span>{CATEGORY_EMOJI[c.category] ?? '🍴'}</span>
                <span className="font-medium">{c.label}</span>
                <span className="text-stone-500 text-xs">({c.count})</span>
              </Link>
            ))}
          </div>
        )}

        {/* Results */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            <span className="text-4xl block mb-4">🔍</span>
            {q ? `No ingredients found for "${q}".` : 'No enriched ingredients yet.'}
          </div>
        ) : sortedCategories ? (
          /* Grouped by category */
          <div className="space-y-12">
            {sortedCategories.map(([category, categoryItems]) => (
              <section key={category}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{CATEGORY_EMOJI[category] ?? '🍴'}</span>
                  <h2 className="text-xl font-semibold text-stone-100">
                    {INGREDIENT_CATEGORIES[category] ?? category}
                  </h2>
                  <span className="text-xs text-stone-500 bg-stone-800/60 px-2 py-0.5 rounded-full">
                    {categoryItems.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryItems.map((item) => (
                    <IngredientCard key={item.slug} item={item} buildHref={buildHref} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Flat grid for search results */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <IngredientCard key={item.slug} item={item} buildHref={buildHref} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {(pageNum > 1 || hasMore) && (
          <div className="flex items-center justify-center gap-4 mt-12">
            {pageNum > 1 && (
              <Link
                href={buildHref('/ingredients', { q, page: String(pageNum - 1) })}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 hover:border-stone-600 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-stone-500">
              Page {pageNum} of {Math.ceil(total / 48)}
            </span>
            {hasMore && (
              <Link
                href={buildHref('/ingredients', { q, page: String(pageNum + 1) })}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 hover:border-stone-600 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}

        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.ingredients}
          theme="dark"
        />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Ingredient card component
// ---------------------------------------------------------------------------

function IngredientCard({
  item,
  buildHref,
}: {
  item: IngredientEntry
  buildHref: (pathname: string, extra?: Record<string, string | number | undefined>) => string
}) {
  const category = item.category || 'other'
  const gradient = CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.other

  return (
    <Link
      href={buildHref(`/ingredient/${item.slug}`)}
      className="group block rounded-2xl border border-stone-800 bg-stone-900 hover:border-stone-600 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 overflow-hidden"
    >
      {/* Image or category gradient placeholder */}
      {item.imageUrl ? (
        <div className="w-full h-44 overflow-hidden bg-stone-800 relative">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />
        </div>
      ) : (
        <div
          className={`w-full h-44 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}
        >
          <span className="text-5xl opacity-50 group-hover:opacity-70 transition-all duration-300">
            {CATEGORY_EMOJI[category] ?? '🍴'}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-stone-100 group-hover:text-white mb-1 leading-snug">
          {item.name}
        </h3>
        {item.category && (
          <p className="text-xs text-stone-500 capitalize mb-2.5 flex items-center gap-1.5">
            <span className="text-sm">{CATEGORY_EMOJI[item.category] ?? '🍴'}</span>
            {INGREDIENT_CATEGORIES[item.category] ?? item.category}
          </p>
        )}

        {item.wikiSummary && (
          <p className="text-sm text-stone-400 leading-relaxed line-clamp-2 mb-3">
            {item.wikiSummary}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {item.dietaryFlags.slice(0, 3).map((f) => (
            <span
              key={f}
              className="text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded-full capitalize"
            >
              {f}
            </span>
          ))}
          {item.flavorProfile && (
            <span className="text-xs text-stone-500 capitalize self-center italic">
              {item.flavorProfile.split(',')[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
