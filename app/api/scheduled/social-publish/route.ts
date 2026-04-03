// POST /api/scheduled/social-publish
// scheduled cron Job - fires every 5 minutes.
// Delegates to the publishing engine which queries queued posts and fires each adapter.
// Secured with CRON_SECRET (self-hosted injects Authorization: Bearer <secret>).

import { NextResponse, type NextRequest } from 'next/server'
import { runPublishingEngine } from '@/lib/social/publishing/engine'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handle(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await runMonitoredCronJob('social-publish', async () => {
      const publishResult = await runPublishingEngine()
      const elapsed = Date.now() - start

      console.log(
        `[social-publish] processed=${publishResult.processed} succeeded=${publishResult.succeeded} ` +
          `failed=${publishResult.failed} skipped=${publishResult.skipped} ms=${elapsed}`
      )

      if (publishResult.errors.length > 0) {
        console.error('[social-publish] errors:', publishResult.errors)
      }

      return { ...publishResult, elapsed_ms: elapsed }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[social-publish] engine crash:', err)
    return NextResponse.json(
      { error: (err as Error).message, elapsed_ms: Date.now() - start },
      { status: 500 }
    )
  }
}

export { handle as GET, handle as POST }
