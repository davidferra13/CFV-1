import { NextResponse, type NextRequest } from 'next/server'
import { processPendingIntegrationEvents } from '@/lib/integrations/core/pipeline'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleIntegrationsRetry(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('integrations-retry', async () =>
      processPendingIntegrationEvents(500)
    )
    return NextResponse.json({
      retried: result.processed,
      completed: result.completed,
      failed: result.failed,
    })
  } catch (error) {
    console.error('[Integrations Retry Cron] Failed:', error)
    return NextResponse.json({ error: 'Failed to retry integration events' }, { status: 500 })
  }
}

export { handleIntegrationsRetry as GET, handleIntegrationsRetry as POST }
