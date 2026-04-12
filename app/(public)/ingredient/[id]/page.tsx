/**
 * /ingredient/[id] - Public shareable ingredient page
 *
 * Two modes:
 *   1. Full mode (id = openclaw canonical_ingredient_id): shows pricing + knowledge
 *   2. Knowledge-only mode (id = system_ingredient slug): shows encyclopedic data only
 *
 * Falls through to the knowledge slug lookup when no price data exists, so all
 * 1,500+ enriched ingredients are reachable as public pages even before OpenClaw
 * maps them to store prices.
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Globe, Leaf, Utensils } from 'lucide-react'
import {
  getPublicIngredientDetail,
  getPublicAlternatives,
} from '@/lib/openclaw/public-ingredient-queries'
import {
  getIngredientKnowledgeByName,
  getIngredientKnowledgeBySlug,
  getRelatedIngredients,
  INGREDIENT_CATEGORIES,
  type IngredientKnowledge,
  type CategoryIngredient,
} from '@/lib/openclaw/ingredient-knowledge-queries'
import { classifyFromCatalogDetail } from '@/lib/pricing/sourceability'
import { AvailabilityDetail, AvailabilityBadge } from '@/components/pricing/availability-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { CopyLinkButton } from './_components/copy-link-button'
import { IngredientSearch } from './_components/ingredient-search'
import type { CatalogDetailResult } from '@/lib/openclaw/catalog-types'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

// ---------------------------------------------------------------------------
// JSON-LD structured data helpers
// ---------------------------------------------------------------------------

function buildIngredientJsonLd(
  name: string,
  slug: string,
  knowledge: IngredientKnowledge | null | undefined,
  priceData?: { avgCents: number | null; standardUnit: string } | null
): object {
  const url = `${BASE_URL}/ingredient/${slug}`

  const sameAs: string[] = []
  if (knowledge?.wikipediaUrl) sameAs.push(knowledge.wikipediaUrl)
  if (knowledge?.wikidataQid) sameAs.push(`https://www.wikidata.org/wiki/${knowledge.wikidataQid}`)

  const thing: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name,
    url,
    ...(knowledge?.wikiSummary ? { description: knowledge.wikiSummary } : {}),
    ...(knowledge?.imageUrl ? { image: knowledge.imageUrl } : {}),
    ...(knowledge?.taxonName ? { alternateName: knowledge.taxonName } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }

  if (knowledge?.originCountries?.length) {
    thing.countryOfOrigin = knowledge.originCountries.map((c) => ({
      '@type': 'Country',
      name: c,
    }))
  }

  // NutritionInformation if available
  if (knowledge?.nutritionJson) {
    const n = (knowledge.nutritionJson as Record<string, unknown>)?.per_100g as Record<
      string,
      number
    > | null
    if (n) {
      const nutrition: Record<string, unknown> = {
        '@type': 'NutritionInformation',
        servingSize: '100 g',
      }
      if (n.calories_kcal != null) nutrition.calories = `${n.calories_kcal} calories`
      if (n.protein_g != null) nutrition.proteinContent = `${n.protein_g} g`
      if (n.carbs_g != null) nutrition.carbohydrateContent = `${n.carbs_g} g`
      if (n.fat_g != null) nutrition.fatContent = `${n.fat_g} g`
      if (n.fiber_g != null) nutrition.fiberContent = `${n.fiber_g} g`
      if (Object.keys(nutrition).length > 2) thing.nutrition = nutrition
    }
  }

  // Offer if we have price data
  if (priceData?.avgCents) {
    thing.offers = {
      '@type': 'Offer',
      price: (priceData.avgCents / 100).toFixed(2),
      priceCurrency: 'USD',
      unitText: priceData.standardUnit,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'ChefFlow' },
    }
  }

  return thing
}

function buildBreadcrumbJsonLd(name: string, slug: string, category?: string | null): object {
  const items: object[] = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'Ingredients', item: `${BASE_URL}/ingredients` },
  ]

  if (category) {
    const catLabel = INGREDIENT_CATEGORIES[category] ?? category
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: catLabel,
      item: `${BASE_URL}/ingredients/${category}`,
    })
    items.push({ '@type': 'ListItem', position: 4, name, item: `${BASE_URL}/ingredient/${slug}` })
  } else {
    items.push({ '@type': 'ListItem', position: 3, name, item: `${BASE_URL}/ingredient/${slug}` })
  }

  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }
}

function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params

  // Try full mode first
  const detail = await getPublicIngredientDetail(id).catch(() => null)
  if (detail) {
    const know = await getIngredientKnowledgeByName(detail.ingredient.name).catch(() => null)
    const sourceability = classifyFromCatalogDetail(detail)
    const descParts: string[] = []
    if (know?.wikiSummary) descParts.push(know.wikiSummary)
    else descParts.push(`${sourceability.label}: ${sourceability.description}`)
    if (detail.summary.storeCount > 0)
      descParts.push(`Real prices from ${detail.summary.storeCount} stores.`)
    if (know?.originCountries?.length)
      descParts.push(`Origin: ${know.originCountries.slice(0, 2).join(', ')}.`)
    const description = descParts.join(' ').slice(0, 160)
    return {
      title: `${detail.ingredient.name} - Ingredient Guide`,
      description,
      openGraph: {
        title: `${detail.ingredient.name} - Ingredient Guide`,
        description,
        ...(know?.imageUrl
          ? { images: [{ url: know.imageUrl, alt: detail.ingredient.name }] }
          : {}),
      },
      twitter: {
        card: 'summary',
        title: detail.ingredient.name,
        description,
        ...(know?.imageUrl ? { images: [know.imageUrl] } : {}),
      },
    }
  }

  // Fall back to knowledge slug
  const slugResult = await getIngredientKnowledgeBySlug(id).catch(() => null)
  if (!slugResult) return { title: 'Ingredient not found' }

  const { name, knowledge: k } = slugResult
  const description = (k.wikiSummary ?? `${name} - culinary ingredient guide.`).slice(0, 160)
  return {
    title: `${name} - Ingredient Guide`,
    description,
    openGraph: {
      title: `${name} - Ingredient Guide`,
      description,
      ...(k.imageUrl ? { images: [{ url: k.imageUrl, alt: name }] } : {}),
    },
    twitter: {
      card: 'summary',
      title: name,
      description,
      ...(k.imageUrl ? { images: [k.imageUrl] } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IngredientPage({ params }: Params) {
  const { id } = await params

  // --- Full mode: canonical ingredient with price data ---
  const detail = await getPublicIngredientDetail(id).catch(() => null)

  if (detail) {
    return <FullIngredientPage id={id} detail={detail} />
  }

  // --- Knowledge-only mode: system_ingredient slug ---
  const slugResult = await getIngredientKnowledgeBySlug(id).catch(() => null)
  if (!slugResult) notFound()

  const related = slugResult.category
    ? await getRelatedIngredients(slugResult.category, id, 4).catch(() => [])
    : []

  return (
    <KnowledgeOnlyPage
      id={id}
      name={slugResult.name}
      category={slugResult.category}
      knowledge={slugResult.knowledge}
      related={related}
    />
  )
}

// ---------------------------------------------------------------------------
// Full page (price data + knowledge)
// ---------------------------------------------------------------------------

async function FullIngredientPage({ id, detail }: { id: string; detail: CatalogDetailResult }) {
  const sourceability = classifyFromCatalogDetail(detail)

  const categorySlug = detail.ingredient.category ?? null
  const [knowledge, alternatives, related] = await Promise.all([
    getIngredientKnowledgeByName(detail.ingredient.name).catch(() => null),
    sourceability.classification !== 'readily_available'
      ? getPublicAlternatives(detail.ingredient.category, detail.ingredient.id, 4).catch(() => [])
      : Promise.resolve([]),
    categorySlug ? getRelatedIngredients(categorySlug, id, 4).catch(() => []) : Promise.resolve([]),
  ])

  const representativePrice =
    detail.prices.find((p) => p.inStock && p.imageUrl) ??
    detail.prices.find((p) => p.imageUrl) ??
    detail.prices[0] ??
    null

  const pageUrl = `/ingredient/${id}`

  const mostRecentDate =
    detail.prices.length > 0
      ? detail.prices.reduce((a, b) =>
          new Date(a.lastConfirmedAt) > new Date(b.lastConfirmedAt) ? a : b
        ).lastConfirmedAt
      : null

  return (
    <>
      <JsonLd
        data={buildIngredientJsonLd(detail.ingredient.name, id, knowledge, {
          avgCents: detail.summary.avgCents,
          standardUnit: detail.ingredient.standardUnit,
        })}
      />
      <JsonLd data={buildBreadcrumbJsonLd(detail.ingredient.name, id, categorySlug)} />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/chefs"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to ChefFlow
          </Link>
        </div>

        <div className="mb-8">
          <IngredientSearch currentId={id} />
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-stone-800">
            <div className="flex items-start gap-4">
              {(knowledge?.imageUrl ?? representativePrice?.imageUrl) ? (
                <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-stone-800 border border-stone-700">
                  <img
                    src={knowledge?.imageUrl ?? representativePrice?.imageUrl ?? ''}
                    alt={detail.ingredient.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                  <span className="text-2xl">🥬</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">
                  {detail.ingredient.category}
                </p>
                <h1 className="text-2xl font-bold text-stone-100 leading-tight">
                  {detail.ingredient.name}
                </h1>
                <p className="text-sm text-stone-500 mt-0.5">
                  Standard unit: {detail.ingredient.standardUnit}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <AvailabilityBadge report={sourceability} variant="full" />
            </div>
          </div>

          {/* Pricing summary */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-stone-800">
            <PricingCell
              label="Lowest price"
              value={
                detail.summary.cheapestCents
                  ? `${formatCurrency(detail.summary.cheapestCents)} / ${detail.ingredient.standardUnit}`
                  : 'N/A'
              }
              sub={detail.summary.cheapestStore ?? undefined}
            />
            <PricingCell
              label="Average price"
              value={
                detail.summary.avgCents
                  ? `${formatCurrency(detail.summary.avgCents)} / ${detail.ingredient.standardUnit}`
                  : 'N/A'
              }
              sub={`across ${detail.summary.storeCount} ${detail.summary.storeCount === 1 ? 'store' : 'stores'}`}
            />
          </div>

          {/* Availability detail */}
          <div className="px-6 py-5 border-b border-stone-800">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
              Sourcing Analysis
            </h2>
            <AvailabilityDetail report={sourceability} />
            {mostRecentDate && (
              <p className="mt-2 text-xs text-stone-600">
                Data last updated:{' '}
                {new Date(mostRecentDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Store prices */}
          {detail.prices.length > 0 && (
            <div className="px-6 py-5 border-b border-stone-800">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Price by Store
              </h2>
              <div className="space-y-2">
                {detail.prices.slice(0, 5).map((price, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg bg-stone-800/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-200 truncate">{price.store}</p>
                      {(price.storeCity || price.storeState) && (
                        <p className="text-xs text-stone-500">
                          {[price.storeCity, price.storeState].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-stone-100">
                        {formatCurrency(price.priceCents)}
                      </p>
                      <p className="text-xs text-stone-500">per {price.priceUnit}</p>
                    </div>
                    <InStockDot inStock={price.inStock} />
                  </div>
                ))}
              </div>
              {detail.prices.length > 5 && (
                <p className="mt-2 text-xs text-stone-600">
                  + {detail.prices.length - 5} more stores
                </p>
              )}
            </div>
          )}

          {/* Knowledge panel */}
          {knowledge && <KnowledgePanel knowledge={knowledge} />}

          {/* More from this category */}
          {related.length > 0 && categorySlug && (
            <div className="px-6 py-5 border-b border-stone-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                  More {INGREDIENT_CATEGORIES[categorySlug] ?? categorySlug}
                </h2>
                <Link
                  href={`/ingredients/${categorySlug}`}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-1.5">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/ingredient/${r.slug}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-800/60 transition-colors group"
                  >
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.name}
                        className="h-8 w-8 rounded object-cover shrink-0 bg-stone-800"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-stone-800 shrink-0 flex items-center justify-center text-sm">
                        🥬
                      </div>
                    )}
                    <span className="text-sm text-stone-300 group-hover:text-stone-100">
                      {r.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div className="px-6 py-5 border-b border-stone-800">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                {sourceability.classification === 'hard_to_source'
                  ? 'Closest Alternatives'
                  : 'Related Ingredients'}
              </h2>
              <div className="space-y-2">
                {alternatives.map((alt) => (
                  <Link
                    key={alt.id}
                    href={`/ingredient/${alt.id}`}
                    className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/40 px-3 py-2.5 hover:bg-stone-800 hover:border-stone-600 transition-colors group"
                  >
                    <span className="text-sm text-stone-300 group-hover:text-stone-100 font-medium">
                      {alt.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {alt.bestPriceCents && (
                        <span className="text-xs text-stone-400">
                          {formatCurrency(alt.bestPriceCents)}/{alt.bestPriceUnit}
                        </span>
                      )}
                      <ExternalLink className="h-3 w-3 text-stone-600 group-hover:text-stone-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Chef CTA */}
          <ChefCta category={categorySlug} />

          {/* Share */}
          <div className="px-6 py-5 bg-stone-900/50">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
              Share This Ingredient
            </h2>
            <p className="text-xs text-stone-500 mb-3 leading-relaxed">
              This link shows the same ingredient data to anyone who opens it. Share it with a
              client, another chef, or a supplier.
            </p>
            <CopyLinkButton path={pageUrl} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-700">
          Prices are scraped from local grocery stores and updated periodically. Not affiliated with
          any retailer.
        </p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Knowledge-only page (no price data)
// ---------------------------------------------------------------------------

function KnowledgeOnlyPage({
  id,
  name,
  category,
  knowledge,
  related,
}: {
  id: string
  name: string
  category: string | null
  knowledge: IngredientKnowledge
  related: CategoryIngredient[]
}) {
  return (
    <>
      <JsonLd data={buildIngredientJsonLd(name, id, knowledge)} />
      <JsonLd data={buildBreadcrumbJsonLd(name, id, category)} />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/chefs"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to ChefFlow
          </Link>
        </div>

        <div className="mb-8">
          <IngredientSearch currentId={id} />
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-stone-800">
            <div className="flex items-start gap-4">
              {knowledge.imageUrl ? (
                <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-stone-800 border border-stone-700">
                  <img src={knowledge.imageUrl} alt={name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                  <span className="text-2xl">🥬</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                {category && (
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">{category}</p>
                )}
                <h1 className="text-2xl font-bold text-stone-100 leading-tight">{name}</h1>
                {knowledge.taxonName && (
                  <p className="text-xs text-stone-600 italic mt-0.5">{knowledge.taxonName}</p>
                )}
              </div>
            </div>
          </div>

          {/* No pricing note */}
          <div className="px-6 py-3 bg-stone-950/40 border-b border-stone-800">
            <p className="text-xs text-stone-600">
              Live price data not yet available for this ingredient.
            </p>
          </div>

          {/* Knowledge panel */}
          <KnowledgePanel knowledge={knowledge} />

          {/* More from this category */}
          {related.length > 0 && category && (
            <div className="px-6 py-5 border-b border-stone-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                  More {INGREDIENT_CATEGORIES[category] ?? category}
                </h2>
                <Link
                  href={`/ingredients/${category}`}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-1.5">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/ingredient/${r.slug}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-800/60 transition-colors group"
                  >
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.name}
                        className="h-8 w-8 rounded object-cover shrink-0 bg-stone-800"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-stone-800 shrink-0 flex items-center justify-center text-sm">
                        🥬
                      </div>
                    )}
                    <span className="text-sm text-stone-300 group-hover:text-stone-100">
                      {r.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Chef CTA */}
          <ChefCta category={category} />

          {/* Share */}
          <div className="px-6 py-5 bg-stone-900/50">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
              Share This Ingredient
            </h2>
            <CopyLinkButton path={`/ingredient/${id}`} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-700">
          Encyclopedic data sourced from Wikipedia and USDA FoodData Central.
        </p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Shared knowledge panel (used in both page modes)
// ---------------------------------------------------------------------------

function KnowledgePanel({ knowledge }: { knowledge: IngredientKnowledge }) {
  const hasContent =
    knowledge.wikiSummary ||
    knowledge.originCountries.length > 0 ||
    knowledge.flavorProfile ||
    knowledge.culinaryUses ||
    knowledge.dietaryFlags.length > 0 ||
    knowledge.typicalPairings.length > 0

  if (!hasContent) return null

  return (
    <div className="px-6 py-5 border-b border-stone-800">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        About This Ingredient
      </h2>

      {knowledge.wikiSummary && (
        <p className="text-sm text-stone-300 leading-relaxed mb-4">{knowledge.wikiSummary}</p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {knowledge.originCountries.length > 0 && (
          <div className="flex items-start gap-2.5">
            <Globe className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Origin</p>
              <p className="text-sm text-stone-300">{knowledge.originCountries.join(', ')}</p>
            </div>
          </div>
        )}

        {knowledge.flavorProfile && (
          <div className="flex items-start gap-2.5">
            <Utensils className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Flavor</p>
              <p className="text-sm text-stone-300 capitalize">{knowledge.flavorProfile}</p>
            </div>
          </div>
        )}

        {knowledge.culinaryUses && (
          <div className="flex items-start gap-2.5">
            <Leaf className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Used for</p>
              <p className="text-sm text-stone-300 capitalize">{knowledge.culinaryUses}</p>
            </div>
          </div>
        )}

        {knowledge.dietaryFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {knowledge.dietaryFlags.map((flag) => (
              <span
                key={flag}
                className="px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-800/60 text-xs text-emerald-400 capitalize"
              >
                {flag}
              </span>
            ))}
          </div>
        )}

        {knowledge.typicalPairings.length > 0 && (
          <div className="mt-1">
            <p className="text-xs text-stone-500 mb-1.5">Pairs well with</p>
            <div className="flex flex-wrap gap-1.5">
              {knowledge.typicalPairings.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-xs text-stone-300 capitalize"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {knowledge.taxonName && (
          <p className="text-xs text-stone-600 italic mt-1">{knowledge.taxonName}</p>
        )}
      </div>

      {/* Nutrition snapshot */}
      {knowledge.nutritionJson &&
        (() => {
          const n = (knowledge.nutritionJson as any)?.per_100g ?? {}
          const entries = [
            {
              label: 'Calories',
              value: n.calories_kcal != null ? `${n.calories_kcal} kcal` : null,
            },
            { label: 'Protein', value: n.protein_g != null ? `${n.protein_g}g` : null },
            { label: 'Carbs', value: n.carbs_g != null ? `${n.carbs_g}g` : null },
            { label: 'Fat', value: n.fat_g != null ? `${n.fat_g}g` : null },
            { label: 'Fiber', value: n.fiber_g != null ? `${n.fiber_g}g` : null },
          ].filter((e) => e.value !== null)

          if (!entries.length) return null
          return (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-xs text-stone-500 mb-2">Per 100g (USDA)</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {entries.map((e) => (
                  <span key={e.label} className="text-xs text-stone-400">
                    <span className="text-stone-500">{e.label}: </span>
                    {e.value}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

      {knowledge.wikipediaUrl && (
        <a
          href={knowledge.wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-1 text-xs text-stone-600 hover:text-stone-400 transition-colors w-fit"
        >
          <ExternalLink className="h-3 w-3" />
          Wikipedia
        </a>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PricingCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-stone-100">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function InStockDot({ inStock }: { inStock: boolean }) {
  return (
    <div
      className={`h-2 w-2 rounded-full shrink-0 ${inStock ? 'bg-emerald-500' : 'bg-red-500/60'}`}
      title={inStock ? 'In stock' : 'Out of stock'}
    />
  )
}

// ---------------------------------------------------------------------------
// Booking CTA - connects ingredient discovery to the chef marketplace
// ---------------------------------------------------------------------------

const CATEGORY_CTA: Record<string, { headline: string; sub: string }> = {
  produce: {
    headline: 'Plan an event around seasonal produce',
    sub: 'Private chefs on ChefFlow source fresh, seasonal ingredients and build menus around what is at peak quality.',
  },
  protein: {
    headline: 'Source and cook proteins the right way',
    sub: 'ChefFlow chefs handle everything from sourcing to prep. Browse chefs who specialize in meat and seafood.',
  },
  fresh_herb: {
    headline: 'Bring fresh herbs to your table',
    sub: 'Private chefs who work with fresh herbs can elevate any meal. Find one near you on ChefFlow.',
  },
  spice: {
    headline: 'Explore global spice-driven cuisine',
    sub: 'Book a private chef who knows how to build depth with spices, from aromatic rubs to complex sauces.',
  },
  dairy: {
    headline: 'From farm to table with quality dairy',
    sub: 'Chefs on ChefFlow know how to work with fine dairy - fresh cheeses, cultured butters, and more.',
  },
  baking: {
    headline: 'Artisan baking for your next event',
    sub: 'Looking for a pastry chef or baker? Browse ChefFlow chefs who specialize in baked goods and desserts.',
  },
  specialty: {
    headline: 'Specialty ingredients deserve an expert hand',
    sub: 'Rare and specialty ingredients are best cooked by chefs who know how to use them. Find one on ChefFlow.',
  },
  alcohol: {
    headline: 'Elevate your event with culinary pairings',
    sub: 'A private chef can build a menu designed to complement your drinks. Book a pairing dinner on ChefFlow.',
  },
  pantry: {
    headline: 'Quality pantry staples, expert technique',
    sub: 'ChefFlow chefs know how to transform pantry ingredients into exceptional meals.',
  },
}

const DEFAULT_CTA = {
  headline: 'Planning an event around quality ingredients?',
  sub: 'Private chefs on ChefFlow source ingredients you choose and cook them exactly how you want.',
}

function ChefCta({ category }: { category: string | null }) {
  const cta = (category && CATEGORY_CTA[category]) || DEFAULT_CTA
  return (
    <div className="px-6 py-5 border-b border-stone-800 bg-stone-950/40">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
        Hire a Private Chef
      </p>
      <p className="text-sm font-semibold text-stone-100 mb-1">{cta.headline}</p>
      <p className="text-xs text-stone-400 leading-relaxed mb-4">{cta.sub}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-900 hover:bg-white transition-colors"
        >
          Book a Chef
        </Link>
        <Link
          href="/chefs"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-4 py-2 text-xs font-medium text-stone-300 hover:border-stone-500 hover:text-stone-100 transition-colors"
        >
          Browse Chefs
        </Link>
      </div>
    </div>
  )
}
