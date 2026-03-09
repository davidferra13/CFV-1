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
