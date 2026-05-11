import { NextRequest, NextResponse } from 'next/server'
import { lookupPrice } from '@/lib/pricing/universal-price-lookup'
import { getCurrentUser } from '@/lib/auth/get-user'
import { resolveCurrentUserLocation } from '@/lib/location/account-location'

/**
 * GET /api/pricing/ingredient?q=chicken+breast&zip=02101&amount=2&unit=lb
 *
 * Chef-only endpoint. Returns pricing for a single ingredient at a ZIP code.
 * Requires authenticated chef session.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const q = request.nextUrl.searchParams.get('q')
  let zip = request.nextUrl.searchParams.get('zip') || undefined
  if (!zip) {
    const acctLoc = await resolveCurrentUserLocation()
    zip = acctLoc?.zip || undefined
  }
  const amount = parseFloat(request.nextUrl.searchParams.get('amount') || '1')
  const unit = request.nextUrl.searchParams.get('unit') || undefined

  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameter: q (ingredient name)' },
      { status: 400 }
    )
  }

  try {
    const result = await lookupPrice({
      ingredient: q.trim(),
      zipCode: zip,
      radiusMiles: 50,
    })

    // PIE Law 9: price_per_unit_cents is ALWAYS a number
    const lineCostCents =
      amount > 0 ? Math.round(result.price_per_unit_cents * amount) : result.price_per_unit_cents

    return NextResponse.json({
      ...result,
      query: { ingredient: q, zip: zip || null, amount, unit: unit || null },
      line_cost_cents: lineCostCents,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[pricing/ingredient] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Price lookup failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
