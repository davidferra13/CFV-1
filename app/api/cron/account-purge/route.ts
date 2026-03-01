import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeFinalPurge } from '@/lib/compliance/account-deletion-actions'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Daily cron endpoint to purge accounts past their 30-day grace period.
 * Finds chefs where deletion_scheduled_for <= NOW and is_deleted = false,
 * then runs the full purge pipeline (anonymize financials, clean storage, delete auth user).
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const { data: pendingDeletions, error } = await supabaseAdmin
      .from('chefs')
      .select('id, auth_user_id, email, business_name')
      .lte('deletion_scheduled_for', new Date().toISOString())
      .eq('is_deleted', false)
      .not('deletion_requested_at', 'is', null)

    if (error) {
      console.error('[account-purge] DB query failed:', error.message)
      return NextResponse.json({ error: 'Failed to query pending deletions' }, { status: 500 })
    }

    const results: Array<{ chefId: string; success: boolean; error?: string }> = []

    for (const chef of pendingDeletions || []) {
      const result = await executeFinalPurge(chef.id)
      results.push({ chefId: chef.id, ...result })
    }

    return NextResponse.json({
      checked: pendingDeletions?.length || 0,
      purged: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (err) {
    console.error('[account-purge] Unexpected error:', err)
    return NextResponse.json({ error: 'Account purge failed' }, { status: 500 })
  }
}
