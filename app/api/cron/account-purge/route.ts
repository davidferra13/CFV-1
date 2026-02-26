import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeFinalPurge } from '@/lib/compliance/account-deletion-actions'

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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: pendingDeletions, error } = await supabaseAdmin
      .from('chefs')
      .select('id, auth_user_id, email, business_name')
      .lte('deletion_scheduled_for', new Date().toISOString())
      .eq('is_deleted', false)
      .not('deletion_requested_at', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
