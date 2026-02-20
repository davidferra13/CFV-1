// Scheduled Loyalty Expiry Cron Endpoint
// GET /api/scheduled/loyalty-expiry — invoked by Vercel Cron Job
// POST /api/scheduled/loyalty-expiry — invoked manually or by external schedulers
//
// Enforces expiry on client_incentives (vouchers + gift cards).
// Sets is_active = false on any incentive whose expires_at has passed.
// Also expires waitlist entries that are past their expires_at.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'

async function handleLoyaltyExpiry(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true })
  const now = new Date().toISOString()

  // ── 1. Expire overdue vouchers and gift cards ────────────────────────────
  const { data: expiredIncentiveRows, error: incentiveError } = await supabase
    .from('client_incentives')
    .update({ is_active: false })
    .lt('expires_at', now)
    .eq('is_active', true)
    .select('id')

  if (incentiveError) {
    console.error('[Loyalty Expiry Cron] Failed to expire incentives:', incentiveError)
    return NextResponse.json(
      { error: 'Failed to expire incentives' },
      { status: 500 },
    )
  }

  // ── 2. Expire overdue waitlist entries ───────────────────────────────────
  const { data: expiredWaitlistRows, error: waitlistError } = await supabase
    .from('waitlist_entries')
    .update({ status: 'expired' })
    .lt('expires_at', now)
    .eq('status', 'waiting')
    .select('id')

  if (waitlistError) {
    // Non-fatal — log and continue
    console.error('[Loyalty Expiry Cron] Failed to expire waitlist entries:', waitlistError)
  }

  const expiredIncentives = expiredIncentiveRows?.length ?? 0
  const expiredWaitlist = expiredWaitlistRows?.length ?? 0

  if (expiredIncentives > 0 || expiredWaitlist > 0) {
    console.log(
      `[Loyalty Expiry Cron] Expired ${expiredIncentives} incentive(s), ${expiredWaitlist} waitlist entry(ies)`,
    )
  }

  const result = { incentivesExpired: expiredIncentives, waitlistEntriesExpired: expiredWaitlist }
  await recordCronHeartbeat('loyalty-expiry', result)
  return NextResponse.json(result)
}

export { handleLoyaltyExpiry as GET, handleLoyaltyExpiry as POST }
