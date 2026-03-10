// Auto-Rewards Cron - Birthday & Anniversary Point Awards
// Schedule: 0 12 * * * (8 AM ET daily)
// Awards loyalty points on client birthdays and first-event anniversaries.

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  checkAndAwardBirthdayPoints,
  checkAndAwardAnniversaryPoints,
} from '@/lib/loyalty/auto-rewards'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })

  // Fetch all chefs with active loyalty programs
  const { data: configs, error: configError } = await supabase
    .from('loyalty_config')
    .select('tenant_id')
    .eq('is_active', true)

  if (configError || !configs) {
    console.error('[auto-rewards-cron] Failed to fetch loyalty configs:', configError)
    return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 })
  }

  let totalBirthdayAwarded = 0
  let totalAnniversaryAwarded = 0
  let errors = 0

  for (const config of configs) {
    try {
      const [birthday, anniversary] = await Promise.all([
        checkAndAwardBirthdayPoints(config.tenant_id),
        checkAndAwardAnniversaryPoints(config.tenant_id),
      ])

      totalBirthdayAwarded += birthday.awarded
      totalAnniversaryAwarded += anniversary.awarded
    } catch (err) {
      console.error(`[auto-rewards-cron] Failed for tenant ${config.tenant_id}:`, err)
      errors++
    }
  }

  console.info(
    `[auto-rewards-cron] Complete: ${totalBirthdayAwarded} birthday, ${totalAnniversaryAwarded} anniversary awards across ${configs.length} chefs (${errors} errors)`
  )

  return NextResponse.json({
    success: true,
    chefs_processed: configs.length,
    birthday_awards: totalBirthdayAwarded,
    anniversary_awards: totalAnniversaryAwarded,
    errors,
  })
}
