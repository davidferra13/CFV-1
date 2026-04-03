import { NextResponse, type NextRequest } from 'next/server'
import { syncAllActiveExternalReviewSources } from '@/lib/reviews/external-sync'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleReviewsSync(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('reviews-sync', async () =>
      syncAllActiveExternalReviewSources(200)
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('[External Reviews Sync Cron] Failed:', error)
    return NextResponse.json({ error: 'Failed to sync external review sources' }, { status: 500 })
  }
}

export { handleReviewsSync as GET, handleReviewsSync as POST }
