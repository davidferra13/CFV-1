// @ts-nocheck
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CampaignEmailStats {
  totalCampaigns: number
  totalRecipients: number
  totalSent: number
  openRate: number // %
  clickRate: number // %
  bounceRate: number // %
  spamRate: number // %
  unsubscribeRate: number // %
  bestCampaign: { name: string; openRate: number } | null
}

export interface MarketingSpendByChannel {
  channel: string
  totalCents: number
  percent: number
}

export interface CostPerLeadByChannel {
  channel: string
  spendCents: number
  leads: number // inquiries from this channel
  costPerLeadCents: number
  costPerAcquisitionCents: number // per booked event
  bookedEvents: number
}

export interface ReviewStats {
  totalReviews: number
  avgRating: number
  reviewRate: number // reviews / completed events %
  ratingDistribution: Array<{ stars: number; count: number; percent: number }>
  recentReviews: Array<{ clientName: string; rating: number; createdAt: string }>
}

export interface WebsiteStatsLatest {
  snapshotMonth: string
  uniqueVisitors: number | null
  pageviews: number | null
  bounceRatePercent: number | null
  avgSessionSeconds: number | null
  topSource: string | null
  inquiryConversionRatePercent: number | null
  previousMonth: {
    uniqueVisitors: number | null
    pageviews: number | null
  } | null
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getCampaignEmailStats(): Promise<CampaignEmailStats> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, name')
    .eq('chef_id', chef.id)
    .eq('status', 'sent')

  if (!campaigns?.length) {
    return {
      totalCampaigns: 0,
      totalRecipients: 0,
      totalSent: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      spamRate: 0,
      unsubscribeRate: 0,
      bestCampaign: null,
    }
  }

  const campaignIds = campaigns.map((c) => c.id)

  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('sent_at, opened_at, clicked_at, bounced_at, spam_at, unsubscribed_at, campaign_id')
    .eq('chef_id', chef.id)
    .in('campaign_id', campaignIds)

  const all = recipients ?? []
  const sent = all.filter((r) => r.sent_at)
  const opens = all.filter((r) => r.opened_at)
  const clicks = all.filter((r) => r.clicked_at)
  const bounces = all.filter((r) => r.bounced_at)
  const spam = all.filter((r) => r.spam_at)
  const unsubs = all.filter((r) => r.unsubscribed_at)

  // Best campaign by open rate
  const campaignStats = new Map<string, { opens: number; sent: number; name: string }>()
  for (const c of campaigns) campaignStats.set(c.id, { opens: 0, sent: 0, name: c.name })
  for (const r of all) {
    const s = campaignStats.get(r.campaign_id)
    if (s) {
      if (r.sent_at) s.sent++
      if (r.opened_at) s.opens++
    }
  }
  const bestCampaign =
    Array.from(campaignStats.values())
      .filter((c) => c.sent > 0)
      .map((c) => ({ name: c.name, openRate: pct(c.opens, c.sent) }))
      .sort((a, b) => b.openRate - a.openRate)[0] ?? null

  return {
    totalCampaigns: campaigns.length,
    totalRecipients: all.length,
    totalSent: sent.length,
    openRate: pct(opens.length, sent.length),
    clickRate: pct(clicks.length, sent.length),
    bounceRate: pct(bounces.length, sent.length),
    spamRate: pct(spam.length, sent.length),
    unsubscribeRate: pct(unsubs.length, sent.length),
    bestCampaign,
  }
}

export async function getMarketingSpendByChannel(
  startDate: string,
  endDate: string
): Promise<MarketingSpendByChannel[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('marketing_spend_log')
    .select('channel, amount_cents')
    .eq('chef_id', chef.id)
    .gte('spend_date', startDate)
    .lte('spend_date', endDate)

  const channelMap = new Map<string, number>()
  let total = 0

  for (const entry of data ?? []) {
    channelMap.set(entry.channel, (channelMap.get(entry.channel) ?? 0) + entry.amount_cents)
    total += entry.amount_cents
  }

  return Array.from(channelMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([channel, totalCents]) => ({
      channel,
      totalCents,
      percent: pct(totalCents, total),
    }))
}

