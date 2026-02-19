import { NextResponse, type NextRequest } from 'next/server'
import { processPendingIntegrationEvents } from '@/lib/integrations/core/pipeline'

async function handleIntegrationsPull(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processPendingIntegrationEvents(200)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Integrations Pull Cron] Failed:', error)
    return NextResponse.json({ error: 'Failed to process integration events' }, { status: 500 })
  }
}

export { handleIntegrationsPull as GET, handleIntegrationsPull as POST }
