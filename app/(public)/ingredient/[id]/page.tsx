/**
 * /ingredient/[id] - Public shareable ingredient page
 *
 * A stable, consistent ingredient object anyone can view without logging in.
 * Designed to be shared in chef-to-chef and chef-to-client conversations.
 *
 * Shows: resolved name, availability classification, pricing, confidence,
 * store coverage, and alternatives when availability is limited.
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
  getPublicIngredientDetail,
  getPublicAlternatives,
} from '@/lib/openclaw/public-ingredient-queries'
import { classifyFromCatalogDetail } from '@/lib/pricing/sourceability'
import { AvailabilityDetail, AvailabilityBadge } from '@/components/pricing/availability-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { CopyLinkButton } from './_components/copy-link-button'
import { IngredientSearch } from './_components/ingredient-search'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const detail = await getPublicIngredientDetail(id).catch(() => null)
  if (!detail) {
    return { title: 'Ingredient not found' }
  }
  const sourceability = classifyFromCatalogDetail(detail)
  return {
    title: `${detail.ingredient.name} - ChefFlow`,
    description: `${sourceability.label}: ${sourceability.description} Prices from ${detail.summary.storeCount} stores.`,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IngredientPage({ params }: Params) {
  const { id } = await params

  const detail = await getPublicIngredientDetail(id).catch(() => null)
  if (!detail) notFound()

  const sourceability = classifyFromCatalogDetail(detail)

  // Load alternatives when needed
  const alternatives =
    sourceability.classification !== 'readily_available'
      ? await getPublicAlternatives(detail.ingredient.category, detail.ingredient.id, 4).catch(
          () => []
        )
      : []

  // Pick a representative image (first in-stock price with an image)
  const representativePrice =
    detail.prices.find((p) => p.inStock && p.imageUrl) ??
    detail.prices.find((p) => p.imageUrl) ??
    detail.prices[0] ??
    null

  const pageUrl = `/ingredient/${id}`

  // Most recent price date
  const mostRecentDate =
    detail.prices.length > 0
      ? detail.prices.reduce((a, b) =>
          new Date(a.lastConfirmedAt) > new Date(b.lastConfirmedAt) ? a : b
        ).lastConfirmedAt
      : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Nav breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/chefs"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to ChefFlow
        </Link>
      </div>

      {/* Search bar - so recipients can find their own ingredients */}
      <div className="mb-8">
        <IngredientSearch currentId={id} />
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-stone-700 bg-stone-900/80 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-800">
          <div className="flex items-start gap-4">
            {/* Ingredient image */}
            {representativePrice?.imageUrl ? (
              <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-stone-800 border border-stone-700">
                <img
                  src={representativePrice.imageUrl}
                  alt={detail.ingredient.name}
                  className="h-full w-full object-cover"
                  onError={() => {}} // handled by CSS fallback
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

          {/* Availability badge */}
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

        {/* Store prices (up to 5) */}
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

        {/* Alternatives (when availability is limited or hard to source) */}
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

        {/* Share section */}
        <div className="px-6 py-5 bg-stone-900/50">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
            Share This Ingredient
          </h2>
          <p className="text-xs text-stone-500 mb-3 leading-relaxed">
            This link shows the same ingredient data to anyone who opens it. Share it with a client,
            another chef, or a supplier.
          </p>
          <CopyLinkButton path={pageUrl} />
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs text-stone-700">
        Prices are scraped from local grocery stores and updated periodically. Not affiliated with
        any retailer.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PricingCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-stone-800/50 px-4 py-3">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-stone-100 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function InStockDot({ inStock }: { inStock: boolean }) {
  return (
    <span
      className={`h-2 w-2 rounded-full shrink-0 ${inStock ? 'bg-emerald-500' : 'bg-stone-600'}`}
      title={inStock ? 'In stock' : 'Out of stock'}
    />
  )
}
