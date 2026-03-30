/**
 * Admin API: Directory Image Queue Seeder
 * Returns listings with empty photo_urls so Pi can seed its image-sourcing queue.
 * GET /api/admin/directory/image-queue?limit=10000&offset=0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  // Admin-only
  const admin = await getCurrentAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const limit = Math.min(parseInt(searchParams.get('limit') || '10000', 10), 50000)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    // Get total count of listings needing images
    const countResult = await pgClient`
      SELECT COUNT(*)::int AS total
      FROM directory_listings
      WHERE (photo_urls = '{}' OR photo_urls IS NULL)
        AND status != 'removed'
    `

    // Get paginated batch of listings needing images
    const listings = await pgClient`
      SELECT
        id,
        name,
        city,
        state,
        website_url
      FROM directory_listings
      WHERE (photo_urls = '{}' OR photo_urls IS NULL)
        AND status != 'removed'
      ORDER BY
        CASE WHEN website_url IS NOT NULL AND website_url != '' THEN 0 ELSE 1 END,
        CASE WHEN state = 'MA' THEN 0 ELSE 1 END,
        name
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return NextResponse.json({
      listings,
      total: countResult[0]?.total || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[admin/directory/image-queue] Query failed:', err)
    return NextResponse.json({ error: 'Failed to query directory listings' }, { status: 500 })
  }
}
