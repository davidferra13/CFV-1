'use server'

// Scheduled Intelligence Layer - Job Implementations
// PRIVACY: All jobs handle tenant business data → local Ollama only.
//
// Each job is called by the queue worker on a schedule.
// Jobs that are pure SQL run on PC. Jobs needing LLM prefer the Pi.

import { createAdminClient } from '@/lib/db/admin'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { enqueueTask } from '@/lib/ai/queue/actions'
import { AI_PRIORITY } from '@/lib/ai/queue/types'
import { z } from 'zod'

// ============================================
// SHARED HELPERS
// ============================================

async function loadChefName(db: any, tenantId: string): Promise<string> {
  const { data } = await db
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
  const db: any = createAdminClient()
  const _nj1 = new Date()
  const _lij = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const today = _lij(_nj1)
  const threeDaysOut = _lij(new Date(_nj1.getFullYear(), _nj1.getMonth(), _nj1.getDate() + 3))

  // Gather data for briefing
  const [events, inquiries, chefName] = await Promise.all([
    db
      .from('events')
      .select('id, occasion, event_date, guest_count, status, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', today)
      .lte('event_date', threeDaysOut)
      .not('status', 'in', '("cancelled")')
      .order('event_date', { ascending: true })
      .limit(10)
      .then((r: any) => r.data ?? []),
    db
      .from('inquiries')
      .select('id, created_at, status')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef'])
      .limit(10)
      .then((r: any) => r.data ?? []),
    loadChefName(db, tenantId),
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
  const db: any = createAdminClient()

  // Find inquiries without scores
  const { data: unscoredInquiries } = await (db
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
    // Same scoring logic as reactive handler - pure rules, no LLM
    let score = 50
    if (inq.confirmed_budget_cents && inq.confirmed_budget_cents > 100000) score += 15
    if (inq.confirmed_guest_count && inq.confirmed_guest_count >= 20) score += 10
    if (inq.channel === 'referral') score += 20
    else if (inq.channel === 'website') score += 5
    if ((inq as any).client?.email) score += 5
    score = Math.min(score, 100)

    await (db
      .from('inquiries')
      .update({ lead_score: score } as any)
      .eq('id', inq.id) as any)
    scored++
  }

  return { scored, summary: `Scored ${scored} inquiries.` }
}

// ============================================
// 3. WEEKLY BUSINESS INSIGHTS (heavy - Pi preferred)
// ============================================

export async function handleWeeklyInsights(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const chefName = await loadChefName(db, tenantId)

  // Gather weekly metrics
  const [completedEvents, newInquiries, newClients] = await Promise.all([
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('event_date', weekAgo)
      .then((r: any) => r.count ?? 0),
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo)
      .then((r: any) => r.count ?? 0),
    db
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
// 4. REVENUE GOAL PROGRESS (heavy - Pi preferred)
// ============================================

export async function handleRevenueGoal(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()

  // Get completed events this month for revenue approximation
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthEvents } = await db
    .from('events')
    .select('id, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'paid', 'confirmed'])
    .gte('event_date', monthStart.toISOString())

  const totalRevenueCents = (monthEvents ?? []).reduce(
    (sum: any, e: any) => sum + ((e as any).quoted_price_cents ?? 0),
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
// 5. CLIENT CHURN PREDICTION (heavy - Pi preferred)
// ============================================

export async function handleChurnPrediction(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Find clients whose last event was >60 days ago (at-risk)
  const { data: atRiskClients } = await db
    .from('clients')
    .select('id, full_name, last_event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lt('last_event_date', sixtyDaysAgo)
    .order('last_event_date', { ascending: true })
    .limit(10)

  return {
    atRiskCount: atRiskClients?.length ?? 0,
    atRiskClients: (atRiskClients ?? []).map((c: any) => ({
      id: c.id,
      name: (c as any).full_name,
      lastEvent: (c as any).last_event_date,
    })),
    summary: `${atRiskClients?.length ?? 0} clients at risk of churning (no activity in 60+ days).`,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 6. FOOD COST % ALERT (pure SQL - runs on PC)
// ============================================

export async function handleFoodCostAlert(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()

  // Get recent events with food cost data
  const { data: events } = await db
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
// 7. PIPELINE BOTTLENECK REPORT (heavy - Pi preferred)
// ============================================

export async function handlePipelineBottleneck(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()

  // Count events by status
  const statuses = ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress']
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    const { count } = await db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', status as any)
    counts[status] = count ?? 0
  }

  // Identify bottlenecks (where events pile up)
  const bottlenecks: string[] = []
  if (counts.draft > 5) bottlenecks.push(`${counts.draft} events stuck in draft - send proposals`)
  if (counts.proposed > 3) bottlenecks.push(`${counts.proposed} events awaiting client acceptance`)
  if (counts.accepted > 3) bottlenecks.push(`${counts.accepted} accepted events awaiting payment`)

  return {
    pipeline: counts,
    bottlenecks,
    summary:
      bottlenecks.length > 0
        ? `Pipeline bottlenecks: ${bottlenecks.join('; ')}`
        : 'Pipeline flowing smoothly - no bottlenecks detected.',
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
  const db: any = createAdminClient()
  const _nj2 = new Date()
  const thirtyDaysOut = (() => {
    const d = new Date(_nj2.getFullYear(), _nj2.getMonth(), _nj2.getDate() + 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const { data: expiringCerts } = await (db
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
        : 'All certifications current - nothing expiring in the next 30 days.',
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
        summary: 'FDA API unavailable - will retry.',
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
      summary: 'FDA API check failed - will retry.',
      generatedAt: new Date().toISOString(),
    }
  }
}

// ============================================
// 10. QUOTE WIN/LOSS ANALYSIS (heavy - Pi preferred)
// ============================================

export async function handleQuoteAnalysis(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()

  // Get recent quotes
  const { data: quotes } = await (db
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
// 11. PLATFORM ANOMALY DETECTION (heavy - Pi preferred)
// ============================================

export async function handleAnomalyDetection(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Check for anomalies in the last 24h
  const anomalies: string[] = []

  // 1. Failed state transitions
  const { count: failedTransitions } = await db
    .from('event_state_transitions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', yesterday)
    .not('metadata->requires_manual_review', 'is', null)

  if ((failedTransitions ?? 0) > 0) {
    anomalies.push(`${failedTransitions} failed event transitions in the last 24h`)
  }

  // 2. Unusually high inquiry volume (>10 in a day)
  const { count: inquiryCount } = await db
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
// 12. MENU ENGINEERING REPORT (heavy - Pi preferred)
// ============================================

export async function handleMenuEngineering(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()

  // Get most-used menu items across events (menu_items scoped by chef_id)
  const { data: menuItems } = await (db
    .from('menu_items' as any)
    .select('id, name, price_cents, recipe_id')
    .eq('chef_id', tenantId)
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

// ============================================
// 13. STALE INQUIRY SCANNER (pure SQL - triggers reactive.inquiry_stale)
// ============================================

export async function handleStaleInquiryScanner(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Find inquiries that are still open and older than 48h
  const { data: staleInquiries } = await db
    .from('inquiries')
    .select('id, created_at, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_chef'])
    .lt('created_at', fortyEightHoursAgo)
    .order('created_at', { ascending: true })
    .limit(10)

  if (!staleInquiries || staleInquiries.length === 0) {
    return {
      enqueued: 0,
      summary: 'No stale inquiries found.',
      generatedAt: new Date().toISOString(),
    }
  }

  let enqueued = 0
  for (const inq of staleInquiries) {
    try {
      await enqueueTask({
        tenantId,
        taskType: 'reactive.inquiry_stale',
        payload: {
          inquiryId: inq.id,
          clientName: (inq as any).client?.full_name ?? 'Client',
        },
        priority: AI_PRIORITY.SCHEDULED,
        relatedInquiryId: inq.id,
      })
      enqueued++
    } catch {
      // Dedup or queue full - skip silently
    }
  }

  return {
    staleCount: staleInquiries.length,
    enqueued,
    summary: `Found ${staleInquiries.length} stale inquiries (>48h), enqueued ${enqueued} follow-up drafts.`,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 14. PAYMENT OVERDUE SCANNER (pure SQL - triggers reactive.payment_overdue)
// ============================================

export async function handlePaymentOverdueScanner(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Find events in 'accepted' status (awaiting payment) older than 7 days
  const { data: overdueEvents } = await db
    .from('events')
    .select('id, occasion, event_date, client_id, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .lt('updated_at', sevenDaysAgo)
    .order('updated_at', { ascending: true })
    .limit(10)

  if (!overdueEvents || overdueEvents.length === 0) {
    return {
      enqueued: 0,
      summary: 'No overdue payments found.',
      generatedAt: new Date().toISOString(),
    }
  }

  let enqueued = 0
  for (const evt of overdueEvents) {
    try {
      await enqueueTask({
        tenantId,
        taskType: 'reactive.payment_overdue',
        payload: {
          eventId: evt.id,
          clientId: evt.client_id,
          clientName: (evt as any).client?.full_name ?? 'Client',
          occasion: (evt as any).occasion,
        },
        priority: AI_PRIORITY.SCHEDULED,
        relatedEventId: evt.id,
        relatedClientId: evt.client_id ?? undefined,
      })
      enqueued++
    } catch {
      // Dedup or queue full - skip
    }
  }

  return {
    overdueCount: overdueEvents.length,
    enqueued,
    summary: `Found ${overdueEvents.length} events with payments overdue >7d, enqueued ${enqueued} reminder drafts.`,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// 15. SOCIAL POST DRAFT (Ollama-powered - Pi preferred)
// ============================================

export async function handleSocialPostDraft(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const chefName = await loadChefName(db, tenantId)

  // Get recent completed events for inspiration
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentEvents } = await db
    .from('events')
    .select('occasion, guest_count, event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', sevenDaysAgo)
    .order('event_date', { ascending: false })
    .limit(3)

  // Get upcoming events for promotional angle
  const _nj3 = new Date()
  const today = `${_nj3.getFullYear()}-${String(_nj3.getMonth() + 1).padStart(2, '0')}-${String(_nj3.getDate()).padStart(2, '0')}`
  const { data: upcomingEvents } = await db
    .from('events')
    .select('occasion, event_date')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed","draft")')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(3)

  const PostSchema = z.object({
    posts: z.array(
      z.object({
        platform: z.string(),
        caption: z.string(),
        hashtags: z.array(z.string()),
        postType: z.string(),
      })
    ),
  })

  try {
    const result = await parseWithOllama(
      `You are a social media assistant for ${chefName}, a private chef. Generate 2-3 social media post ideas based on their recent activity. Mix promotional and engagement posts. Never mention specific client names - privacy first. Return JSON: { "posts": [{ "platform": "Instagram|Facebook|LinkedIn", "caption": "post text", "hashtags": ["tag1", "tag2"], "postType": "recap|promo|engagement|seasonal" }] }`,
      `Recent completed events:\n${(recentEvents ?? []).map((e: any) => `- ${e.occasion ?? 'Private event'} (${e.guest_count ?? '?'} guests, ${e.event_date})`).join('\n') || 'None this week'}\n\nUpcoming events: ${upcomingEvents?.length ?? 0}\nSeason: ${new Date().toLocaleString('default', { month: 'long' })}`,
      PostSchema,
      { modelTier: 'standard', maxTokens: 800 }
    )

    return {
      postCount: result.posts.length,
      posts: result.posts,
      summary: `Generated ${result.posts.length} social post drafts for ${chefName}.`,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return {
      posts: [],
      summary: 'Could not generate social posts - start Ollama.',
      generatedAt: new Date().toISOString(),
      fallback: true,
    }
  }
}

// ============================================
// 16. CLIENT SENTIMENT MONITORING (pure SQL + light LLM)
// ============================================

export async function handleClientSentiment(
  payload: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db: any = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Gather signals: recent messages, event completion rate, inquiry conversion
  const [recentMessages, completedEvents, cancelledEvents] = await Promise.all([
    db
      .from('messages')
      .select('id, body, sender_role, created_at, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('sender_role', 'client')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((r: any) => r.data ?? []),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('event_date', thirtyDaysAgo)
      .then((r: any) => r.count ?? 0),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'cancelled')
      .gte('event_date', thirtyDaysAgo)
      .then((r: any) => r.count ?? 0),
  ])

  // Pure data signals (no LLM needed for basic metrics)
  const totalEvents = completedEvents + cancelledEvents
  const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 100
  const messageCount = recentMessages.length

  // Aggregate sentiment signals
  const signals: string[] = []
  if (completionRate < 80) signals.push(`Low completion rate: ${completionRate}%`)
  if (cancelledEvents > 2) signals.push(`${cancelledEvents} cancellations in 30 days`)
  if (messageCount === 0) signals.push('No client messages in 30 days - engagement may be dropping')

  // If we have messages and Ollama is running, do a light sentiment scan
  let sentimentAnalysis: Record<string, unknown> | null = null
  if (messageCount > 0) {
    const SentimentSchema = z.object({
      overallSentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
      highlights: z.array(z.string()),
      concerns: z.array(z.string()),
    })

    try {
      const messageSample = recentMessages
        .slice(0, 10)
        .map(
          (m: any) =>
            `[${(m as any).client?.full_name ?? 'Client'}]: ${(m.body ?? '').substring(0, 100)}`
        )
        .join('\n')

      sentimentAnalysis = await parseWithOllama(
        'Analyze the overall client sentiment from these recent messages to a private chef. Look for satisfaction signals, complaints, enthusiasm, or concerns. Do NOT include client names in your output - use "a client" instead. Return JSON: { "overallSentiment": "positive|neutral|negative|mixed", "highlights": ["positive signals"], "concerns": ["negative signals or risks"] }',
        `Recent client messages (last 30 days):\n${messageSample}`,
        SentimentSchema,
        { modelTier: 'fast', maxTokens: 400 }
      )
    } catch (err) {
      if (err instanceof OllamaOfflineError) throw err
      // Fall through to data-only report
    }
  }

  return {
    period: '30 days',
    messageCount,
    completedEvents,
    cancelledEvents,
    completionRate,
    signals,
    sentimentAnalysis,
    summary: sentimentAnalysis
      ? `Client sentiment: ${(sentimentAnalysis as any).overallSentiment}. ${completedEvents} events completed, ${cancelledEvents} cancelled (${completionRate}% completion). ${signals.length > 0 ? `Concerns: ${signals.join('; ')}` : 'No concerns.'}`
      : `${completedEvents} events completed, ${cancelledEvents} cancelled in 30 days (${completionRate}% completion). ${messageCount} client messages. ${signals.length > 0 ? `Signals: ${signals.join('; ')}` : 'All healthy.'}`,
    generatedAt: new Date().toISOString(),
  }
}
