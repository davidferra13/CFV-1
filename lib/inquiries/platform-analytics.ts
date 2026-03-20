'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export interface PlatformStat {
  channel: string
  total: number
  confirmed: number
  declined: number
  expired: number
  active: number
  conversionRate: number
  avgLeadScore: number | null
}

export interface PlatformAnalytics {
  platforms: PlatformStat[]
  totalInquiries: number
  totalConfirmed: number
  overallConversionRate: number
  bestPlatform: string | null
}

const CHANNEL_DISPLAY: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  instagram: 'Instagram',
  take_a_chef: 'Take a Chef',
  yhangry: 'Yhangry',
  phone: 'Phone',
  website: 'Website',
  referral: 'Referral',
  walk_in: 'Walk-In',
  wix: 'Wix',
  thumbtack: 'Thumbtack',
  theknot: 'The Knot',
  bark: 'Bark',
  cozymeal: 'Cozymeal',
  gigsalad: 'GigSalad',
  google_business: 'Google',
  outbound_prospecting: 'Outbound',
  kiosk: 'Kiosk',
  campaign_response: 'Campaign',
  privatechefmanager: 'PrivateChefManager',
  hireachef: 'HireAChef',
  cuisineistchef: 'CuisineistChef',
  other: 'Other',
}

/**
 * Get inquiry analytics broken down by platform/channel.
 * Pure SQL aggregation, no AI.
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('channel, status, unknown_fields')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (error || !inquiries) {
    return {
      platforms: [],
      totalInquiries: 0,
      totalConfirmed: 0,
      overallConversionRate: 0,
      bestPlatform: null,
    }
  }

  // Group by channel
  const byChannel: Record<
    string,
    {
      total: number
      confirmed: number
      declined: number
      expired: number
      active: number
      scores: number[]
    }
  > = {}

  for (const inq of inquiries) {
    const ch = inq.channel || 'other'
    if (!byChannel[ch]) {
      byChannel[ch] = { total: 0, confirmed: 0, declined: 0, expired: 0, active: 0, scores: [] }
    }
    byChannel[ch].total++

    if (inq.status === 'confirmed') byChannel[ch].confirmed++
    else if (inq.status === 'declined') byChannel[ch].declined++
    else if (inq.status === 'expired') byChannel[ch].expired++
    else byChannel[ch].active++

    // Lead score from unknown_fields
    const uf = inq.unknown_fields as Record<string, unknown> | null
    if (uf && typeof uf.lead_score === 'number') {
      byChannel[ch].scores.push(uf.lead_score)
    }
  }

  // Build platform stats sorted by volume
  const platforms: PlatformStat[] = Object.entries(byChannel)
    .map(([channel, stats]) => ({
      channel: CHANNEL_DISPLAY[channel] || channel,
      total: stats.total,
      confirmed: stats.confirmed,
      declined: stats.declined,
      expired: stats.expired,
      active: stats.active,
      conversionRate: stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0,
      avgLeadScore:
        stats.scores.length > 0
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
          : null,
    }))
    .sort((a, b) => b.total - a.total)

  const totalInquiries = inquiries.length
  const totalConfirmed = platforms.reduce((sum, p) => sum + p.confirmed, 0)
  const overallConversionRate =
    totalInquiries > 0 ? Math.round((totalConfirmed / totalInquiries) * 100) : 0

  // Best platform = highest conversion rate with at least 3 inquiries
  const qualified = platforms.filter((p) => p.total >= 3)
  const bestPlatform =
    qualified.length > 0
      ? qualified.sort((a, b) => b.conversionRate - a.conversionRate)[0].channel
      : null

  return {
    platforms,
    totalInquiries,
    totalConfirmed,
    overallConversionRate,
    bestPlatform,
  }
}
