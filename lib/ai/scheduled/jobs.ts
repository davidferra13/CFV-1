'use server'

// Scheduled Intelligence Layer — Job Implementations
// PRIVACY: All jobs handle tenant business data → local Ollama only.
//
// Each job is called by the queue worker on a schedule.
// Jobs that are pure SQL run on PC. Jobs needing LLM prefer the Pi.

import { createAdminClient } from '@/lib/supabase/admin'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { z } from 'zod'

// ============================================
// SHARED HELPERS
// ============================================

async function loadChefName(supabase: any, tenantId: string): Promise<string> {
  const { data } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', tenantId)
    .single()
  return data?.full_name ?? data?.business_name ?? 'Chef'
}

// ============================================
// 1. DAILY BRIEFING PRE-GEN
// ============================================

export async function handleDailyBriefing(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Gather data for briefing
  const [events, inquiries, chefName] = await Promise.all([
    supabase
      .from('events')
      .select('id, occasion, event_date, guest_count, status, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', threeDaysOut)
      .not('status', 'in', '("cancelled")')
      .order('event_date', { ascending: true })
      .limit(10)
      .then((r: any) => r.data ?? []),
    supabase
      .from('inquiries')
      .select('id, created_at, status')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef'])
      .limit(10)
      .then((r: any) => r.data ?? []),
    loadChefName(supabase, tenantId),
  ])

  const BriefingSchema = z.object({
    greeting: z.string(),
    todayFocus: z.array(z.string()),
    upcomingEvents: z.array(z.string()),
    actionItems: z.array(z.string()),
  })

  try {
    const result = await parseWithOllama(
      `You are Remy, ${chefName}'s AI kitchen assistant. Generate a concise daily briefing. Be warm but efficient. Today is ${today}. Return JSON: { "greeting": "short morning greeting", "todayFocus": ["3 priorities"], "upcomingEvents": ["event summaries"], "actionItems": ["things needing attention"] }`,
      `Events coming up:\n${events.map((e: any) => `- ${e.occasion ?? 'Event'} on ${e.event_date} for ${e.client?.full_name ?? 'client'} (${e.guest_count ?? '?'} guests, status: ${e.status})`).join('\n') || 'None in next 3 days'}\n\nOpen inquiries: ${inquiries.length}\nDate: ${today}`,
      BriefingSchema,
      { modelTier: 'standard', maxTokens: 800 }
    )

    return { ...result, generatedAt: new Date().toISOString() }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    // Fallback: simple data-only briefing
    return {
      greeting: `Good morning, ${chefName}!`,
      todayFocus: [
        `${events.length} events in the next 3 days`,
        `${inquiries.length} open inquiries`,
      ],
      upcomingEvents: events.map((e: any) => `${e.occasion ?? 'Event'} on ${e.event_date}`),
      actionItems: inquiries.length > 0 ? ['Review open inquiries'] : [],
      generatedAt: new Date().toISOString(),
      fallback: true,
    }
  }
}

// ============================================
// 2. AUTO LEAD SCORING
// ============================================

export async function handleLeadScoring(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  // Find inquiries without scores
  const { data: unscoredInquiries } = await (supabase
    .from('inquiries')
    .select(
      'id, channel, confirmed_budget_cents, confirmed_guest_count, created_at, client:clients(full_name, email)'
    )
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef'])
    .is('lead_score' as any, null)
    .limit(10) as any)

  if (!unscoredInquiries || unscoredInquiries.length === 0) {
    return { scored: 0, summary: 'No unscored inquiries.' }
  }

  let scored = 0
  for (const inq of unscoredInquiries) {
    // Same scoring logic as reactive handler — pure rules, no LLM
    let score = 50
    if (inq.confirmed_budget_cents && inq.confirmed_budget_cents > 100000) score += 15
    if (inq.confirmed_guest_count && inq.confirmed_guest_count >= 20) score += 10
    if (inq.channel === 'referral') score += 20
    else if (inq.channel === 'website') score += 5
    if ((inq as any).client?.email) score += 5
    score = Math.min(score, 100)

    await (supabase
      .from('inquiries')
      .update({ lead_score: score } as any)
      .eq('id', inq.id) as any)
    scored++
  }

  return { scored, summary: `Scored ${scored} inquiries.` }
}

