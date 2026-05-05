import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { getCurrentUser } from '@/lib/auth/get-user'

/**
 * GET /api/pricing/coverage
 *
 * Returns pricing coverage metrics: how many ingredients have resolved prices,
 * broken down by region type, computation method, and confidence level.
 * Requires cron auth (Bearer token) or authenticated chef session.
 */
export async function GET(request: Request) {
  const cronOk = !verifyCronAuth(request.headers.get('authorization'))
  if (!cronOk) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'chef') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  try {
    const { getResolvedPricesCoverage } = await import('@/lib/openclaw/resolve-prices-worker')
    const coverage = await getResolvedPricesCoverage()
    return NextResponse.json(coverage)
  } catch (err) {
    console.error('[pricing/coverage] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Coverage report failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
