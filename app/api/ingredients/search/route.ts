/**
 * GET /api/ingredients/search?q=...&limit=...
 *
 * Public ingredient search endpoint. No authentication required.
 * Powers the search input on the public /ingredient/[id] page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchPublicIngredients } from '@/lib/openclaw/public-ingredient-queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '8', 10) || 8, 1), 20)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const hits = await searchPublicIngredients(q, limit)

    return NextResponse.json(
      { results: hits },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      }
    )
  } catch (err) {
    console.error('[GET /api/ingredients/search] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ results: [] })
  }
}
