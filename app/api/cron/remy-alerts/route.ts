import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startMs = Date.now()

  try {
    // Get all active chefs
    const { data: chefs, error: chefsError } = await supabaseAdmin
      .from('chefs')
      .select('id')
      .eq('status', 'active')

    if (chefsError || !chefs) {
      const msg = chefsError?.message ?? 'No chefs found'
      await recordCronError('remy-alerts', msg, Date.now() - startMs)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    let totalAlerts = 0
    let chefsProcessed = 0
    let chefsFailed = 0

    const { runAlertRules } = await import('@/lib/ai/remy-proactive-alerts')

    for (const chef of chefs) {
      try {
        const inserted = await runAlertRules(chef.id)
        totalAlerts += inserted
        chefsProcessed++
      } catch (err) {
        console.error(`[remy-alerts] Error for chef ${chef.id}:`, err)
        chefsFailed++
      }
    }

    const durationMs = Date.now() - startMs
    await recordCronHeartbeat(
      'remy-alerts',
      { chefsProcessed, chefsFailed, totalAlerts },
      durationMs
    )

    return NextResponse.json({
      chefsProcessed,
      chefsFailed,
      totalAlerts,
      durationMs,
    })
  } catch (err) {
    const durationMs = Date.now() - startMs
    await recordCronError(
      'remy-alerts',
      err instanceof Error ? err.message : String(err),
      durationMs
    )
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export { GET as POST }