export async function getCostPerLeadByChannel(
  startDate: string,
  endDate: string
): Promise<CostPerLeadByChannel[]> {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Marketing spend by channel in period
  const { data: spendData } = await supabase
    .from('marketing_spend_log')
    .select('channel, amount_cents')
    .eq('chef_id', chef.id)
    .gte('spend_date', startDate)
    .lte('spend_date', endDate)

  const channelSpend = new Map<string, number>()
  for (const s of spendData ?? []) {
    channelSpend.set(s.channel, (channelSpend.get(s.channel) ?? 0) + s.amount_cents)
  }

  // Map marketing channels to inquiry channels
  const channelMapping: Record<string, string[]> = {
    instagram_ads: ['instagram'],
    google_ads: ['website'],
    facebook_ads: ['facebook'],
  }

  const results: CostPerLeadByChannel[] = []

  for (const [mktChannel, spendCents] of channelSpend) {
    const inquiryChannels = channelMapping[mktChannel] ?? []

    let leads = 0
    let booked = 0

    if (inquiryChannels.length > 0) {
      const { count: leadCount } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', chef.id)
        .in('channel', inquiryChannels)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      const { count: bookedCount } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', chef.id)
        .in('channel', inquiryChannels)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('converted_to_event_id', 'is', null)

      leads = leadCount ?? 0
      booked = bookedCount ?? 0
    }

    results.push({
      channel: mktChannel,
      spendCents,
      leads,
      costPerLeadCents: leads > 0 ? Math.round(spendCents / leads) : 0,
      costPerAcquisitionCents: booked > 0 ? Math.round(spendCents / booked) : 0,
      bookedEvents: booked,
    })
  }

  return results.sort((a, b) => b.spendCents - a.spendCents)
}

export async function getReviewStats(): Promise<ReviewStats> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: reviews } = await supabase
    .from('client_reviews')
    .select('rating, created_at, client_id')
    .eq('chef_id', chef.id)
    .order('created_at', { ascending: false })

  const { count: completedEvents } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')

  const all = reviews ?? []
  const totalReviews = all.length
  const completedCount = completedEvents ?? 0

  const avgRating =
    totalReviews > 0
      ? Math.round((all.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
      : 0

  const ratingDist = [5, 4, 3, 2, 1].map((stars) => {
    const count = all.filter((r) => r.rating === stars).length
    return { stars, count, percent: pct(count, totalReviews) }
  })

  // Get client names for recent reviews
  const recentIds = all
    .slice(0, 5)
    .map((r) => r.client_id)
    .filter(Boolean) as string[]
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .in('id', recentIds)

  const nameMap = new Map((clients ?? []).map((c) => [c.id, c.full_name]))

  const recentReviews = all.slice(0, 5).map((r) => ({
    clientName: nameMap.get(r.client_id ?? '') ?? 'Anonymous',
    rating: r.rating,
    createdAt: r.created_at,
  }))

  return {
    totalReviews,
    avgRating,
    reviewRate: pct(totalReviews, completedCount),
    ratingDistribution: ratingDist,
    recentReviews,
  }
}

export async function getWebsiteStats(): Promise<WebsiteStatsLatest> {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('website_stats_snapshots')
    .select('*')
    .eq('chef_id', chef.id)
    .order('snapshot_month', { ascending: false })
    .limit(2)

  const latest = data?.[0]
  const previous = data?.[1]

  if (!latest) {
    return {
      snapshotMonth: '',
      uniqueVisitors: null,
      pageviews: null,
      bounceRatePercent: null,
      avgSessionSeconds: null,
      topSource: null,
      inquiryConversionRatePercent: null,
      previousMonth: null,
    }
  }

  return {
    snapshotMonth: latest.snapshot_month,
    uniqueVisitors: latest.unique_visitors,
    pageviews: latest.pageviews,
    bounceRatePercent: latest.bounce_rate_percent,
    avgSessionSeconds: latest.avg_session_seconds,
    topSource: latest.top_source,
    inquiryConversionRatePercent: latest.inquiry_conversion_rate_percent,
    previousMonth: previous
      ? { uniqueVisitors: previous.unique_visitors, pageviews: previous.pageviews }
      : null,
  }
}
