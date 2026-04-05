import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const { error: errorMsg, timestamp } = await request.json()

    // Fire developer alert for backup failure
    try {
      const { sendDeveloperAlert } = await import('@/lib/email/developer-alerts')
      await sendDeveloperAlert({
        severity: 'critical',
        system: 'db-backup',
        title: 'Database backup failed',
        description: errorMsg || 'Unknown backup failure',
        context: { timestamp: timestamp || new Date().toISOString() },
      })
    } catch (alertErr) {
      console.error('[backup-alert] Failed to send developer alert:', alertErr)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
