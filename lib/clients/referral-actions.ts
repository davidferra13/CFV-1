'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'contacted' | 'booked' | 'completed'

export interface Referral {
  id: string
  referrerClientId: string
  referredClientId: string | null
  referralCode: string
  status: ReferralStatus
  revenueGeneratedCents: number
  notes: string | null
  referralSource: string | null
  createdAt: string
  updatedAt: string
}

export interface ReferralDashboard {
  totalReferrals: number
  convertedReferrals: number
  conversionRate: number
  totalRevenueFromReferralsCents: number
  topReferrers: {
    clientId: string
    clientName: string
    referralCount: number
    convertedCount: number
    revenueCents: number
  }[]
  recentReferrals: {
    id: string
    referringClientName: string
    referredClientName: string
    status: ReferralStatus
    date: string
    revenueCents: number
  }[]
  monthlyTrend: {
    month: string
    count: number
    converted: number
  }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapRow(r: any): Referral {
  return {
    id: r.id,
    referrerClientId: r.referrer_client_id,
    referredClientId: r.referred_client_id,
    referralCode: r.referral_code,
    status: r.status ?? 'pending',
    revenueGeneratedCents: r.revenue_generated_cents ?? 0,
    notes: r.notes ?? null,
    referralSource: r.referral_source ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
  }
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function addReferral(data: {
  referringClientId: string
  referredClientId?: string
  notes?: string
  referralSource?: string
}): Promise<Referral> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Generate a simple referral code
  const code = `REF-${Date.now().toString(36).toUpperCase()}`

  const { data: row, error } = await db
    .from('client_referrals' as any)
    .insert({
      tenant_id: tenantId,
      referrer_client_id: data.referringClientId,
      referred_client_id: data.referredClientId || null,
      referral_code: code,
      status: 'pending',
      revenue_generated_cents: 0,
      notes: data.notes || null,
      referral_source: data.referralSource || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create referral')
  }

  revalidatePath('/clients')
  return mapRow(row)
}

export async function updateReferralStatus(
  id: string,
  status: ReferralStatus,
  revenueGeneratedCents?: number
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (revenueGeneratedCents !== undefined) {
    updateData.revenue_generated_cents = revenueGeneratedCents
  }

  const { error } = await db
    .from('client_referrals' as any)
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to update referral status')
  }

  // Auto-award referral bonus when status changes to 'completed' (non-blocking)
  if (status === 'completed') {
    try {
      // SELECT referral row for idempotency check
      const { data: referral } = await db
        .from('client_referrals' as any)
        .select('id, referrer_client_id, reward_points_awarded, referred_client_id')
        .eq('id', id)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (referral && (referral.reward_points_awarded || 0) === 0 && referral.referrer_client_id) {
        // Look up loyalty config for this tenant
        const { data: loyaltyConfig } = await db
          .from('loyalty_config' as any)
          .select('referral_points, is_active, program_mode')
          .eq('tenant_id', user.tenantId!)
          .single()

        const referralPoints = (loyaltyConfig as any)?.referral_points ?? 0
        const programMode = (loyaltyConfig as any)?.program_mode ?? 'off'
        const isActive = (loyaltyConfig as any)?.is_active ?? false

        if (isActive && programMode !== 'off' && referralPoints > 0) {
          // Get referred client name for the description
          let referredName = 'a friend'
          if (referral.referred_client_id) {
            const { data: referredClient } = await db
              .from('clients' as any)
              .select('full_name')
              .eq('id', referral.referred_client_id)
              .single()
            if (referredClient) {
              referredName = (referredClient as any).full_name || 'a friend'
            }
          }

          // Award points via internal helper
          const { awardBonusPointsInternal } = await import('@/lib/loyalty/award-internal')
          await awardBonusPointsInternal(
            user.tenantId!,
            referral.referrer_client_id,
            referralPoints,
            `Referral bonus: ${referredName} completed their first event`,
            user.id
          )

          // Mark referral as rewarded (CAS guard: only if still 0)
          await db
            .from('client_referrals' as any)
            .update({
              reward_points_awarded: referralPoints,
              reward_awarded_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('tenant_id', user.tenantId!)
            .eq('reward_points_awarded', 0)
        }
      }
    } catch (err) {
      // Non-blocking: log but never fail the status update
      console.error('[updateReferralStatus] Auto-award referral bonus failed:', err)
    }
  }

  revalidatePath('/clients')
  revalidatePath('/loyalty')
}

export async function deleteReferral(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_referrals' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to delete referral')
  }

  revalidatePath('/clients')
}

export async function getClientReferrals(clientId: string): Promise<Referral[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_referrals' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('referrer_client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to load referrals')
  }

