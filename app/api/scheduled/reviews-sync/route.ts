import { NextResponse, type NextRequest } from 'next/server'
import { syncAllActiveExternalReviewSources } from '@/lib/reviews/external-sync'

async function handleReviewsSync(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncAllActiveExternalReviewSources(200)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[External Reviews Sync Cron] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to sync external review sources' },
      { status: 500 },
    )
  }
}

export { handleReviewsSync as GET, handleReviewsSync as POST }
