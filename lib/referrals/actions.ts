'use server'

import crypto from 'crypto'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { awardBonusPoints, getLoyaltyConfigByTenant } from '@/lib/loyalty/actions'
import { getReferralUrl } from '@/lib/qr/qr-code'
import { createServerClient } from '@/lib/supabase/server'

type ReferralClientRow = {
  id: string
  full_name: string | null
  referral_code: string | null
}

type ReferralChefRow = {
  id: string
  slug: string | null
  booking_slug?: string | null
  display_name: string | null
  business_name: string | null
}

export type ReferralShareData = {
  referralCode: string
  referralUrl: string
  chefSlug: string
  chefName: string
  referrerName: string
}

export type ReferralLandingContext = {
  isValid: boolean
  referralCode: string | null
  referrerClientId: string | null
  referrerName: string | null
}

function generateCandidateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.randomBytes(8))
    .map((value) => alphabet[value % alphabet.length])
    .join('')
}

function buildChefSlug(chef: ReferralChefRow) {
  return chef.booking_slug?.trim() || chef.slug?.trim() || ''
}

function buildChefName(chef: ReferralChefRow) {
  return chef.display_name?.trim() || chef.business_name?.trim() || 'Your chef'
}

function buildReferrerName(client: ReferralClientRow) {
  return client.full_name?.trim() || 'Your host'
}

async function generateUniqueReferralCode(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCandidateCode()
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()

    if (!existing) {
      return code
    }
  }

  throw new Error('Failed to generate referral code')
}

async function ensureReferralCodeForClient(
  supabase: any,
  tenantId: string,
  clientId: string
): Promise<ReferralClientRow | null> {
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, referral_code')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .maybeSingle()

  const typedClient = client as ReferralClientRow | null
  if (!typedClient) return null

  if (typedClient.referral_code) {
    return typedClient
  }

  const referralCode = await generateUniqueReferralCode(supabase)
  const { data: updated } = await supabase
    .from('clients')
    .update({ referral_code: referralCode })
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .select('id, full_name, referral_code')
    .single()

  return (updated as ReferralClientRow | null) ?? typedClient
}

async function buildReferralShareData(eventId: string, scope: 'chef' | 'client', scopeId: string) {
  const supabase = createServerClient({ admin: true })
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, status')
    .eq('id', eventId)
    .eq('status', 'completed')
    .maybeSingle()

  const typedEvent = event as {
    id: string
    tenant_id: string
    client_id: string | null
    status: string
  } | null

  if (!typedEvent?.client_id) {
    return null
  }

  if (scope === 'chef' && typedEvent.tenant_id !== scopeId) {
    return null
  }

  if (scope === 'client' && typedEvent.client_id !== scopeId) {
    return null
  }

  const [client, chef] = await Promise.all([
    ensureReferralCodeForClient(supabase, typedEvent.tenant_id, typedEvent.client_id),
    supabase
      .from('chefs')
      .select('id, slug, booking_slug, display_name, business_name')
      .eq('id', typedEvent.tenant_id)
      .maybeSingle(),
  ])

  const typedChef = chef.data as ReferralChefRow | null
  if (!client || !typedChef) {
    return null
  }

  const chefSlug = buildChefSlug(typedChef)
  if (!chefSlug) {
    return null
  }

  return {
    referralCode: client.referral_code as string,
    referralUrl: getReferralUrl(chefSlug, client.referral_code as string),
    chefSlug,
    chefName: buildChefName(typedChef),
    referrerName: buildReferrerName(client),
  } satisfies ReferralShareData
}

export async function getReferralShareDataForClientEvent(eventId: string) {
  const user = await requireClient()
  return buildReferralShareData(eventId, 'client', user.entityId!)
}

export async function getReferralShareDataForChefEvent(eventId: string) {
  const user = await requireChef()
  return buildReferralShareData(eventId, 'chef', user.tenantId!)
}

