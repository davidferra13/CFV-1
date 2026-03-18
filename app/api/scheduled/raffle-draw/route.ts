// Scheduled Raffle Draw Cron Endpoint
// GET /api/scheduled/raffle-draw - invoked by scheduled cron Job (1st of each month)
// POST /api/scheduled/raffle-draw - invoked manually for testing
//
// Finds all active raffle rounds whose month_end has passed and draws winners.
// Each entry has equal odds. Drawing is cryptographically random and provably fair.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'
import { drawRaffleWinner } from '@/lib/raffle/actions'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handleRaffleDraw(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const today = new Date().toISOString().split('T')[0]

  // Find all active rounds whose month has ended
  const { data: expiredRounds, error } = await (supabase
    .from('raffle_rounds' as any)
    .select('id, month_label, tenant_id')
    .eq('status', 'active')
    .lt('month_end', today) as any)

  if (error) {
    console.error('[Raffle Draw Cron] Failed to query rounds:', error)
    return NextResponse.json({ error: 'Failed to query raffle rounds' }, { status: 500 })
  }

  const results: {
    roundId: string
    month: string
    success: boolean
    winner?: string
    error?: string
  }[] = []

  for (const round of (expiredRounds || []) as any[]) {
    console.log(`[Raffle Draw Cron] Drawing winner for ${round.month_label} (${round.id})`)
    const result = await drawRaffleWinner(round.id)
    results.push({
      roundId: round.id,
      month: round.month_label,
      success: result.success,
      winner: result.winnerAlias,
      error: result.error,
    })
  }

  const drawn = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  if (results.length > 0) {
    console.log(
      `[Raffle Draw Cron] Processed ${results.length} round(s): ${drawn} drawn, ${failed} failed/empty`
    )
  }

  const summary = { roundsProcessed: results.length, drawn, failed, details: results }
  await recordCronHeartbeat('raffle-draw', summary)
  return NextResponse.json(summary)
}

export { handleRaffleDraw as GET, handleRaffleDraw as POST }
