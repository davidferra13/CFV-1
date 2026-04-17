'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReferralSuggestion {
  backupChefId: string
  chefName: string
  matchScore: number // 0-100
  matchReasons: string[]
  cuisineOverlap: string[]
  availableForDate?: string
}

export interface ReferralSourcePerformance {
  source: string
  inquiryCount: number
  conversionRate: number
  avgValueCents: number
  totalRevenueCents: number
}

export interface ClientReferralCandidate {
  clientId: string
  clientName: string
  likelihood: 'high' | 'medium' | 'low'
  reasons: string[]
  totalEvents: number
  lastNpsScore: number | null
}

export interface NetworkIntelligenceResult {
  referralSourcePerformance: ReferralSourcePerformance[]
  bestReferralSource: string | null
  topReferringClients: ClientReferralCandidate[]
  backupChefSuggestions: ReferralSuggestion[]
  networkStats: {
    totalReferralInquiries: number
    referralConversionRate: number
    referralRevenuePercent: number
    activeBackupChefs: number
  }
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getNetworkIntelligence(): Promise<NetworkIntelligenceResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch inquiries with referral data
  const { data: inquiries, error } = await db
    .from('inquiries')
    .select(
      'id, status, channel, referral_source, referral_source_detail, confirmed_budget_cents, converted_to_event_id'
    )
    .eq('tenant_id', tenantId)

  if (error) return null

  // Fetch events for revenue calculation
  const { data: events } = await db
    .from('events')
    .select('id, quoted_price_cents, status, client_id')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])

  // Fetch clients with NPS and loyalty data
  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, total_events_count, loyalty_tier, referral_source')
    .eq('tenant_id', tenantId)

  // Fetch NPS scores
  const { data: surveys } = await db
    .from('client_satisfaction_surveys')
    .select('client_id, nps_score, would_rebook')
    .eq('tenant_id', tenantId)

  const npsMap = new Map<string, number>()
  const wouldRebook = new Set<string>()
  for (const survey of surveys || []) {
    if (survey.nps_score != null) {
      npsMap.set(survey.client_id, Math.max(npsMap.get(survey.client_id) || 0, survey.nps_score))
    }
    if (survey.would_rebook) wouldRebook.add(survey.client_id)
  }

  // backup_chefs table does not exist; use collab availability signals instead
  // For now, return empty to avoid silent SQL failures
  const backupChefs: any[] = []

  // ── Referral source performance ──────────────────────────────────────────

  const sourceStats = new Map<
    string,
    { inquiries: number; converted: number; revenueCents: number }
  >()
  const eventRevenueMap = new Map<string, number>()

  for (const event of events || []) {
    eventRevenueMap.set(event.id, event.quoted_price_cents || 0)
  }

  for (const inquiry of inquiries || []) {
    const source = inquiry.referral_source || inquiry.channel || 'unknown'
    if (!sourceStats.has(source))
      sourceStats.set(source, { inquiries: 0, converted: 0, revenueCents: 0 })
    const stats = sourceStats.get(source)!
    stats.inquiries++

    if (inquiry.converted_to_event_id) {
      stats.converted++
      stats.revenueCents += eventRevenueMap.get(inquiry.converted_to_event_id) || 0
    }
  }

  const referralSourcePerformance: ReferralSourcePerformance[] = Array.from(sourceStats.entries())
    .map(([source, stats]) => ({
      source,
      inquiryCount: stats.inquiries,
      conversionRate:
        stats.inquiries > 0 ? Math.round((stats.converted / stats.inquiries) * 100) : 0,
      avgValueCents: stats.converted > 0 ? Math.round(stats.revenueCents / stats.converted) : 0,
      totalRevenueCents: stats.revenueCents,
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)

  const bestSource =
    referralSourcePerformance.length > 0 ? referralSourcePerformance[0].source : null

  // ── Client referral candidates ───────────────────────────────────────────

  const topReferringClients: ClientReferralCandidate[] = []

  for (const client of clients || []) {
    const reasons: string[] = []
    let score = 0

    const nps = npsMap.get(client.id)
    if (nps != null && nps >= 9) {
      score += 3
      reasons.push(`NPS: ${nps} (promoter)`)
    } else if (nps != null && nps >= 7) {
      score += 1
      reasons.push(`NPS: ${nps}`)
    }

    if (wouldRebook.has(client.id)) {
      score += 2
      reasons.push('Said they would rebook')
    }
    if ((client.total_events_count || 0) >= 3) {
      score += 2
      reasons.push(`${client.total_events_count} events (loyal)`)
    } else if ((client.total_events_count || 0) >= 2) {
      score += 1
      reasons.push('Repeat client')
    }

    if (client.loyalty_tier === 'platinum' || client.loyalty_tier === 'gold') {
      score += 1
      reasons.push(`${client.loyalty_tier} tier`)
    }

    if (score < 2) continue

    const likelihood: ClientReferralCandidate['likelihood'] =
      score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'

    topReferringClients.push({
      clientId: client.id,
      clientName: client.full_name || 'Unknown',
      likelihood,
      reasons,
      totalEvents: client.total_events_count || 0,
      lastNpsScore: nps ?? null,
    })
  }

  topReferringClients.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.likelihood] - order[b.likelihood]
  })

  // ── Backup chef suggestions ──────────────────────────────────────────────

  const backupChefSuggestions: ReferralSuggestion[] = (backupChefs || [])
    .filter(
      (c: any) => c.availability_status === 'available' || c.availability_status === 'limited'
    )
    .map((chef: any) => {
      const cuisines = (chef.cuisine_types as string[]) || []
      return {
        backupChefId: chef.id,
        chefName: chef.name || 'Unknown Chef',
        matchScore:
          50 + (cuisines.length > 0 ? 20 : 0) + (chef.availability_status === 'available' ? 15 : 0),
        matchReasons: [
          chef.availability_status === 'available' ? 'Currently available' : 'Limited availability',
          ...(cuisines.length > 0 ? [`Specializes in: ${cuisines.join(', ')}`] : []),
        ],
        cuisineOverlap: cuisines,
      }
    })
    .sort((a: ReferralSuggestion, b: ReferralSuggestion) => b.matchScore - a.matchScore)
    .slice(0, 5)

  // ── Network stats ────────────────────────────────────────────────────────

  const totalInquiries = (inquiries || []).length
  const referralInquiries = (inquiries || []).filter(
    (i: any) => i.referral_source === 'referral' || i.channel === 'referral'
  )
  const referralConverted = referralInquiries.filter((i: any) => i.converted_to_event_id)
  const totalRevenue = (events || []).reduce(
    (s: number, e: any) => s + (e.quoted_price_cents || 0),
    0
  )
  const referralRevenue = referralConverted.reduce(
    (s: number, i: any) => s + (eventRevenueMap.get(i.converted_to_event_id) || 0),
    0
  )

  return {
    referralSourcePerformance: referralSourcePerformance.slice(0, 10),
    bestReferralSource: bestSource,
    topReferringClients: topReferringClients.slice(0, 10),
    backupChefSuggestions,
    networkStats: {
      totalReferralInquiries: referralInquiries.length,
      referralConversionRate:
        referralInquiries.length > 0
          ? Math.round((referralConverted.length / referralInquiries.length) * 100)
          : 0,
      referralRevenuePercent:
        totalRevenue > 0 ? Math.round((referralRevenue / totalRevenue) * 100) : 0,
      activeBackupChefs: (backupChefs || []).filter(
        (c: any) => c.availability_status === 'available'
      ).length,
    },
  }
}
