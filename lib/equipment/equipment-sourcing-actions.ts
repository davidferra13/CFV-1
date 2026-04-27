'use server'

/**
 * Equipment Web Sourcing
 *
 * Layer 2 procurement: DDG search for equipment when the static catalog
 * has no match. Mirrors the ingredient sourcing pattern.
 * Free, no API key. Results cached 1 hour. Auth-gated.
 */

import { requireChef } from '@/lib/auth/get-user'

const TRUSTED_EQUIPMENT_DOMAINS = [
  { domain: 'webstaurantstore.com', label: 'WebstaurantStore' },
  { domain: 'jbprince.com', label: 'JB Prince' },
  { domain: 'amazon.com', label: 'Amazon' },
  { domain: 'restaurantdepot.com', label: 'Restaurant Depot' },
  { domain: 'matferbourgeatusa.com', label: 'Matfer Bourgeat' },
  { domain: 'vollrath.com', label: 'Vollrath' },
  { domain: 'debuyer.com', label: 'de Buyer' },
  { domain: 'katom.com', label: 'KaTom' },
  { domain: 'chefknivestogo.com', label: 'Chef Knives To Go' },
  { domain: 'korin.com', label: 'Korin' },
  { domain: 'bakedeco.com', label: 'BakeDeco (JB Prince)' },
  { domain: 'ateco.us', label: 'Ateco' },
]

const FALLBACK_LINKS = [
  {
    title: 'WebstaurantStore',
    url: 'https://www.webstaurantstore.com/',
    retailer: 'WebstaurantStore',
  },
  { title: 'JB Prince', url: 'https://www.jbprince.com/', retailer: 'JB Prince' },
  {
    title: 'Amazon Restaurant Supply',
    url: 'https://www.amazon.com/s?k=restaurant+supply',
    retailer: 'Amazon',
  },
  {
    title: 'Restaurant Depot',
    url: 'https://www.restaurantdepot.com/',
    retailer: 'Restaurant Depot',
  },
  { title: 'KaTom Restaurant Supply', url: 'https://www.katom.com/', retailer: 'KaTom' },
]

export type EquipmentSourcingResult = {
  title: string
  url: string
  description: string
  retailer: string
}

export type EquipmentSourcingResponse =
  | { source: 'live'; results: EquipmentSourcingResult[] }
  | { source: 'fallback'; results: EquipmentSourcingResult[] }
  | { source: 'error' }

function extractDDGUrls(html: string): Array<{ url: string; title: string }> {
  const results: Array<{ url: string; title: string }> = []
  const linkPattern = /href="[^"]*uddg=([^&"]+)[^"]*"[^>]*>([^<]+)/g
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html)) !== null) {
    try {
      const url = decodeURIComponent(match[1])
      const title = match[2].trim()
      if (url.startsWith('http') && title.length > 0) {
        results.push({ url, title })
      }
    } catch {
      // skip malformed
    }
  }

  return results
}

export async function searchEquipmentOnline(query: string): Promise<EquipmentSourcingResponse> {
  await requireChef()

  const searchQuery = `${query} buy restaurant supply commercial kitchen`

  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow/1.0; equipment sourcing)',
          Accept: 'text/html',
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      return {
        source: 'fallback',
        results: FALLBACK_LINKS.map((l) => ({ ...l, description: '' })),
      }
    }

    const html = await res.text()
    const extracted = extractDDGUrls(html)

    const results: EquipmentSourcingResult[] = extracted
      .flatMap(({ url, title }) => {
        const match = TRUSTED_EQUIPMENT_DOMAINS.find((td) => url.includes(td.domain))
        if (!match) return []
        return [{ title, url, description: '', retailer: match.label }]
      })
      .filter((r, i, arr) => arr.findIndex((x) => x.retailer === r.retailer) === i)
      .slice(0, 8)

    if (results.length === 0) {
      return {
        source: 'fallback',
        results: FALLBACK_LINKS.map((l) => ({ ...l, description: '' })),
      }
    }

    return { source: 'live', results }
  } catch {
    return {
      source: 'fallback',
      results: FALLBACK_LINKS.map((l) => ({ ...l, description: '' })),
    }
  }
}
