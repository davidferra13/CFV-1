import { NextRequest, NextResponse } from 'next/server'
import {
  getTenantCacheSnapshot,
  refreshTenantCache,
  refreshAllCaches,
} from '@/lib/pricing/offline-cache'
import { getCurrentUser } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pie/v1/cache
 *
 * Returns the offline price cache snapshot for the authenticated chef.
 * Service worker calls this periodically to keep its cache fresh.
 *
 * Response headers include cache control for the SW to use.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = user.id

  try {
    let snapshot = await getTenantCacheSnapshot(tenantId)

    // If no snapshot exists or expired, generate one on-demand
    if (!snapshot) {
      await refreshTenantCache(tenantId)
      snapshot = await getTenantCacheSnapshot(tenantId)
    }

    if (!snapshot) {
      return NextResponse.json({ error: 'Failed to generate cache' }, { status: 500 })
    }

    const response = NextResponse.json(snapshot)

    // Cache headers for service worker
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    response.headers.set('X-PIE-Cache-Version', String(snapshot.version))
    response.headers.set('X-PIE-Cache-Ingredients', String(snapshot.ingredientCount))

    return response
  } catch (error) {
    console.error('[pie-cache] Error:', error)
    return NextResponse.json(
      { error: 'Cache generation failed', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pie/v1/cache
 *
 * Force-refresh the cache for authenticated user, or bulk refresh (cron).
 *
 * Query params:
 *   ?bulk=true - refresh all tenants (requires cron secret)
 */
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const isBulk = searchParams.get('bulk') === 'true'

  if (isBulk) {
    // Cron: refresh all tenants
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || process.env.PIE_CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await refreshAllCaches()
    return NextResponse.json({ success: true, ...result })
  }

  // Single tenant refresh
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await refreshTenantCache(user.id)
  return NextResponse.json({ success: true, ...result })
}