// ============================================
// 3. WEEKLY BUSINESS INSIGHTS (heavy — Pi preferred)
// ============================================

export async function handleWeeklyInsights(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const chefName = await loadChefName(supabase, tenantId)

  // Gather weekly metrics
  const [completedEvents, newInquiries, newClients] = await Promise.all([
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('event_date', weekAgo)
      .then((r: any) => r.count ?? 0),
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo)
      .then((r: any) => r.count ?? 0),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo)
      .then((r: any) => r.count ?? 0),
  ])

  const InsightsSchema = z.object({
    headline: z.string(),
    wins: z.array(z.string()),
    watchOuts: z.array(z.string()),
    recommendations: z.array(z.string()),
  })

  try {
    const result = await parseWithOllama(
      `You are Remy, ${chefName}'s AI business advisor. Generate a concise weekly business insights report. Be encouraging but honest. Return JSON: { "headline": "one-sentence summary", "wins": ["good things"], "watchOuts": ["concerns"], "recommendations": ["actionable suggestions"] }`,
      `This week's metrics:
- ${completedEvents} events completed
- ${newInquiries} new inquiries
- ${newClients} new clients`,
      InsightsSchema,
      { modelTier: 'standard', maxTokens: 800 }
    )

    return {
      ...result,
      metrics: { completedEvents, newInquiries, newClients },
      generatedAt: now.toISOString(),
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return {
      headline: 'Weekly summary available',
      metrics: { completedEvents, newInquiries, newClients },
      generatedAt: now.toISOString(),
      fallback: true,
    }
  }
}

// ============================================
// 4. REVENUE GOAL PROGRESS (heavy — Pi preferred)
// ============================================

export async function handleRevenueGoal(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  // Get completed events this month for revenue approximation
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthEvents } = await supabase
    .from('events')
    .select('id, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'paid', 'confirmed'])
    .gte('event_date', monthStart.toISOString())

  const totalRevenueCents = (monthEvents ?? []).reduce(
    (sum, e) => sum + ((e as any).quoted_price_cents ?? 0),
    0
  )

  return {
    monthToDateRevenueCents: totalRevenueCents,
    monthToDateRevenueFormatted: `$${(totalRevenueCents / 100).toFixed(2)}`,
    eventsThisMonth: monthEvents?.length ?? 0,
    generatedAt: new Date().toISOString(),
    summary: `Month-to-date: $${(totalRevenueCents / 100).toFixed(2)} from ${monthEvents?.length ?? 0} events.`,
  }
}

// ============================================
// 5. CLIENT CHURN PREDICTION (heavy — Pi preferred)
// ============================================

