'use server'

// Communication Triage Suggestions
// Analyzes inquiry patterns (response times, channels, keywords) and suggests
// triage rules to help the chef handle incoming communications faster.
// Pure math/pattern matching only, no AI.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type TriageSuggestionRuleConfig = {
  field: string
  op: 'eq' | 'contains' | 'gte' | 'lte'
  value: string | number
  action: 'prioritize' | 'auto_snooze' | 'auto_label' | 'auto_assign'
  actionConfig: Record<string, string>
}

export type TriageSuggestion = {
  id: string
  suggestion: string
  reasoning: string
  ruleConfig: TriageSuggestionRuleConfig
  impact: 'high' | 'medium' | 'low'
}

// ── Thresholds ─────────────────────────────────────────────────────────────

const SLOW_RESPONSE_HOURS = 24
const HIGH_VALUE_GUEST_COUNT = 20
const REPEAT_CLIENT_THRESHOLD = 2
const MIN_EVENTS_FOR_ANALYSIS = 5

// ── Server Action ──────────────────────────────────────────────────────────

export async function getTriageSuggestions(): Promise<TriageSuggestion[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const suggestions: TriageSuggestion[] = []

  // Fetch recent inquiries (last 90 days) for pattern analysis
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, channel, occasion, guest_count, budget_cents, status, created_at, updated_at, client_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!inquiries || inquiries.length < MIN_EVENTS_FOR_ANALYSIS) {
    return suggestions
  }

  // ── Pattern 1: Slow response by channel ──────────────────────────────────
  // Find channels where average response time is slowest
  const channelResponseTimes: Record<string, number[]> = {}
  for (const inq of inquiries) {
    if (!inq.channel || !inq.created_at || !inq.updated_at) continue
    const created = new Date(inq.created_at).getTime()
    const updated = new Date(inq.updated_at).getTime()
    const hoursToRespond = (updated - created) / (1000 * 60 * 60)
    if (hoursToRespond > 0 && hoursToRespond < 720) {
      // cap at 30 days
      if (!channelResponseTimes[inq.channel]) channelResponseTimes[inq.channel] = []
      channelResponseTimes[inq.channel].push(hoursToRespond)
    }
  }

  for (const [channel, times] of Object.entries(channelResponseTimes)) {
    if (times.length < 3) continue
    const avgHours = times.reduce((a, b) => a + b, 0) / times.length
    if (avgHours > SLOW_RESPONSE_HOURS) {
      suggestions.push({
        id: `slow-channel-${channel}`,
        suggestion: `Prioritize ${channel} inquiries`,
        reasoning: `Your average response time for ${channel} inquiries is ${Math.round(avgHours)} hours. Prioritizing these could help you respond faster.`,
        ruleConfig: {
          field: 'channel',
          op: 'eq',
          value: channel,
          action: 'prioritize',
          actionConfig: { priority: 'high' },
        },
        impact: avgHours > 48 ? 'high' : 'medium',
      })
    }
  }

  // ── Pattern 2: High-value inquiries (large guest count) ──────────────────
  const highValueInquiries = inquiries.filter(
    (inq) => inq.guest_count != null && inq.guest_count >= HIGH_VALUE_GUEST_COUNT
  )
  if (highValueInquiries.length >= 2) {
    const avgGuestCount = Math.round(
      highValueInquiries.reduce((s, i) => s + (i.guest_count ?? 0), 0) / highValueInquiries.length
    )
    suggestions.push({
      id: 'high-guest-count',
      suggestion: `Auto-prioritize large events (${HIGH_VALUE_GUEST_COUNT}+ guests)`,
      reasoning: `You have received ${highValueInquiries.length} inquiries for ${HIGH_VALUE_GUEST_COUNT}+ guests in the last 90 days (avg ${avgGuestCount} guests). These high-value events deserve faster attention.`,
      ruleConfig: {
        field: 'guest_count',
        op: 'gte',
        value: HIGH_VALUE_GUEST_COUNT,
        action: 'prioritize',
        actionConfig: { priority: 'high', label: 'Large Event' },
      },
      impact: 'high',
    })
  }

  // ── Pattern 3: Repeat clients ────────────────────────────────────────────
  const clientInquiryCounts: Record<string, number> = {}
  for (const inq of inquiries) {
    if (inq.client_id) {
      clientInquiryCounts[inq.client_id] = (clientInquiryCounts[inq.client_id] ?? 0) + 1
    }
  }
  const repeatClientCount = Object.values(clientInquiryCounts).filter(
    (c) => c >= REPEAT_CLIENT_THRESHOLD
  ).length

  if (repeatClientCount >= 2) {
    suggestions.push({
      id: 'repeat-clients',
      suggestion: 'Auto-label repeat clients',
      reasoning: `${repeatClientCount} clients have sent ${REPEAT_CLIENT_THRESHOLD}+ inquiries in the last 90 days. Labeling them helps you prioritize loyal clients.`,
      ruleConfig: {
        field: 'inquiry_count',
        op: 'gte',
        value: REPEAT_CLIENT_THRESHOLD,
        action: 'auto_label',
        actionConfig: { label: 'Repeat Client' },
      },
      impact: 'medium',
    })
  }

  // ── Pattern 4: Common high-budget inquiries ──────────────────────────────
  const budgetInquiries = inquiries.filter((inq) => inq.budget_cents != null && inq.budget_cents > 0)
  if (budgetInquiries.length >= 3) {
    const sortedBudgets = budgetInquiries
      .map((i) => i.budget_cents!)
      .sort((a, b) => b - a)
    const topQuartile = sortedBudgets[Math.floor(sortedBudgets.length * 0.25)]

    if (topQuartile && topQuartile > 50000) {
      // over $500
      suggestions.push({
        id: 'high-budget',
        suggestion: `Prioritize inquiries over $${Math.round(topQuartile / 100)}`,
        reasoning: `Your top 25% of inquiries have budgets over $${Math.round(topQuartile / 100)}. Prioritizing these could increase revenue.`,
        ruleConfig: {
          field: 'budget_cents',
          op: 'gte',
          value: topQuartile,
          action: 'prioritize',
          actionConfig: { priority: 'high', label: 'High Budget' },
        },
        impact: 'high',
      })
    }
  }

  // ── Pattern 5: Channel with high conversion ──────────────────────────────
  const channelConversion: Record<string, { total: number; converted: number }> = {}
  for (const inq of inquiries) {
    if (!inq.channel) continue
    if (!channelConversion[inq.channel]) {
      channelConversion[inq.channel] = { total: 0, converted: 0 }
    }
    channelConversion[inq.channel].total++
    // "converted" = moved past initial inquiry status
    if (inq.status && inq.status !== 'new' && inq.status !== 'expired') {
      channelConversion[inq.channel].converted++
    }
  }

  let bestChannel: string | null = null
  let bestRate = 0
  for (const [channel, stats] of Object.entries(channelConversion)) {
    if (stats.total < 3) continue
    const rate = stats.converted / stats.total
    if (rate > bestRate) {
      bestRate = rate
      bestChannel = channel
    }
  }

  if (bestChannel && bestRate > 0.5) {
    suggestions.push({
      id: `high-conversion-${bestChannel}`,
      suggestion: `Prioritize ${bestChannel} (${Math.round(bestRate * 100)}% conversion)`,
      reasoning: `${bestChannel} has your highest inquiry-to-event conversion rate at ${Math.round(bestRate * 100)}%. Responding quickly to these could mean more bookings.`,
      ruleConfig: {
        field: 'channel',
        op: 'eq',
        value: bestChannel,
        action: 'prioritize',
        actionConfig: { priority: 'high' },
      },
      impact: 'medium',
    })
  }

  // ── Pattern 6: Snooze low-signal channels ────────────────────────────────
  let worstChannel: string | null = null
  let worstRate = 1
  for (const [channel, stats] of Object.entries(channelConversion)) {
    if (stats.total < 3) continue
    const rate = stats.converted / stats.total
    if (rate < worstRate) {
      worstRate = rate
      worstChannel = channel
    }
  }

  if (worstChannel && worstRate < 0.2 && worstChannel !== bestChannel) {
    suggestions.push({
      id: `low-conversion-${worstChannel}`,
      suggestion: `Auto-snooze ${worstChannel} inquiries`,
      reasoning: `Only ${Math.round(worstRate * 100)}% of ${worstChannel} inquiries convert. Auto-snoozing these keeps your inbox focused on higher-value leads.`,
      ruleConfig: {
        field: 'channel',
        op: 'eq',
        value: worstChannel,
        action: 'auto_snooze',
        actionConfig: { snooze_hours: '24' },
      },
      impact: 'low',
    })
  }

  // Sort by impact (high first)
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => (impactOrder[a.impact] ?? 2) - (impactOrder[b.impact] ?? 2))

  return suggestions
}
