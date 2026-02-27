'use server'

/**
 * ProPublica Nonprofit Explorer API integration.
 * Free API, no key needed. Server-side only (no CORS).
 *
 * Endpoints:
 *   GET /search.json?q={query}&state[id]={ST}&ntee[id]={1-10}
 *   GET /organizations/{ein}.json
 *
 * Docs: https://projects.propublica.org/nonprofits/api
 */

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import type { ProPublicaNonprofit } from './hours-types'

const BASE_URL = 'https://projects.propublica.org/nonprofits/api/v2'

const SearchSchema = z.object({
  query: z.string().min(2).max(200),
  state: z.string().length(2).optional(),
  nteeId: z.number().int().min(1).max(10).optional(),
  page: z.number().int().min(0).max(100).optional(),
})

const BrowseSchema = z.object({
  state: z.string().length(2),
  nteeId: z.number().int().min(1).max(10).optional(),
  query: z.string().max(200).optional(),
  page: z.number().int().min(0).max(100).optional(),
})

// ─── Helpers ──────────────────────────────────────────────────

function mapOrg(org: Record<string, unknown>): ProPublicaNonprofit {
  return {
    ein: String(org.ein ?? ''),
    name: String(org.name ?? ''),
    city: String(org.city ?? ''),
    state: String(org.state ?? ''),
    nteeCode: org.ntee_code ? String(org.ntee_code) : null,
    income: typeof org.income_amount === 'number' ? org.income_amount : 0,
    rulingDate: org.ruling_date ? String(org.ruling_date) : null,
  }
}

async function fetchProPublica(url: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // cache 1 hour
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.organizations) ? data.organizations : []
  } catch (err) {
    console.warn('[propublica] API error (non-blocking):', err)
    return []
  }
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Search ProPublica for nonprofits by name, with optional state + category filters.
 * Used for 501(c) verification after Google Places selection and for keyword search.
 */
export async function searchNonprofits(
  query: string,
  state?: string,
  nteeId?: number,
  page = 0
): Promise<{ results: ProPublicaNonprofit[]; hasMore: boolean }> {
  await requireChef()
  const parsed = SearchSchema.parse({ query, state, nteeId, page })

  const url = new URL(`${BASE_URL}/search.json`)
  url.searchParams.set('q', parsed.query)
  if (parsed.state) url.searchParams.set('state[id]', parsed.state)
  if (parsed.nteeId) url.searchParams.set('ntee[id]', String(parsed.nteeId))
  if (parsed.page) url.searchParams.set('page', String(parsed.page))

  const orgs = await fetchProPublica(url.toString())
  const results = orgs.slice(0, 25).map(mapOrg)

  return {
    results,
    hasMore: orgs.length > 25,
  }
}

/**
 * Browse nonprofits by state (required) + optional category + optional keyword.
 * Used for the "Find Charities" discovery panel.
 */
export async function browseNonprofits(
  state: string,
  nteeId?: number,
  query?: string,
  page = 0
): Promise<{ results: ProPublicaNonprofit[]; hasMore: boolean }> {
  await requireChef()
  const parsed = BrowseSchema.parse({ state, nteeId, query, page })

  const url = new URL(`${BASE_URL}/search.json`)
  url.searchParams.set('state[id]', parsed.state)
  if (parsed.nteeId) url.searchParams.set('ntee[id]', String(parsed.nteeId))
  if (parsed.query) url.searchParams.set('q', parsed.query)
  if (parsed.page) url.searchParams.set('page', String(parsed.page))

  const orgs = await fetchProPublica(url.toString())
  const results = orgs.slice(0, 25).map(mapOrg)

  return {
    results,
    hasMore: orgs.length > 25,
  }
}
