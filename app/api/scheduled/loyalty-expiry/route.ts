// Scheduled Loyalty Expiry Cron Endpoint
// GET /api/scheduled/loyalty-expiry - invoked by scheduled cron Job
// POST /api/scheduled/loyalty-expiry - invoked manually or by external schedulers
//
// Enforces expiry on client_incentives (vouchers + gift cards).
// Sets is_active = false on any incentive whose expires_at has passed.
// Also expires waitlist entries that are past their expires_at.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

async function handleLoyaltyExpiry(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const db = createServerClient({ admin: true })
    const now = new Date().toISOString()

    const { data: expiredIncentiveRows, error: incentiveError } = await db
      .from('client_incentives')
      .update({ is_active: false })
      .lt('expires_at', now)
      .eq('is_active', true)
      .select('id')

    if (incentiveError) {
      console.error('[Loyalty Expiry Cron] Failed to expire incentives:', incentiveError)
      throw new Error('Failed to expire incentives')
    }

    const { data: expiredWaitlistRows, error: waitlistError } = await db
      .from('waitlist_entries')
      .update({ status: 'expired' })
      .lt('expires_at', now)
      .eq('status', 'waiting')
      .select('id')

    if (waitlistError) {
      console.error('[Loyalty Expiry Cron] Failed to expire waitlist entries:', waitlistError)
    }

    const expiredIncentives = expiredIncentiveRows?.length ?? 0
    const expiredWaitlist = expiredWaitlistRows?.length ?? 0

    if (expiredIncentives > 0 || expiredWaitlist > 0) {
      console.log(
        `[Loyalty Expiry Cron] Expired ${expiredIncentives} incentive(s), ${expiredWaitlist} waitlist entry(ies)`
      )
    }

    const result = { incentivesExpired: expiredIncentives, waitlistEntriesExpired: expiredWaitlist }
    await recordCronHeartbeat('loyalty-expiry', result, Date.now() - startedAt)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await recordCronError('loyalty-expiry', message, Date.now() - startedAt)
    console.error('[loyalty-expiry] Cron failed:', err)
    return NextResponse.json({ error: 'Loyalty expiry processing failed' }, { status: 500 })
  }
}

export { handleLoyaltyExpiry as GET, handleLoyaltyExpiry as POST }
