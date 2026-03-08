// Public API: returns chef brand data for the embeddable widget.
// No auth required (public embed context). Cached via CDN headers.

import { NextRequest, NextResponse } from 'next/server'
import { getChefBrand } from '@/lib/chef/brand'

export async function GET(_request: NextRequest, { params }: { params: { chefId: string } }) {
  const { chefId } = params

  if (!chefId || chefId.length < 10) {
    return NextResponse.json({ error: 'Invalid chef ID' }, { status: 400 })
  }

  try {
    const brand = await getChefBrand(chefId)

    return NextResponse.json(
      {
        businessName: brand.businessName,
        logoUrl: brand.logoUrl,
        primaryColor: brand.primaryColor,
        mode: brand.mode,
        showPoweredBy: brand.showPoweredBy,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    console.error('[embed/brand] Failed to fetch brand:', err)
    return NextResponse.json({ error: 'Failed to load brand' }, { status: 500 })
  }
}