export async function getReferralLandingContext(
  tenantId: string,
  referralCode?: string | null
): Promise<ReferralLandingContext> {
  if (!referralCode?.trim()) {
    return {
      isValid: false,
      referralCode: null,
      referrerClientId: null,
      referrerName: null,
    }
  }

  const supabase = createServerClient({ admin: true })
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .eq('referral_code', referralCode.trim().toUpperCase())
    .maybeSingle()

  if (!client) {
    return {
      isValid: false,
      referralCode: referralCode.trim().toUpperCase(),
      referrerClientId: null,
      referrerName: null,
    }
  }

  return {
    isValid: true,
    referralCode: referralCode.trim().toUpperCase(),
    referrerClientId: (client as any).id,
    referrerName: (client as any).full_name || 'A client',
  }
}

export async function createClientReferralRecord(params: {
  tenantId: string
  referralCode: string
  referrerClientId: string
  referredClientId: string
  inquiryId: string
  convertedEventId: string
}) {
  const supabase = createServerClient({ admin: true })
  await supabase.from('client_referrals').insert({
    tenant_id: params.tenantId,
    referral_code: params.referralCode,
    referrer_client_id: params.referrerClientId,
    referred_client_id: params.referredClientId,
    inquiry_id: params.inquiryId,
    converted_event_id: params.convertedEventId,
  })
}

async function awardReferralRewardForTenantEvent(tenantId: string, eventId: string) {
  const supabase = createServerClient({ admin: true })

  const { data: referral } = await supabase
    .from('client_referrals')
    .select('id, referrer_client_id, referred_client_id, reward_awarded_at')
    .eq('tenant_id', tenantId)
    .eq('converted_event_id', eventId)
    .maybeSingle()

  const typedReferral = referral as {
    id: string
    referrer_client_id: string
    referred_client_id: string | null
    reward_awarded_at: string | null
  } | null

  if (!typedReferral) return null

  if (typedReferral.reward_awarded_at) {
    return { success: true, alreadyAwarded: true, pointsAwarded: 0 }
  }

  const config = await getLoyaltyConfigByTenant(tenantId)
  const shouldAwardPoints =
    !!config && config.is_active && config.program_mode === 'full' && config.referral_points > 0
  const pointsAwarded = shouldAwardPoints ? config!.referral_points : 0

  if (pointsAwarded > 0) {
    let referredName = 'a new client'
    if (typedReferral.referred_client_id) {
      const { data: referredClient } = await supabase
        .from('clients')
        .select('full_name')
        .eq('tenant_id', tenantId)
        .eq('id', typedReferral.referred_client_id)
        .maybeSingle()

      referredName = (referredClient as any)?.full_name || referredName
    }

    await awardBonusPoints(
      typedReferral.referrer_client_id,
      pointsAwarded,
      `Referral bonus for ${referredName}`
    )
  }

  await supabase
    .from('client_referrals')
    .update({
      reward_points_awarded: pointsAwarded,
      reward_awarded_at: new Date().toISOString(),
    })
    .eq('id', typedReferral.id)

  return {
    success: true,
    alreadyAwarded: false,
    pointsAwarded,
  }
}

export async function awardReferralRewardForCompletedEvent(eventId: string) {
  const user = await requireChef()
  return awardReferralRewardForTenantEvent(user.tenantId!, eventId)
}

export async function awardReferralRewardForCompletedEventSystem(
  tenantId: string,
  eventId: string
) {
  return awardReferralRewardForTenantEvent(tenantId, eventId)
}

// ============================================
// REFERRAL STATS (client-facing)
// ============================================

export type ReferralStats = {
  referralCode: string | null
  referralUrl: string | null
  totalReferrals: number
  completedReferrals: number
  totalPointsEarned: number
  referrals: Array<{
    id: string
    referredName: string | null
    createdAt: string
    eventCompleted: boolean
    pointsAwarded: number
  }>
}

/**
 * Get referral stats for the current client.
 * Shows how many friends they've referred, completed events, and points earned.
 */
