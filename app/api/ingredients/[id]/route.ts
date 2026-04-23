/**
 * GET /api/ingredients/[id]
 *
 * Public ingredient detail endpoint. No authentication required.
 * Returns the resolved ingredient object with availability classification
 * and alternative suggestions when applicable.
 *
 * This is the data contract that backs the shareable /ingredient/[id] page.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getPublicIngredientDetail,
  getPublicAlternatives,
} from '@/lib/openclaw/public-ingredient-queries'
import { isKnowledgeIngredientPubliclyIndexable } from '@/lib/openclaw/public-ingredient-publish'
import { classifyFromCatalogDetail } from '@/lib/pricing/sourceability'
import { formatCurrency } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing ingredient id' }, { status: 400 })
  }

  if (!isKnowledgeIngredientPubliclyIndexable({ slug: id })) {
    return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
  }

  try {
    const detail = await getPublicIngredientDetail(id)

    if (!detail) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    const sourceability = classifyFromCatalogDetail(detail)

    // Fetch alternatives when sourcing is difficult (fire and forget error safety)
    let alternatives: Awaited<ReturnType<typeof getPublicAlternatives>> = []
    if (sourceability.classification !== 'readily_available') {
      alternatives = await getPublicAlternatives(
        detail.ingredient.category,
        detail.ingredient.id,
        4
      ).catch(() => [])
    }

    // Representative price: cheapest in-stock, falling back to cheapest overall
    const inStockPrices = detail.prices.filter((p) => p.inStock)
    const representativePrice =
      inStockPrices.length > 0
        ? inStockPrices.reduce((a, b) => (a.priceCents <= b.priceCents ? a : b))
        : detail.prices.length > 0
          ? detail.prices.reduce((a, b) => (a.priceCents <= b.priceCents ? a : b))
          : null

    const response = {
      ingredient: {
        id: detail.ingredient.id,
        name: detail.ingredient.name,
        category: detail.ingredient.category,
        unit: detail.ingredient.standardUnit,
      },
      availability: {
        classification: sourceability.classification,
        label: sourceability.label,
        description: sourceability.description,
        confidence: sourceability.confidence,
        confidencePct: Math.round(sourceability.confidence * 100),
        signals: sourceability.signals,
      },
      pricing: {
        cheapestCents: detail.summary.cheapestCents,
        cheapestDisplay: detail.summary.cheapestCents
          ? formatCurrency(detail.summary.cheapestCents)
          : null,
        cheapestStore: detail.summary.cheapestStore,
        avgCents: detail.summary.avgCents,
        avgDisplay: detail.summary.avgCents ? formatCurrency(detail.summary.avgCents) : null,
        unit: representativePrice?.priceUnit ?? detail.ingredient.standardUnit,
        storeCount: detail.summary.storeCount,
        inStockCount: detail.summary.inStockCount,
      },
      representativePrice: representativePrice
        ? {
            store: representativePrice.store,
            priceCents: representativePrice.priceCents,
            display: formatCurrency(representativePrice.priceCents),
            unit: representativePrice.priceUnit,
            inStock: representativePrice.inStock,
            lastSeen: representativePrice.lastConfirmedAt,
            imageUrl: representativePrice.imageUrl,
            brand: representativePrice.brand,
          }
        : null,
      alternatives: alternatives.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        priceCents: a.bestPriceCents,
        display: a.bestPriceCents ? formatCurrency(a.bestPriceCents) : null,
        unit: a.bestPriceUnit,
        shareUrl: `/ingredient/${a.id}`,
      })),
      shareUrl: `/ingredient/${detail.ingredient.id}`,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('[GET /api/ingredients/[id]] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to load ingredient' }, { status: 500 })
  }
}