export async function handleChurnPrediction(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Find clients whose last event was >60 days ago (at-risk)
  const { data: atRiskClients } = await supabase
    .from('clients')
    .select('id, full_name, last_event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lt('last_event_date', sixtyDaysAgo)
    .order('last_event_date', { ascending: true })
    .limit(10)

  return {
    atRiskCount: atRiskClients?.length ?? 0,
    atRiskClients: (atRiskClients ?? []).map((c) => ({
      id: c.id,
      name: (c as any).full_name,
      lastEvent: (c as any).last_event_date,
    })),
    summary: `${atRiskClients?.length ?? 0} clients at risk of churning (no activity in 60+ days).`,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 6. FOOD COST % ALERT (pure SQL — runs on PC)
// ============================================

export async function handleFoodCostAlert(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  // Get recent events with food cost data
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, quoted_price_cents, food_cost_cents')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('food_cost_cents', 'is', null)
    .order('event_date', { ascending: false })
    .limit(10)

  const alerts: Array<{ event: string; foodCostPct: number }> = []

  for (const evt of events ?? []) {
    const price = (evt as any).quoted_price_cents ?? 0
    const cost = (evt as any).food_cost_cents ?? 0
    if (price > 0) {
      const pct = (cost / price) * 100
      if (pct > 35) {
        // Alert threshold: >35% food cost
        alerts.push({ event: (evt as any).occasion ?? 'Event', foodCostPct: Math.round(pct) })
      }
    }
  }

  return {
    alertCount: alerts.length,
    alerts,
    threshold: 35,
    summary:
      alerts.length > 0
        ? `${alerts.length} events with food cost >35%: ${alerts.map((a) => `${a.event} (${a.foodCostPct}%)`).join(', ')}`
        : 'All recent events within healthy food cost margins.',
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 7. PIPELINE BOTTLENECK REPORT (heavy — Pi preferred)
// ============================================

export async function handlePipelineBottleneck(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  // Count events by status
  const statuses = ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress']
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', status as any)
    counts[status] = count ?? 0
  }

  // Identify bottlenecks (where events pile up)
  const bottlenecks: string[] = []
  if (counts.draft > 5) bottlenecks.push(`${counts.draft} events stuck in draft — send proposals`)
  if (counts.proposed > 3) bottlenecks.push(`${counts.proposed} events awaiting client acceptance`)
  if (counts.accepted > 3) bottlenecks.push(`${counts.accepted} accepted events awaiting payment`)

  return {
    pipeline: counts,
    bottlenecks,
    summary:
      bottlenecks.length > 0
        ? `Pipeline bottlenecks: ${bottlenecks.join('; ')}`
        : 'Pipeline flowing smoothly — no bottlenecks detected.',
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 8. CERTIFICATION EXPIRY CHECK (pure SQL)
// ============================================

export async function handleCertExpiry(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: expiringCerts } = await (supabase
    .from('chef_certifications')
    .select('id, cert_type, cert_name, expiry_date')
    .eq('chef_id', tenantId)
    .eq('is_active', true)
    .lte('expiry_date', thirtyDaysOut)
    .order('expiry_date', { ascending: true }) as any)

  const certs = (
    (expiringCerts ?? []) as Array<{
      id: string
      cert_type: string
      cert_name: string | null
      expiry_date: string | null
    }>
  ).map((c) => ({
    id: c.id,
    name: c.cert_name ?? c.cert_type,
    expiryDate: c.expiry_date,
    daysUntil: c.expiry_date
      ? Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }))

  return {
    expiringCount: certs.length,
    certifications: certs,
    summary:
      certs.length > 0
        ? `${certs.length} certification${certs.length !== 1 ? 's' : ''} expiring within 30 days: ${certs.map((c) => `${c.name} (${c.daysUntil}d)`).join(', ')}`
        : 'All certifications current — nothing expiring in the next 30 days.',
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 9. FDA FOOD RECALL MONITORING
// ============================================

export async function handleFoodRecallMonitor(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  // Check FDA recall API (public, no auth needed)
  try {
    const response = await fetch(
      'https://api.fda.gov/food/enforcement.json?search=status:"Ongoing"&limit=5&sort=report_date:desc',
      { signal: AbortSignal.timeout(10000) }
    )

    if (!response.ok) {
      return {
        recalls: [],
        summary: 'FDA API unavailable — will retry.',
        generatedAt: new Date().toISOString(),
      }
    }

    const data = await response.json()
    const recalls = (data.results ?? []).map((r: any) => ({
      product: r.product_description?.substring(0, 100) ?? 'Unknown',
      reason: r.reason_for_recall?.substring(0, 100) ?? 'Unknown',
      date: r.report_date,
      classification: r.classification,
    }))

    return {
      recallCount: recalls.length,
      recalls,
      summary:
        recalls.length > 0
          ? `${recalls.length} active FDA recalls. Review for any ingredients in your upcoming menus.`
          : 'No recent FDA recalls.',
      generatedAt: new Date().toISOString(),
    }
  } catch {
    return {
      recalls: [],
      summary: 'FDA API check failed — will retry.',
      generatedAt: new Date().toISOString(),
    }
  }
}

// ============================================
// 10. QUOTE WIN/LOSS ANALYSIS (heavy — Pi preferred)
// ============================================

export async function handleQuoteAnalysis(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  // Get recent quotes
  const { data: quotes } = await (supabase
    .from('quotes')
    .select('id, status, total_cents, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50) as any)

  if (!quotes || quotes.length === 0) {
    return { summary: 'No quotes to analyze.', generatedAt: new Date().toISOString() }
  }

  const accepted = quotes.filter((q: any) => q.status === 'accepted')
  const rejected = quotes.filter((q: any) => q.status === 'rejected' || q.status === 'expired')
  const winRate = quotes.length > 0 ? Math.round((accepted.length / quotes.length) * 100) : 0

  const avgAcceptedCents =
    accepted.length > 0
      ? Math.round(
          accepted.reduce((sum: number, q: any) => sum + (q.total_cents ?? 0), 0) / accepted.length
        )
      : 0

  return {
    totalQuotes: quotes.length,
    accepted: accepted.length,
    rejected: rejected.length,
    winRate,
    avgAcceptedAmount: `$${(avgAcceptedCents / 100).toFixed(2)}`,
    summary: `Quote win rate: ${winRate}% (${accepted.length}/${quotes.length}). Average accepted: $${(avgAcceptedCents / 100).toFixed(2)}.`,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 11. PLATFORM ANOMALY DETECTION (heavy — Pi preferred)
// ============================================

export async function handleAnomalyDetection(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Check for anomalies in the last 24h
  const anomalies: string[] = []

  // 1. Failed state transitions
  const { count: failedTransitions } = await supabase
    .from('event_state_transitions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', yesterday)
    .not('metadata->requires_manual_review', 'is', null)

  if ((failedTransitions ?? 0) > 0) {
    anomalies.push(`${failedTransitions} failed event transitions in the last 24h`)
  }

  // 2. Unusually high inquiry volume (>10 in a day)
  const { count: inquiryCount } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', yesterday)

  if ((inquiryCount ?? 0) > 10) {
    anomalies.push(`Unusual inquiry spike: ${inquiryCount} in 24h`)
  }

  return {
    anomalyCount: anomalies.length,
    anomalies,
    summary:
      anomalies.length > 0
        ? `${anomalies.length} anomaly detected: ${anomalies.join('; ')}`
        : 'No anomalies detected in the last 24 hours.',
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 12. MENU ENGINEERING REPORT (heavy — Pi preferred)
// ============================================

export async function handleMenuEngineering(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  // Get most-used menu items across events
  const { data: menuItems } = await (supabase
    .from('menu_items' as any)
    .select('id, name, price_cents, recipe_id')
    .eq('tenant_id', tenantId)
    .limit(50) as any)

  if (!menuItems || menuItems.length === 0) {
    return { summary: 'No menu items to analyze.', generatedAt: new Date().toISOString() }
  }

  // Count items and aggregate pricing
  const items = (menuItems as any[]).map((item) => ({
    name: item.name,
    priceCents: item.price_cents ?? 0,
    hasRecipe: !!item.recipe_id,
  }))

  const avgPriceCents =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.priceCents, 0) / items.length)
      : 0

  const withRecipes = items.filter((i) => i.hasRecipe).length
  const withoutRecipes = items.filter((i) => !i.hasRecipe).length

  return {
    totalItems: items.length,
    avgItemPrice: `$${(avgPriceCents / 100).toFixed(2)}`,
    withRecipes,
    withoutRecipes,
    summary: `${items.length} menu items analyzed. Average price: $${(avgPriceCents / 100).toFixed(2)}. ${withoutRecipes} items missing recipe links.`,
    generatedAt: new Date().toISOString(),
  }
}