export async function getClientReferralStats(): Promise<ReferralStats> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Get client's referral code
  const { data: client } = await supabase
    .from('clients')
    .select('id, referral_code, tenant_id')
    .eq('id', user.entityId!)
    .single()

  if (!client) {
    return {
      referralCode: null,
      referralUrl: null,
      totalReferrals: 0,
      completedReferrals: 0,
      totalPointsEarned: 0,
      referrals: [],
    }
  }

  // Ensure referral code exists
  const typedClient = await ensureReferralCodeForClient(supabase, client.tenant_id, client.id)

  // Fetch chef for URL building
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, slug, booking_slug, display_name, business_name')
    .eq('id', client.tenant_id)
    .maybeSingle()

  const typedChef = chef as ReferralChefRow | null
  const chefSlug = typedChef ? buildChefSlug(typedChef) : ''
  const referralCode = typedClient?.referral_code ?? null

  let referralUrl: string | null = null
  if (chefSlug && referralCode) {
    referralUrl = getReferralUrl(chefSlug, referralCode)
  }

  // Fetch all referrals by this client
  const { data: referrals } = await supabase
    .from('client_referrals')
    .select(
      `
      id,
      referred_client_id,
      converted_event_id,
      reward_points_awarded,
      reward_awarded_at,
      created_at,
      referred_client:clients!client_referrals_referred_client_id_fkey(full_name)
    `
    )
    .eq('referrer_client_id', user.entityId!)
    .eq('tenant_id', client.tenant_id)
    .order('created_at', { ascending: false })

  const referralList = (referrals ?? []).map((r: any) => ({
    id: r.id,
    referredName: r.referred_client?.full_name ?? null,
    createdAt: r.created_at,
    eventCompleted: !!r.reward_awarded_at,
    pointsAwarded: r.reward_points_awarded ?? 0,
  }))

  const completedReferrals = referralList.filter((r) => r.eventCompleted).length
  const totalPointsEarned = referralList.reduce((sum, r) => sum + r.pointsAwarded, 0)

  return {
    referralCode,
    referralUrl,
    totalReferrals: referralList.length,
    completedReferrals,
    totalPointsEarned,
    referrals: referralList,
  }
}

// ============================================
// CHEF REFERRAL DASHBOARD
// ============================================

export type ChefReferralDashboard = {
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  totalPointsAwarded: number
  topReferrers: Array<{
    clientId: string
    clientName: string | null
    referralCount: number
    pointsEarned: number
  }>
  recentReferrals: Array<{
    id: string
    referrerName: string | null
    referredName: string | null
    createdAt: string
    eventCompleted: boolean
    pointsAwarded: number
  }>
}

/**
 * Get the chef's referral program dashboard data.
 * Shows all referral activity across clients.
 */
export async function getChefReferralDashboard(): Promise<ChefReferralDashboard> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: referrals } = await supabase
    .from('client_referrals')
    .select(
      `
      id,
      referrer_client_id,
      referred_client_id,
      reward_points_awarded,
      reward_awarded_at,
      created_at,
      referrer:clients!client_referrals_referrer_client_id_fkey(full_name),
      referred:clients!client_referrals_referred_client_id_fkey(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  const all = referrals ?? []
  const completed = all.filter((r: any) => !!r.reward_awarded_at)
  const totalPointsAwarded = all.reduce(
    (sum: number, r: any) => sum + (r.reward_points_awarded ?? 0),
    0
  )

  // Build top referrers
  const referrerMap = new Map<
    string,
    { clientName: string | null; count: number; points: number }
  >()
  for (const r of all) {
    const rid = (r as any).referrer_client_id
    const existing = referrerMap.get(rid)
    if (existing) {
      existing.count++
      existing.points += (r as any).reward_points_awarded ?? 0
    } else {
      referrerMap.set(rid, {
        clientName: (r as any).referrer?.full_name ?? null,
        count: 1,
        points: (r as any).reward_points_awarded ?? 0,
      })
    }
  }

  const topReferrers = [...referrerMap.entries()]
    .map(([clientId, data]) => ({
      clientId,
      clientName: data.clientName,
      referralCount: data.count,
      pointsEarned: data.points,
    }))
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, 10)

  const recentReferrals = all.slice(0, 20).map((r: any) => ({
    id: r.id,
    referrerName: r.referrer?.full_name ?? null,
    referredName: r.referred?.full_name ?? null,
    createdAt: r.created_at,
    eventCompleted: !!r.reward_awarded_at,
    pointsAwarded: r.reward_points_awarded ?? 0,
  }))

  return {
    totalReferrals: all.length,
    completedReferrals: completed.length,
    pendingReferrals: all.length - completed.length,
    totalPointsAwarded,
    topReferrers,
    recentReferrals,
  }
}
