// Client Referral Actions - Track referrals and earned rewards

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ClientReferral = {
  id: string
  referredName: string | null
  referredEmail: string | null
  status: 'invited' | 'signed_up' | 'first_event_completed'
  /** Lifecycle stage for timeline display */
  lifecycleStage: 'referred' | 'inquired' | 'booked' | 'completed'
  pointsAwarded: number
  createdAt: string
}

export type ReferralStats = {
  totalReferred: number
  totalSignedUp: number
  totalBooked: number
  totalPointsEarned: number
  referralCode: string | null
}

export async function getMyReferrals(): Promise<ClientReferral[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_referrals')
    .select(
      `
      id, created_at, reward_points_awarded, status, inquiry_id, converted_event_id,
      referred_client:clients!client_referrals_referred_client_id_fkey(full_name, email)
    `
    )
    .eq('referrer_client_id', user.entityId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyReferrals] Query failed:', error)
    return []
  }

  return (data ?? []).map((r: any) => {
    let status: ClientReferral['status'] = 'invited'
    if (r.converted_event_id) status = 'first_event_completed'
    else if (r.referred_client) status = 'signed_up'

    // Map DB status to lifecycle stage for timeline
    let lifecycleStage: ClientReferral['lifecycleStage'] = 'referred'
    const dbStatus = r.status as string | null
    if (dbStatus === 'completed' || r.converted_event_id) {
      lifecycleStage = 'completed'
    } else if (dbStatus === 'booked') {
      lifecycleStage = 'booked'
    } else if (dbStatus === 'contacted' || r.inquiry_id) {
      lifecycleStage = 'inquired'
    }

    return {
      id: r.id,
      referredName: r.referred_client?.full_name || null,
      referredEmail: r.referred_client?.email || null,
      status,
      lifecycleStage,
      pointsAwarded: r.reward_points_awarded || 0,
      createdAt: r.created_at,
    }
  })
}

export async function getReferralStats(): Promise<ReferralStats> {
  const user = await requireClient()
  const db: any = createServerClient()

  const [referralsResult, clientResult] = await Promise.allSettled([
    db
      .from('client_referrals')
      .select('id, referred_client_id, reward_points_awarded, converted_event_id')
      .eq('referrer_client_id', user.entityId)
      .eq('tenant_id', user.tenantId!),
    db
      .from('clients')
      .select('referral_code')
      .eq('id', user.entityId)
      .eq('tenant_id', user.tenantId!)
      .single(),
  ])

  const referrals = referralsResult.status === 'fulfilled' ? (referralsResult.value.data ?? []) : []
  const referralCode =
    clientResult.status === 'fulfilled' ? clientResult.value.data?.referral_code || null : null

  return {
    totalReferred: referrals.length,
    totalSignedUp: referrals.filter((r: any) => r.referred_client_id).length,
    totalBooked: referrals.filter((r: any) => r.converted_event_id).length,
    totalPointsEarned: referrals.reduce(
      (sum: number, r: any) => sum + (r.reward_points_awarded || 0),
      0
    ),
    referralCode,
  }
}