  return ((data ?? []) as any[]).map(mapRow)
}

export async function getReferralDashboard(): Promise<ReferralDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch all referrals with joined client names
  const { data: rows } = await db
    .from('client_referrals' as any)
    .select(
      `
      id, referrer_client_id, referred_client_id, status,
      revenue_generated_cents, created_at,
      referrer:clients!referrer_client_id(id, full_name),
      referred:clients!referred_client_id(id, full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const referrals = (rows ?? []) as any[]

  const totalReferrals = referrals.length
  const converted = referrals.filter((r) => r.status === 'booked' || r.status === 'completed')
  const convertedReferrals = converted.length
  const conversionRate =
    totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0
  const totalRevenueFromReferralsCents = referrals.reduce(
    (sum: number, r: any) => sum + (r.revenue_generated_cents ?? 0),
    0
  )

  // Top referrers
  const referrerMap = new Map<
    string,
    { clientId: string; clientName: string; count: number; converted: number; revenue: number }
  >()
  for (const r of referrals) {
    const cId = r.referrer_client_id
    const cName = r.referrer?.full_name ?? 'Unknown'
    const existing = referrerMap.get(cId) ?? {
      clientId: cId,
      clientName: cName,
      count: 0,
      converted: 0,
      revenue: 0,
    }
    existing.count++
    if (r.status === 'booked' || r.status === 'completed') existing.converted++
    existing.revenue += r.revenue_generated_cents ?? 0
    referrerMap.set(cId, existing)
  }
  const topReferrers = Array.from(referrerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName,
      referralCount: r.count,
      convertedCount: r.converted,
      revenueCents: r.revenue,
    }))

  // Recent referrals (last 20)
  const recentReferrals = referrals.slice(0, 20).map((r: any) => ({
    id: r.id,
    referringClientName: r.referrer?.full_name ?? 'Unknown',
    referredClientName: r.referred?.full_name ?? 'Unknown',
    status: (r.status ?? 'pending') as ReferralStatus,
    date: r.created_at,
    revenueCents: r.revenue_generated_cents ?? 0,
  }))

  // Monthly trend (last 12 months)
  const monthlyMap = new Map<string, { count: number; converted: number }>()
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { count: 0, converted: 0 })
  }
  for (const r of referrals) {
    const d = new Date(r.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = monthlyMap.get(key)
    if (existing) {
      existing.count++
      if (r.status === 'booked' || r.status === 'completed') existing.converted++
    }
  }
  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    count: data.count,
    converted: data.converted,
  }))

  return {
    totalReferrals,
    convertedReferrals,
    conversionRate,
    totalRevenueFromReferralsCents,
    topReferrers,
    recentReferrals,
    monthlyTrend,
  }
}

export async function getReferralSources(): Promise<{ source: string; count: number }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('client_referrals' as any)
    .select('referral_source')
    .eq('tenant_id', user.tenantId!)
    .not('referral_source', 'is', null)

  const sourceMap = new Map<string, number>()
  for (const r of (data ?? []) as any[]) {
    const src = r.referral_source ?? 'Unknown'
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1)
  }

  return Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
}
