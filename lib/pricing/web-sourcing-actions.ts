'use server'

/**
 * Ingredient Web Sourcing
 *
 * When the local catalog has no data for an ingredient, this action searches
 * specialty retailers via DuckDuckGo HTML scraping - free, no API key required.
 *
 * The chef's home_city + home_state are added to the query so results are
 * relevant to the chef's actual market instead of a fixed default region.
 *
 * Results are filtered to trusted retailer domains and cached 1 hour per query.
 * Auth-gated: only authenticated chefs can trigger searches.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { requireChef } from '@/lib/auth/get-user'

const TRUSTED_DOMAINS = [
  { domain: 'eataly.com', label: 'Eataly' },
  { domain: 'wholefoodsmarket.com', label: 'Whole Foods' },
  { domain: 'instacart.com', label: 'Instacart' },
  { domain: 'formaggiokitchen.com', label: 'Formaggio Kitchen' },
  { domain: 'amazon.com', label: 'Amazon Fresh' },
  { domain: 'freshdirect.com', label: 'FreshDirect' },
  { domain: 'goldbelly.com', label: 'Goldbelly' },
  { domain: 'specialtyproduce.com', label: 'Specialty Produce' },
  { domain: 'marxfoods.com', label: 'Marx Foods' },
  { domain: 'earthy.com', label: 'Earthy Delights' },
]

export type SourcingResult = {
  title: string
  url: string
  description: string
  retailer: string
}

export type SourcingResponse = { source: 'live'; results: SourcingResult[] } | { source: 'error' }

// Extract all uddg-encoded destination URLs from DuckDuckGo HTML
function extractDDGUrls(html: string): Array<{ url: string; title: string }> {
  const results: Array<{ url: string; title: string }> = []
  const linkPattern = /href="[^"]*uddg=([^&"]+)[^"]*"[^>]*>([^<]+)</g
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html)) !== null) {
    try {
      const url = decodeURIComponent(match[1])
      const title = match[2].trim()
      if (url.startsWith('http') && title.length > 0) {
        results.push({ url, title })
      }
    } catch {
      // skip malformed entries
    }
  }

  return results
}

async function getChefLocation(chefId: string): Promise<string> {
  try {
    const rows = await db.execute(
      sql`SELECT home_city, home_state FROM chef_preferences WHERE chef_id = ${chefId} LIMIT 1`
    )
    const row = (rows as any)[0] as { home_city?: string; home_state?: string } | undefined
    const parts = [row?.home_city, row?.home_state].filter(Boolean)
    return parts.join(', ')
  } catch {
    return ''
  }
}

export async function searchIngredientOnline(query: string): Promise<SourcingResponse> {
  const user = await requireChef()

  const location = await getChefLocation(user.entityId)
  const locationClause = location ? ` ${location}` : ''
  const searchQuery = `${query} buy specialty grocery store${locationClause}`

  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow/1.0; ingredient sourcing)',
          Accept: 'text/html',
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) return { source: 'error' }

    const html = await res.text()
    const extracted = extractDDGUrls(html)

    const results: SourcingResult[] = extracted
      .flatMap(({ url, title }) => {
        const match = TRUSTED_DOMAINS.find((td) => url.includes(td.domain))
        if (!match) return []
        return [{ title, url, description: '', retailer: match.label }]
      })
      .filter((r, i, arr) => arr.findIndex((x) => x.retailer === r.retailer) === i)
      .slice(0, 6)

    return { source: 'live', results }
  } catch {
    return { source: 'error' }
  }
}
