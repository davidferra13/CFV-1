/**
 * Shared types for the OpenClaw catalog.
 * NOT a 'use server' file - safe to import from API routes, public pages, and server actions.
 */

export type CatalogDetailPrice = {
  store: string
  storeCity: string | null
  storeState: string | null
  storeWebsite: string | null
  priceCents: number
  priceUnit: string
  priceType: string
  pricingTier: string
  confidence: string
  inStock: boolean
  sourceUrl: string | null
  imageUrl: string | null
  brand: string | null
  aisleCat: string | null
  lastConfirmedAt: string
  lastChangedAt: string
  packageSize: string | null
  provenanceLabel: string | null
  confidenceScore: number
  publicationEligibility: string
  surfaceEligible: boolean
  lifecycleState: string
}

export type CatalogDetailResult = {
  ingredient: { id: string; name: string; category: string; standardUnit: string }
  prices: CatalogDetailPrice[]
  summary: {
    storeCount: number
    inStockCount: number
    outOfStockCount: number
    cheapestCents: number | null
    cheapestStore: string | null
    avgCents: number | null
    hasSourceUrls: boolean
  }
}
