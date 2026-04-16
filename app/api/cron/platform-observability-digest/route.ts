import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronError, recordCronHeartbeat } from '@/lib/cron/heartbeat'
import { sendPlatformObservabilityDigest } from '@/lib/platform-observability/digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await sendPlatformObservabilityDigest()
    const durationMs = Date.now() - start

    await recordCronHeartbeat(
      'platform-observability-digest',
      result as unknown as Record<string, unknown>,
      durationMs
    )

    return NextResponse.json({
      message: result.sent
        ? 'Platform observability digest sent'
        : 'Platform observability digest failed to send',
      ...result,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)

    console.error('[cron/platform-observability-digest] Error:', error)
    await recordCronError('platform-observability-digest', message, durationMs)

    return NextResponse.json({ error: 'Digest generation failed' }, { status: 500 })
  }
}
