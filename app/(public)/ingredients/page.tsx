/**
 * /ingredients - Public ingredient knowledge browse page
 *
 * Searchable A-Z culinary encyclopedia powered by the ingredient knowledge layer.
 * Each card links to the full /ingredient/[slug] detail page.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PublicPageView
          pageName="ingredients"
          properties={{
            section: 'public_growth',
            entry_context: seasonalContext?.entryContext ?? 'direct',
            ...(seasonalAnalytics ?? { market_scope: marketScope }),
          }}
        />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-100 mb-2">Ingredient Guide</h1>
          <p className="text-stone-400 text-sm">
            {total.toLocaleString()} culinary ingredients with flavor profiles, origin, dietary
            info, and live pricing.
          </p>
        </div>

        {seasonalContext && (
          <div className="mb-8 rounded-2xl border border-stone-700 bg-stone-900/60 p-5 sm:p-6">
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

        {/* Category tabs */}
        {!q && categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.category}
                href={buildHref(`/ingredients/${c.category}`)}
                className="px-3 py-1.5 rounded-full text-xs border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors"
              >
                {c.label}
                <span className="ml-1 text-stone-600">({c.count})</span>
              </Link>
            ))}
          </div>
        )}

        {/* Search */}
        <form method="get" className="mb-8">
          {seasonalContext &&
            Array.from(seasonalContextParams!.entries()).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          <div className="relative max-w-md">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search ingredients..."
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-200 px-2 py-1"
            >
              Search
            </button>
          </div>
        </form>

        {/* Recently added - only on page 1, no search */}
        {recentlyAdded.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
              Recently Added
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {recentlyAdded.map((item) => (
                <Link
                  key={item.slug}
                  href={buildHref(`/ingredient/${item.slug}`)}
                  className="group flex flex-col items-center text-center gap-1.5"
                >
                  {item.imageUrl ? (
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-stone-800 border border-stone-800 group-hover:border-stone-600 transition-colors">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-xl bg-stone-800 border border-stone-800 flex items-center justify-center text-2xl">
                      🥬
                    </div>
                  )}
                  <span className="text-xs text-stone-300 group-hover:text-white leading-tight line-clamp-2">
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {items.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            {q ? `No ingredients found for "${q}".` : 'No enriched ingredients yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <Link
                key={item.slug}
                href={buildHref(`/ingredient/${item.slug}`)}
                className="group block rounded-xl border border-stone-800 bg-stone-900 hover:border-stone-600 hover:bg-stone-800/60 transition-colors overflow-hidden"
              >
                {/* Image */}
                {item.imageUrl ? (
                  <div className="w-full h-32 overflow-hidden bg-stone-800">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-stone-800 flex items-center justify-center">
                    <span className="text-4xl opacity-40">🥬</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-3">
                  <h2 className="text-sm font-semibold text-stone-100 group-hover:text-white mb-0.5 leading-tight">
                    {item.name}
                  </h2>
                  {item.category && (
                    <p className="text-xs text-stone-500 capitalize mb-2">{item.category}</p>
                  )}

                  {item.wikiSummary && (
                    <p className="text-xs text-stone-400 leading-relaxed line-clamp-2 mb-2">
                      {item.wikiSummary}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {item.dietaryFlags.slice(0, 2).map((f) => (
                      <span
                        key={f}
                        className="text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 px-1.5 py-0.5 rounded-full capitalize"
                      >
                        {f}
                      </span>
                    ))}
                    {item.flavorProfile && (
                      <span className="text-xs text-stone-600 capitalize self-center">
                        {item.flavorProfile.split(',')[0]}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(pageNum > 1 || hasMore) && (
          <div className="flex items-center justify-center gap-4 mt-10">
            {pageNum > 1 && (
              <Link
                href={buildHref('/ingredients', { q, page: String(pageNum - 1) })}
                className="px-4 py-2 text-sm rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-xs text-stone-500">
              Page {pageNum} of {Math.ceil(total / 48)}
            </span>
            {hasMore && (
              <Link
                href={buildHref('/ingredients', { q, page: String(pageNum + 1) })}
                className="px-4 py-2 text-sm rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
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
