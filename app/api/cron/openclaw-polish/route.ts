import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

/**
 * OpenCLAW Data Polish Cron
 * Runs the full data enrichment cycle: images, categories, units,
 * nutrition linking, volatility tracking, source URLs.
 *
 * Called daily after the price sync completes.
 * POST /api/cron/openclaw-polish
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const { runPolishJobInternal } = await import('@/lib/openclaw/polish-job')

    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dry-run') === 'true'

    const result = await runPolishJobInternal({ dryRun })

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[openclaw-polish cron] Error:', message)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
