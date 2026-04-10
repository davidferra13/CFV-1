'use server'

/**
 * Ingredient Web Sourcing
 *
 * When the local catalog has no data for an ingredient, this action searches
 * specialty retailers via Brave Search API and returns confirmed product pages.
 *
 * Requires: BRAVE_SEARCH_API_KEY in env (Brave Search API, ~$3/month)
 * Fallback: returns empty array - caller shows static retailer links instead.
 *
 * Auth: requireChef() - only authenticated chefs can trigger search API calls.
 * Cache: results are cached 1 hour per query to avoid redundant API calls.
 */

import { requireChef } from '@/lib/auth/get-user'

// Retailers we trust for specialty ingredient sourcing.
// Results from other domains are filtered out.
const TRUSTED_DOMAINS = [
  { domain: 'eataly.com', label: 'Eataly' },
  { domain: 'wholefoodsmarket.com', label: 'Whole Foods' },
  { domain: 'instacart.com', label: 'Instacart' },
  { domain: 'formaggiokitchen.com', label: 'Formaggio Kitchen' },
  { domain: 'amazon.com', label: 'Amazon Fresh' },
  { domain: 'freshdirect.com', label: 'FreshDirect' },
  { domain: 'weee.com', label: 'Weee!' },
  { domain: 'goldbelly.com', label: 'Goldbelly' },
]

export type SourcingResult = {
  title: string
  url: string
  description: string
  retailer: string
}

export type SourcingResponse =
  | { source: 'live'; results: SourcingResult[] }
  | { source: 'no_key' }
  | { source: 'error' }

export async function searchIngredientOnline(query: string): Promise<SourcingResponse> {
  await requireChef()

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return { source: 'no_key' }

  const searchQuery = `${query} buy specialty grocery store`

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=10`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) return { source: 'error' }

    const data = await res.json()
    const webResults: Array<{ title: string; url: string; description?: string }> =
      data.web?.results ?? []

    const results: SourcingResult[] = webResults
      .flatMap((r) => {
        const match = TRUSTED_DOMAINS.find((td) => r.url?.includes(td.domain))
        if (!match) return []
        return [
          {
            title: r.title ?? match.label,
            url: r.url,
            description: r.description ?? '',
            retailer: match.label,
          },
        ]
      })
      .slice(0, 6)

    return { source: 'live', results }
  } catch {
    return { source: 'error' }
  }
}
