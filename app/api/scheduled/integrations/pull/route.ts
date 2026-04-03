import { NextResponse, type NextRequest } from 'next/server'
import { processPendingIntegrationEvents } from '@/lib/integrations/core/pipeline'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

async function handleIntegrationsPull(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('integrations-pull', async () =>
      processPendingIntegrationEvents(200)
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Integrations Pull Cron] Failed:', error)
    return NextResponse.json({ error: 'Failed to process integration events' }, { status: 500 })
  }
}

export { handleIntegrationsPull as GET, handleIntegrationsPull as POST }
