'use server'

// Next Best Action Engine
// Determines the single most impactful action the chef should take for each client.
// Based on health tier, open inquiries, event history, and milestone data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getClientHealthScores } from '@/lib/clients/health-score'
import type { ClientHealthTier } from '@/lib/clients/health-score'

export type NBAUrgency = 'critical' | 'high' | 'normal' | 'low'

export type NextBestAction = {
  clientId: string
  clientName: string
  actionType:
    | 'reply_inquiry'
    | 'follow_up_quote'
    | 're_engage'
    | 'schedule_event'
    | 'request_feedback'
    | 'send_birthday'
    | 'ask_referral'
    | 'reach_out'
    | 'none'
  label: string
  description: string
  href: string
  urgency: NBAUrgency
  tier: ClientHealthTier
  healthScore: number
}

// ─── Main action ──────────────────────────────────────────────────────────────

/**
 * Returns Next Best Action recommendations for all active clients.
 * Sorted by urgency (critical → high → normal → low).
 */
export async function getNextBestActions(limit = 10): Promise<NextBestAction[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch health scores for all clients
  const { scores } = await getClientHealthScores()

  // Fetch clients basic info
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  const clientNameMap = new Map<string, string>()
  for (const c of clients ?? []) {
    clientNameMap.set(c.id, c.full_name || 'Unknown')
  }

  // Fetch open inquiries per client
  const { data: openInquiries } = await supabase
    .from('inquiries')
    .select('id, client_id, status')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef', 'awaiting_client'])

  const inquiryMap = new Map<string, { id: string; status: string }[]>()
  for (const inq of openInquiries ?? []) {
    if (!inq.client_id) continue
    if (!inquiryMap.has(inq.client_id)) inquiryMap.set(inq.client_id, [])
    inquiryMap.get(inq.client_id)!.push(inq)
  }

  // Fetch expiring quotes (next 7 days) per client
  const sevenDaysOut = new Date()
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const { data: expiringQuotes } = await supabase
    .from('quotes')
    .select('id, event_id, valid_until')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'sent')
    .lte('valid_until', sevenDaysOut.toISOString())
    .gte('valid_until', new Date().toISOString())

  // Resolve expiring quotes to client IDs via events
  const quoteEventIds = (expiringQuotes ?? [])
    .map((q: any) => q.event_id)
    .filter((id: any): id is string => id != null)
  const expiringClientIds = new Set<string>()
  if (quoteEventIds.length > 0) {
    const { data: quoteEvents } = await supabase
      .from('events')
      .select('id, client_id')
      .in('id', quoteEventIds)
    for (const ev of quoteEvents ?? []) {
      if (ev.client_id) expiringClientIds.add(ev.client_id)
    }
  }

  // Fetch upcoming milestones (next 14 days) — using personal_milestones field
  const { data: milestonesData } = await supabase
    .from('clients')
    .select('id, personal_milestones')
    .eq('tenant_id', user.tenantId!)
    .not('personal_milestones', 'is', null)

  const upcomingBirthdays = new Set<string>()
  const today = new Date()
  const twoWeeks = new Date(today)
  twoWeeks.setDate(twoWeeks.getDate() + 14)

  for (const c of milestonesData ?? []) {
    // personal_milestones may be a string or array (text[] column)
    const raw = c.personal_milestones
    const text = (Array.isArray(raw) ? raw.join(' ') : String(raw ?? '')).toLowerCase()
    // Simple year-agnostic check: look for month/day patterns
    const months = [
      ['january', 1],
      ['february', 2],
      ['march', 3],
      ['april', 4],
      ['may', 5],
      ['june', 6],
      ['july', 7],
      ['august', 8],
      ['september', 9],
      ['october', 10],
      ['november', 11],
      ['december', 12],
    ] as [string, number][]

    for (const [monthName, monthNum] of months) {
      const regex = new RegExp(`${monthName}\\s+(\\d{1,2})`)
      const match = text.match(regex)
      if (match) {
        const day = parseInt(match[1], 10)
        const candidate = new Date(today.getFullYear(), monthNum - 1, day)
        // Also check next year if already passed
        if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
        if (candidate <= twoWeeks) {
          upcomingBirthdays.add(c.id)
          break
        }
      }
    }
  }

  // Compute NBA for each client
  const URGENCY_ORDER: NBAUrgency[] = ['critical', 'high', 'normal', 'low']
  const urgencyRank = (u: NBAUrgency) => URGENCY_ORDER.indexOf(u)

  const actions: NextBestAction[] = []

  for (const score of scores) {
    const clientId = score.clientId
    const clientName = clientNameMap.get(clientId) ?? 'Unknown Client'
    const inqs = inquiryMap.get(clientId) ?? []
    const hasExpiringQuote = expiringClientIds.has(clientId)
    const hasBirthday = upcomingBirthdays.has(clientId)

    // Priority order:
    // 1. Awaiting chef inquiry → critical
    // 2. Expiring quote → high
    // 3. Birthday coming → high
    // 4. At-risk → reach out → high
    // 5. Champion → ask referral → normal
    // 6. Dormant → re-engage → normal
    // 7. New → schedule first event → normal
    // 8. Loyal → nothing urgent → low

    let action: NextBestAction

    const awaitingChef = inqs.find((i) => i.status === 'awaiting_chef')
    if (awaitingChef) {
      action = {
        clientId,
        clientName,
        actionType: 'reply_inquiry',
        label: 'Reply to inquiry',
        description: 'This client is waiting for your response.',
        href: `/inquiries`,
        urgency: 'critical',
        tier: score.tier,
        healthScore: score.score,
      }
    } else if (hasExpiringQuote) {
      action = {
        clientId,
        clientName,
        actionType: 'follow_up_quote',
        label: 'Follow up on quote',
        description: 'A sent quote is expiring in the next 7 days.',
        href: `/clients/${clientId}`,
        urgency: 'high',
        tier: score.tier,
        healthScore: score.score,
      }
    } else if (hasBirthday) {
      action = {
        clientId,
        clientName,
        actionType: 'send_birthday',
        label: 'Send birthday/anniversary message',
        description: 'A special date is coming up in the next 2 weeks.',
        href: `/clients/${clientId}`,
        urgency: 'high',
        tier: score.tier,
        healthScore: score.score,
      }
    } else if (score.tier === 'at_risk') {
      action = {
        clientId,
        clientName,
        actionType: 'reach_out',
        label: 'Reach out before going cold',
        description: `No event in ${score.daysSinceLastEvent ?? '?'} days — time to reconnect.`,
        href: `/clients/${clientId}`,
        urgency: 'high',
        tier: score.tier,
        healthScore: score.score,
      }
    } else if (score.tier === 'champion') {
      action = {
        clientId,
        clientName,
        actionType: 'ask_referral',
        label: 'Ask for a referral',
        description: 'This is one of your strongest relationships — ideal for referrals.',
        href: `/clients/${clientId}`,
        urgency: 'normal',
        tier: score.tier,
        healthScore: score.score,
      }
    } else if (score.tier === 'dormant') {
      action = {
        clientId,
        clientName,
        actionType: 're_engage',
        label: 'Re-engage dormant client',
        description: 'This client has not booked in over a year.',
        href: `/clients/${clientId}`,
        urgency: 'normal',
        tier: score.tier,
        healthScore: score.score,
      }
    } else if (score.tier === 'new' && score.totalEvents === 0) {
      action = {
        clientId,
        clientName,
        actionType: 'schedule_event',
        label: 'Schedule their first event',
        description: 'Convert this new contact into a first booking.',
        href: `/clients/${clientId}`,
        urgency: 'normal',
        tier: score.tier,
        healthScore: score.score,
      }
    } else {
      continue // No urgent action needed
    }

    actions.push(action)
  }

  // Sort: critical first, then by health score descending within each tier
  actions.sort((a, b) => {
    const urgencyDiff = urgencyRank(a.urgency) - urgencyRank(b.urgency)
    if (urgencyDiff !== 0) return urgencyDiff
    return b.healthScore - a.healthScore
  })

  return actions.slice(0, limit)
}

/**
 * Get Next Best Action for a single client.
 */
export async function getClientNextBestAction(clientId: string): Promise<NextBestAction | null> {
  const all = await getNextBestActions(50)
  return all.find((a) => a.clientId === clientId) ?? null
}
