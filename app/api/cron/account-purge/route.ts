import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { executeFinalPurge } from '@/lib/compliance/account-deletion-actions'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const dbAdmin = createAdminClient()

/**
 * Daily cron endpoint to purge accounts past their 30-day grace period.
 * Finds chefs where deletion_scheduled_for <= NOW and is_deleted = false,
 * then runs the full purge pipeline (anonymize financials, clean storage, delete auth user).
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('account-purge', async () => {
      const { data: pendingDeletions, error } = await dbAdmin
        .from('chefs')
        .select('id, auth_user_id, email, business_name')
        .lte('deletion_scheduled_for', new Date().toISOString())
        .eq('is_deleted', false)
        .not('deletion_requested_at', 'is', null)

      if (error) {
        console.error('[account-purge] DB query failed:', error.message)
        throw new Error('Failed to query pending deletions')
      }

      const results: Array<{ chefId: string; success: boolean; error?: string }> = []

      for (const chef of pendingDeletions || []) {
        const purgeResult = await executeFinalPurge(chef.id)
        results.push({ chefId: chef.id, ...purgeResult })
      }

      return {
        checked: pendingDeletions?.length || 0,
        purged: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[account-purge] Unexpected error:', err)
    return NextResponse.json({ error: 'Account purge failed' }, { status: 500 })
  }
}
