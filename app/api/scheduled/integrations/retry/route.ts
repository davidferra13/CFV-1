import { NextResponse, type NextRequest } from 'next/server'
import { processPendingIntegrationEvents } from '@/lib/integrations/core/pipeline'

async function handleIntegrationsRetry(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processPendingIntegrationEvents(500)
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
