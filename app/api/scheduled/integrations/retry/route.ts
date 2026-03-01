import { NextResponse, type NextRequest } from 'next/server'
import { processPendingIntegrationEvents } from '@/lib/integrations/core/pipeline'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handleIntegrationsRetry(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

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
