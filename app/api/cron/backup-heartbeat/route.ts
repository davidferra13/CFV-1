import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronError, recordCronHeartbeat } from '@/lib/cron/heartbeat'

export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const body = await request.json()
    await recordCronHeartbeat('db-backup', body, Date.now() - startedAt)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    await recordCronError('db-backup', message, Date.now() - startedAt)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
