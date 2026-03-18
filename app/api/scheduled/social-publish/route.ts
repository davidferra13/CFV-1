// POST /api/scheduled/social-publish
// scheduled cron Job - fires every 5 minutes.
// Delegates to the publishing engine which queries queued posts and fires each adapter.
// Secured with CRON_SECRET (self-hosted injects Authorization: Bearer <secret>).

import { NextResponse, type NextRequest } from 'next/server'
import { runPublishingEngine } from '@/lib/social/publishing/engine'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handle(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await runPublishingEngine()
    const elapsed = Date.now() - start

    console.log(
      `[social-publish] processed=${result.processed} succeeded=${result.succeeded} ` +
        `failed=${result.failed} skipped=${result.skipped} ms=${elapsed}`
    )

    if (result.errors.length > 0) {
      console.error('[social-publish] errors:', result.errors)
    }

    return NextResponse.json({ ...result, elapsed_ms: elapsed })
  } catch (err) {
    console.error('[social-publish] engine crash:', err)
    return NextResponse.json(
      { error: (err as Error).message, elapsed_ms: Date.now() - start },
      { status: 500 }
    )
  }
}

export { handle as GET, handle as POST }
