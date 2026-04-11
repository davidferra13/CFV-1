/**
 * /ingredients/[category] - Category landing pages for the ingredient encyclopedia.
 *
 * One page per ingredient category (produce, protein, pantry, etc.).
 * Statically generated at build time. Each page links back to /ingredients
 * and to individual /ingredient/[slug] pages.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  INGREDIENT_CATEGORIES,
  getIngredientCategories,
  getIngredientsByCategory,
  type CategoryIngredient,
} from '@/lib/openclaw/ingredient-knowledge-queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const PAGE_SIZE = 96

type Params = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}

// ---------------------------------------------------------------------------
// Static params - pre-render all known categories (page 1)
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const cats = await getIngredientCategories().catch(() => [])
  return cats.map((c) => ({ category: c.category }))
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params
  const label = INGREDIENT_CATEGORIES[category]
  if (!label) return { title: 'Ingredients | ChefFlow' }

  const description = `Browse ${label.toLowerCase()} ingredients with flavor profiles, origin stories, dietary info, and live market pricing from local stores.`

  return {
    title: `${label} Ingredients | ChefFlow`,
    description,
    openGraph: {
      title: `${label} Ingredients | ChefFlow`,
      description,
      url: `${BASE_URL}/ingredients/${category}`,
      type: 'website',
    },
    alternates: {
      canonical: `${BASE_URL}/ingredients/${category}`,
    },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CategoryPage({ params, searchParams }: Params) {
  const { category } = await params
  const { page = '1' } = await searchParams
  const label = INGREDIENT_CATEGORIES[category]
  if (!label) notFound()

  const pageNum = Math.max(1, parseInt(page) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [{ items, total }, allCategories] = await Promise.all([
    getIngredientsByCategory(category, offset, PAGE_SIZE).catch(() => ({ items: [], total: 0 })),
    getIngredientCategories().catch(() => []),
  ])
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const canonicalUrl =
    pageNum === 1
      ? `${BASE_URL}/ingredients/${category}`
      : `${BASE_URL}/ingredients/${category}?page=${pageNum}`

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageNum === 1 ? `${label} Ingredients` : `${label} Ingredients - Page ${pageNum}`,
    url: canonicalUrl,
    description: `Browse ${label.toLowerCase()} ingredients with culinary knowledge, dietary info, and pricing.`,
    numberOfItems: total,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'Ingredient Guide',
      url: `${BASE_URL}/ingredients`,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Ingredients', item: `${BASE_URL}/ingredients` },
        {
          '@type': 'ListItem',
          position: 3,
          name: label,
          item: `${BASE_URL}/ingredients/${category}`,
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
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/ingredients"
            className="text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Ingredients
          </Link>
          <span className="text-stone-700">/</span>
          <span className="text-stone-400">{label}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-100 mb-2">{label}</h1>
          <p className="text-stone-400 text-sm">
            {total.toLocaleString()} ingredients with culinary profiles, origin, dietary info, and
            pricing.
          </p>
        </div>

        {/* Other categories */}
        <div className="mb-8 flex flex-wrap gap-2">
          {allCategories
            .filter((c) => c.category !== category)
            .map((c) => (
              <Link
                key={c.category}
                href={`/ingredients/${c.category}`}
                className="px-3 py-1.5 rounded-full text-xs border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors"
              >
                {c.label}
                <span className="ml-1 text-stone-600">({c.count})</span>
              </Link>
            ))}
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            No enriched ingredients in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <IngredientCard key={item.slug} item={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            {pageNum > 1 && (
              <Link
                href={
                  pageNum === 2
                    ? `/ingredients/${category}`
                    : `/ingredients/${category}?page=${pageNum - 1}`
                }
                className="px-4 py-2 text-sm rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-xs text-stone-500">
              Page {pageNum} of {totalPages} ({total.toLocaleString()} total)
            </span>
            {pageNum < totalPages && (
              <Link
                href={`/ingredients/${category}?page=${pageNum + 1}`}
                className="px-4 py-2 text-sm rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function IngredientCard({ item }: { item: CategoryIngredient }) {
  return (
    <Link
      href={`/ingredient/${item.slug}`}
      className="group block rounded-xl border border-stone-800 bg-stone-900 hover:border-stone-600 hover:bg-stone-800/60 transition-colors overflow-hidden"
    >
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
      <div className="p-3">
        <h2 className="text-sm font-semibold text-stone-100 group-hover:text-white mb-0.5 leading-tight">
          {item.name}
        </h2>
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
  )
}
