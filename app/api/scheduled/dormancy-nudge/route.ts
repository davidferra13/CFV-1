// Scheduled: Dormancy Nudge
// Finds chefs who haven't logged in for 30+ days and sends a re-engagement email.
// Runs daily. Uses last_login_at on chefs table + dormancy_nudge_sent_at to prevent re-sends.

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { createAdminClient } from '@/lib/db/admin'
import { sendEmail } from '@/lib/email/send'

const DORMANCY_THRESHOLD_DAYS = 30
const NUDGE_COOLDOWN_DAYS = 30
const BATCH_LIMIT = 50

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('dormancy-nudge', async () => {
      return sweepDormantChefs()
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[dormancy-nudge] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function sweepDormantChefs(): Promise<{
  checked: number
  nudged: number
  errors: number
}> {
  const db = createAdminClient()
  let checked = 0
  let nudged = 0
  let errors = 0

  const cutoff = new Date(Date.now() - DORMANCY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const nudgeCooloff = new Date(
    Date.now() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // Find chefs who logged in at some point but not in the last 30 days
  // Exclude chefs who were already nudged recently
  // Exclude suspended/deleted accounts
  const { data: dormantChefs } = await db
    .from('chefs')
    .select('id, email, display_name, business_name, last_login_at, dormancy_nudge_sent_at')
    .not('last_login_at', 'is', null)
    .lt('last_login_at', cutoff)
    .not('email', 'is', null)
    .neq('account_status', 'suspended')
    .is('deletion_scheduled_for', null)
    .order('last_login_at', { ascending: true })
    .limit(BATCH_LIMIT)

  if (!dormantChefs || dormantChefs.length === 0) {
    return { checked: 0, nudged: 0, errors: 0 }
  }

  for (const chef of dormantChefs) {
    checked++

    // Skip if nudged recently
    if (chef.dormancy_nudge_sent_at && chef.dormancy_nudge_sent_at > nudgeCooloff) {
      continue
    }

    const chefName = (chef.display_name as string) || (chef.business_name as string) || 'Chef'
    const lastLogin = new Date(chef.last_login_at as string)
    const daysSince = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))

    try {
      const { DormancyNudgeEmail } = await import('@/lib/email/templates/dormancy-nudge')

      await sendEmail({
        to: chef.email as string,
        subject: `Your ChefFlow dashboard is waiting`,
        react: DormancyNudgeEmail({
          chefName,
          daysSinceLogin: daysSince,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/dashboard`,
        }),
      })

      await db
        .from('chefs')
        .update({ dormancy_nudge_sent_at: new Date().toISOString() })
        .eq('id', chef.id)

      nudged++
    } catch (err) {
      errors++
      console.error(`[dormancy-nudge] Failed to nudge ${chef.email}:`, err)
    }
  }

  return { checked, nudged, errors }
}
