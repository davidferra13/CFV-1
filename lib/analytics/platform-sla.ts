'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// Per-platform target response time in hours
export const PLATFORM_SLA_TARGETS: Record<string, number> = {
  thumbtack: 2,
  take_a_chef: 4,
  yhangry: 4,
  bark: 8,
  theknot: 8,
  cozymeal: 8,
  gigsalad: 8,
  privatechefmanager: 12,
  hireachef: 12,
  cuisineistchef: 12,
  google_business: 24,
  wix: 24,
  email: 24,
  text: 4,
  phone: 4,
  instagram: 8,
}

const DEFAULT_SLA_HOURS = 24

export interface InquiryUrgencyWithSLA {
  inquiryId: string
  channel: string
  hoursWaiting: number
  hasResponse: boolean
  urgencyLevel: 'overdue' | 'urgent' | 'ok' | 'responded'
  sla: {
    targetHours: number
    elapsedHours: number
    percentUsed: number // 0-100+, can exceed 100 if breached
    breached: boolean
  }
}

/**
 * Compute per-inquiry urgency with platform-specific SLA targets.
 * Extends the base urgency system by factoring in each platform's expected response time.
 */
export async function getInquiryUrgenciesWithSLA(): Promise<InquiryUrgencyWithSLA[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch open inquiries with channel info
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, created_at, status, channel')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (!inquiries?.length) return []

  // Fetch first outbound message per inquiry
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: messages } = await supabase
    .from('messages')
    .select('inquiry_id, created_at')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: true })

  const firstResponse = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.inquiry_id && !firstResponse.has(m.inquiry_id)) {
      firstResponse.set(m.inquiry_id, m.created_at)
    }
  }

  const now = Date.now()
  return inquiries.map((inq: any) => {
    const hasResponse = firstResponse.has(inq.id)
    const channel = inq.channel || 'other'
    const targetHours = PLATFORM_SLA_TARGETS[channel] ?? DEFAULT_SLA_HOURS

    let elapsedHours: number
    if (hasResponse) {
      const responseTime = new Date(firstResponse.get(inq.id)!).getTime()
      elapsedHours = (responseTime - new Date(inq.created_at).getTime()) / 3600000
    } else {
      elapsedHours = (now - new Date(inq.created_at).getTime()) / 3600000
    }

    const hoursWaiting = hasResponse ? 0 : elapsedHours
    const percentUsed = (elapsedHours / targetHours) * 100
    const breached = elapsedHours > targetHours

    let urgencyLevel: InquiryUrgencyWithSLA['urgencyLevel'] = 'responded'
    if (!hasResponse) {
      if (hoursWaiting >= 24) urgencyLevel = 'overdue'
      else if (hoursWaiting >= 4) urgencyLevel = 'urgent'
      else urgencyLevel = 'ok'
    }

    return {
      inquiryId: inq.id,
      channel,
      hoursWaiting: Math.round(hoursWaiting * 10) / 10,
      hasResponse,
      urgencyLevel,
      sla: {
        targetHours,
        elapsedHours: Math.round(elapsedHours * 10) / 10,
        percentUsed: Math.round(percentUsed * 10) / 10,
        breached,
      },
    }
  })
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
  wix: 'Wix',
  thumbtack: 'Thumbtack',
  theknot: 'The Knot',
  bark: 'Bark',
  cozymeal: 'Cozymeal',
  gigsalad: 'GigSalad',
  google_business: 'Google',
  privatechefmanager: 'PrivateChefManager',
  hireachef: 'HireAChef',
  cuisineistchef: 'CuisineistChef',
  other: 'Other',
}

export interface PlatformSLAStat {
  channel: string // display name
  channelKey: string // raw key
  totalInquiries: number
  respondedCount: number
  breachedCount: number
  avgResponseHours: number | null
  slaHitRate: number // percentage 0-100
  targetHours: number
}

/**
 * Compute per-platform SLA statistics across all inquiries (not just open ones).
 * Returns channels with 2+ inquiries, sorted by total inquiry count descending.
 */
export async function getPlatformSLAStats(): Promise<PlatformSLAStat[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all inquiries with channel info
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, created_at, channel, status')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (!inquiries?.length) return []

  // Fetch first outbound message per inquiry
  const inquiryIds = inquiries.map((i: any) => i.id)
  const { data: messages } = await supabase
    .from('messages')
    .select('inquiry_id, created_at')
    .in('inquiry_id', inquiryIds)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: true })

  const firstResponse = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.inquiry_id && !firstResponse.has(m.inquiry_id)) {
      firstResponse.set(m.inquiry_id, m.created_at)
    }
  }

  // Group by channel
  const channelGroups = new Map<
    string,
    {
      total: number
      responded: number
      breached: number
      responseTimes: number[] // hours
    }
  >()

  for (const inq of inquiries) {
    const channel = inq.channel || 'other'
    if (!channelGroups.has(channel)) {
      channelGroups.set(channel, { total: 0, responded: 0, breached: 0, responseTimes: [] })
    }
    const group = channelGroups.get(channel)!
    group.total++

    if (firstResponse.has(inq.id)) {
      const responseMs =
        new Date(firstResponse.get(inq.id)!).getTime() - new Date(inq.created_at).getTime()
      const responseHours = responseMs / 3600000
      group.responded++
      group.responseTimes.push(responseHours)

      const targetHours = PLATFORM_SLA_TARGETS[channel] ?? DEFAULT_SLA_HOURS
      if (responseHours > targetHours) {
        group.breached++
      }
    }
  }

  // Build results, filter to channels with 2+ inquiries, sort by total desc
  const results: PlatformSLAStat[] = []
  for (const [channelKey, group] of channelGroups) {
    if (group.total < 2) continue

    const targetHours = PLATFORM_SLA_TARGETS[channelKey] ?? DEFAULT_SLA_HOURS
    const avgResponseHours =
      group.responseTimes.length > 0
        ? Math.round(
            (group.responseTimes.reduce((a, b) => a + b, 0) / group.responseTimes.length) * 10
          ) / 10
        : null
    const slaHitRate =
      group.responded > 0
        ? Math.round(((group.responded - group.breached) / group.responded) * 1000) / 10
        : 0

    results.push({
      channel: CHANNEL_DISPLAY[channelKey] || channelKey,
      channelKey,
      totalInquiries: group.total,
      respondedCount: group.responded,
      breachedCount: group.breached,
      avgResponseHours,
      slaHitRate,
      targetHours,
    })
  }

  results.sort((a, b) => b.totalInquiries - a.totalInquiries)
  return results
}
