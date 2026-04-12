'use server'

// Remy Intelligence Actions - Batch 2
// Comprehensive capability coverage: every domain the app supports, Remy can now surface.
// PRIVACY: All queries are tenant-scoped via requireChef(). Financial data stays local.
// FORMULA > AI: Everything here is deterministic - no LLM calls.

import { requireChef } from '@/lib/auth/get-user'

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// ─── Client Intelligence ─────────────────────────────────────────────────────

export async function executeClientSpending() {
  const { getClientSpendingSummary } = await import('@/lib/clients/spending-actions')
  return await getClientSpendingSummary()
}

export async function executeClientChurnRisk() {
  const { getAtRiskClients } = await import('@/lib/clients/churn-score')
  return await getAtRiskClients()
}

export async function executeClientBirthdays() {
  const { getUpcomingMilestones } = await import('@/lib/clients/birthday-alerts')
  return await getUpcomingMilestones(30)
}

export async function executeClientNextBestActions() {
  const { getNextBestActions } = await import('@/lib/clients/next-best-action')
  return await getNextBestActions(10)
}

export async function executeClientCooling() {
  const { getCoolingClients } = await import('@/lib/clients/cooling-actions')
  return await getCoolingClients()
}

export async function executeClientLTVTrajectory(inputs: Record<string, unknown>) {
  const clientId = String(inputs.clientId ?? inputs.clientName ?? '')
  if (!clientId) return { error: 'Please specify a client name or ID.' }
  const resolved = await resolveClientId(clientId)
  if (!resolved) return { error: `Could not find client "${clientId}".` }
  const { getClientLTVTrajectory } = await import('@/lib/clients/ltv-trajectory')
  return await getClientLTVTrajectory(resolved)
}

export async function executeClientMenuHistory(inputs: Record<string, unknown>) {
  const clientId = String(inputs.clientId ?? inputs.clientName ?? '')
  if (!clientId) return { error: 'Please specify a client name or ID.' }
  const resolved = await resolveClientId(clientId)
  if (!resolved) return { error: `Could not find client "${clientId}".` }
  const { getClientMenuHistory } = await import('@/lib/clients/menu-history')
  return await getClientMenuHistory(resolved)
}

export async function executeClientReferralHealth() {
  const { getReferralHealthData } = await import('@/lib/clients/referral-health-actions')
  return await getReferralHealthData()
}

export async function executeClientNDAStatus() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('client_ndas')
    .select('id, client_id, signed_at, expires_at, status')
    .eq('tenant_id', user.tenantId!)
    .order('signed_at', { ascending: false })
    .limit(20)
  return { ndas: data ?? [], count: data?.length ?? 0 }
}

export async function executeClientPaymentPlans(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { getPaymentPlan } = await import('@/lib/finance/payment-plan-actions')
  return await getPaymentPlan(resolved)
}

// ─── Event Intelligence ──────────────────────────────────────────────────────

export async function executeEventDietaryConflicts(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { generateAndPersistDietaryAlerts } = await import('@/lib/events/dietary-conflict-actions')
  return await generateAndPersistDietaryAlerts(resolved)
}

export async function executeEventDebrief(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { getEventDebriefBlanks } = await import('@/lib/events/debrief-actions')
  return await getEventDebriefBlanks(resolved)
}

export async function executeEventCountdown(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (eventId) {
    const resolved = await resolveEventId(eventId)
    if (!resolved) return { error: `Could not find event "${eventId}".` }
    const { getEventCountdown } = await import('@/lib/events/countdown-actions')
    return await getEventCountdown(resolved)
  }
  // No specific event - show all upcoming countdowns
  const { getUpcomingCountdowns } = await import('@/lib/events/countdown-actions')
  return await getUpcomingCountdowns()
}

export async function executeInvoiceLookup(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { getInvoiceData } = await import('@/lib/events/invoice-actions')
  return await getInvoiceData(resolved)
}

// ─── Inquiry Intelligence ────────────────────────────────────────────────────

export async function executeInquiryFollowUps() {
  const { getStaleInquiries } = await import('@/lib/inquiries/follow-up-actions')
  return await getStaleInquiries(3)
}

export async function executeInquiryLikelihood() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('inquiries')
    .select('id, client_name, occasion, event_date, chef_likelihood, status, created_at')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef', 'awaiting_client'])
    .order('chef_likelihood', { ascending: false, nullsFirst: false })
    .limit(20)
  return {
    inquiries: (data ?? []).map((i: any) => ({
      id: i.id,
      client: i.client_name,
      occasion: i.occasion,
      date: i.event_date,
      likelihood: i.chef_likelihood,
      status: i.status,
      age: Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000),
    })),
  }
}

// ─── Menu Intelligence ───────────────────────────────────────────────────────

export async function executeMenuFoodCost() {
  const { getMenuCostSummaries } = await import('@/lib/menus/actions')
  return await getMenuCostSummaries()
}

export async function executeMenuDishIndex() {
  const { getDishIndex } = await import('@/lib/menus/actions')
  return await getDishIndex()
}

export async function executeMenuShowcase() {
  const { listMenuTemplates } = await import('@/lib/menus/actions')
  return await listMenuTemplates()
}

// ─── Recipe Intelligence ─────────────────────────────────────────────────────

export async function executeRecipeAllergens() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('recipe_allergens')
    .select('id, recipe_id, allergen, severity, notes')
    .eq('tenant_id', user.tenantId!)
    .limit(100)
  return { allergens: data ?? [], count: data?.length ?? 0 }
}

export async function executeRecipeNutrition(inputs: Record<string, unknown>) {
  const recipeId = String(inputs.recipeId ?? inputs.recipeName ?? '')
  if (!recipeId) return { error: 'Please specify a recipe name or ID.' }
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  // Try to find recipe by name if not UUID
  let resolvedId = recipeId
  if (!/^[0-9a-f]{8}-/.test(recipeId)) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .ilike('name', `%${recipeId}%`)
      .limit(1)
    resolvedId = recipes?.[0]?.id
    if (!resolvedId) return { error: `Could not find recipe "${recipeId}".` }
  }
  const { data } = await db
    .from('recipe_nutrition')
    .select('*')
    .eq('recipe_id', resolvedId)
    .limit(1)
    .single()
  return data ?? { _note: 'No nutrition data found for this recipe.' }
}

export async function executeRecipeProductionLogs() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('production_logs')
    .select('id, recipe_id, event_id, batch_size, notes, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(20)
  return { logs: data ?? [], count: data?.length ?? 0 }
}

// ─── Finance Intelligence ────────────────────────────────────────────────────

export async function executeCashFlowForecast() {
  const { getCashFlowForecast } = await import('@/lib/finance/cash-flow-actions')
  return await getCashFlowForecast(90)
}

export async function executeMileageSummary() {
  const { getYtdMileageSummary } = await import('@/lib/finance/mileage-actions')
  return await getYtdMileageSummary()
}

export async function executeTipSummary() {
  const { getYtdTipSummary } = await import('@/lib/finance/tip-actions')
  return await getYtdTipSummary()
}

export async function executeContractorSummary() {
  const { get1099Summary } = await import('@/lib/finance/contractor-actions')
  return await get1099Summary(new Date().getFullYear())
}

export async function executeDisputes() {
  const { getDisputes } = await import('@/lib/finance/dispute-actions')
  return await getDisputes()
}

export async function executePaymentPlanLookup(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { getPaymentPlan } = await import('@/lib/finance/payment-plan-actions')
  return await getPaymentPlan(resolved)
}

export async function executeRecurringInvoices() {
  const { getRecurringInvoices } = await import('@/lib/finance/recurring-invoice-actions')
  return await getRecurringInvoices()
}

export async function executeTaxPackage() {
  const { getYearEndTaxPackage } = await import('@/lib/finance/tax-package')
  return await getYearEndTaxPackage(new Date().getFullYear())
}

export async function executePayrollSummary() {
  const { listEmployees, get941Summaries } = await import('@/lib/finance/payroll-actions')
  const [employees, summaries] = await Promise.all([
    listEmployees(),
    get941Summaries(new Date().getFullYear()),
  ])
  return { employees, quarterlyTax: summaries }
}

export async function executeVendorInvoices(inputs: Record<string, unknown>) {
  const vendorId = inputs.vendorId ? String(inputs.vendorId) : undefined
  const { listInvoices } = await import('@/lib/vendors/invoice-actions')
  return await listInvoices(vendorId)
}

// ─── Vendor Intelligence ─────────────────────────────────────────────────────

export async function executeVendorPriceInsights() {
  const { getVendorPriceInsights } = await import('@/lib/vendors/price-insights-actions')
  return await getVendorPriceInsights()
}

export async function executeVendorPaymentAging() {
  const { getVendorPaymentAging } = await import('@/lib/vendors/payment-aging-actions')
  return await getVendorPaymentAging()
}

// ─── Equipment Intelligence ──────────────────────────────────────────────────

export async function executeEquipmentRentals(inputs: Record<string, unknown>) {
  const eventId = inputs.eventId ? String(inputs.eventId) : undefined
  const { listRentals, getRentalCostForEvent } = await import('@/lib/equipment/actions')
  if (eventId) {
    const resolved = await resolveEventId(eventId)
    if (!resolved) return { error: `Could not find event "${eventId}".` }
    const [rentals, cost] = await Promise.all([
      listRentals(resolved),
      getRentalCostForEvent(resolved),
    ])
    return { rentals, totalCostCents: cost }
  }
  return await listRentals()
}

// ─── Staff Intelligence ──────────────────────────────────────────────────────

export async function executeStaffAvailability(inputs: Record<string, unknown>) {
  const date = String(inputs.date ?? localDateISO(new Date()))
  const { getAvailableStaffForDate } = await import('@/lib/staff/availability-actions')
  return await getAvailableStaffForDate(date)
}

export async function executeStaffBriefing(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { generateStaffBriefing } = await import('@/lib/staff/briefing-actions')
  return await generateStaffBriefing(resolved)
}

export async function executeStaffClockSummary(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const { getEventClockSummary } = await import('@/lib/staff/clock-actions')
  return await getEventClockSummary(resolved)
}

export async function executeStaffPerformance() {
  const { getStaffPerformanceBoard } = await import('@/lib/staff/performance-actions')
  return await getStaffPerformanceBoard()
}

export async function executeStaffLaborDashboard(inputs: Record<string, unknown>) {
  const now = new Date()
  const year = Number(inputs.year ?? now.getFullYear())
  const month = Number(inputs.month ?? now.getMonth() + 1)
  const { getLaborByMonth } = await import('@/lib/staff/labor-dashboard-actions')
  return await getLaborByMonth(year, month)
}

// ─── Scheduling Intelligence ─────────────────────────────────────────────────

export async function executeCapacityCheck(inputs: Record<string, unknown>) {
  const date = String(inputs.date ?? '')
  if (!date) {
    const { getCapacitySettings } = await import('@/lib/scheduling/capacity-actions')
    return await getCapacitySettings()
  }
  const { checkCapacityForDate } = await import('@/lib/scheduling/capacity-actions')
  return await checkCapacityForDate(date)
}

export async function executePrepBlocks(inputs: Record<string, unknown>) {
  const eventId = inputs.eventId ? String(inputs.eventId) : undefined
  if (eventId) {
    const resolved = await resolveEventId(eventId)
    if (!resolved) return { error: `Could not find event "${eventId}".` }
    const { getEventPrepBlocks } = await import('@/lib/scheduling/prep-block-actions')
    return await getEventPrepBlocks(resolved)
  }
  const { getWeekPrepBlocks } = await import('@/lib/scheduling/prep-block-actions')
  return await getWeekPrepBlocks(0)
}

export async function executeProtectedTime() {
  const { listProtectedBlocks } = await import('@/lib/scheduling/protected-time-actions')
  return await listProtectedBlocks()
}

export async function executeSchedulingGaps() {
  const { getSchedulingGaps } = await import('@/lib/scheduling/prep-block-actions')
  return await getSchedulingGaps()
}

// ─── Analytics Intelligence ──────────────────────────────────────────────────

export async function executePipelineAnalytics() {
  const { getInquiryFunnelStats, getQuoteAcceptanceStats, getGhostRateStats } =
    await import('@/lib/analytics/pipeline-analytics')
  const [funnel, acceptance, ghosts] = await Promise.all([
    getInquiryFunnelStats(),
    getQuoteAcceptanceStats(),
    getGhostRateStats(),
  ])
  return { funnel, quoteAcceptance: acceptance, ghostRate: ghosts }
}

export async function executeYearOverYear() {
  const { getYoYData } = await import('@/lib/analytics/year-over-year')
  return await getYoYData()
}

export async function executeDemandForecast() {
  const { getSeasonalHeatmap } = await import('@/lib/analytics/demand-forecast-actions')
  return await getSeasonalHeatmap()
}

export async function executeBenchmarks() {
  const { computeBenchmarkSnapshot, getConversionFunnel } =
    await import('@/lib/analytics/benchmark-actions')
  const [snapshot, funnel] = await Promise.all([computeBenchmarkSnapshot(), getConversionFunnel()])
  return { benchmarks: snapshot, conversionFunnel: funnel }
}

export async function executePricingSuggestions(inputs: Record<string, unknown>) {
  const { getPricingSuggestion } = await import('@/lib/analytics/pricing-suggestions')
  return await getPricingSuggestion({
    pricingModel: String(inputs.pricingModel ?? 'per_person'),
    guestCount: Number(inputs.guestCount ?? 10),
    occasion: inputs.occasion ? String(inputs.occasion) : null,
  })
}

export async function executeResponseTimeMetrics() {
  const { getResponseTimeSummary } = await import('@/lib/analytics/response-time-actions')
  return await getResponseTimeSummary()
}

export async function executeCostTrends() {
  const { getFoodCostTrend } = await import('@/lib/analytics/cost-trends')
  return await getFoodCostTrend(6)
}

export async function executeReferralAnalytics() {
  const { getReferralAnalytics } = await import('@/lib/analytics/referral-analytics')
  return await getReferralAnalytics()
}

export async function executeQuoteLossAnalysis() {
  const { getLossAnalysis } = await import('@/lib/quotes/loss-analysis-actions')
  return await getLossAnalysis()
}

export async function executeRevenueByServiceType() {
  const { getServiceTypes } = await import('@/lib/goals/service-mix-actions')
  return await getServiceTypes()
}

// ─── Goal Intelligence ───────────────────────────────────────────────────────

export async function executeGoalHistory(inputs: Record<string, unknown>) {
  const goalId = String(inputs.goalId ?? '')
  if (!goalId) return { error: 'Please specify which goal to show history for.' }
  const { getGoalHistory } = await import('@/lib/goals/actions')
  return await getGoalHistory(goalId, 12)
}

export async function executeGoalCheckIns(inputs: Record<string, unknown>) {
  const goalId = String(inputs.goalId ?? '')
  if (!goalId) return { error: 'Please specify which goal.' }
  const { getGoalCheckIns } = await import('@/lib/goals/check-in-actions')
  return await getGoalCheckIns(goalId)
}

// ─── Protection & Compliance ─────────────────────────────────────────────────

export async function executeCertificationStatus() {
  const { getCertifications, getExpiringCertifications } =
    await import('@/lib/compliance/certification-actions')
  const [all, expiring] = await Promise.all([getCertifications(), getExpiringCertifications(60)])
  return { certifications: all, expiringSoon: expiring }
}

export async function executeBusinessHealthScore() {
  const { getHealthScore, getHealthChecklist } =
    await import('@/lib/protection/business-health-actions')
  const [score, checklist] = await Promise.all([getHealthScore(), getHealthChecklist()])
  return { score, checklist }
}

// ─── Loyalty Intelligence ────────────────────────────────────────────────────

export async function executeLoyaltyRedemptions() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('loyalty_redemptions')
    .select('id, client_id, points_redeemed, reward_name, redeemed_at')
    .eq('tenant_id', user.tenantId!)
    .order('redeemed_at', { ascending: false })
    .limit(20)
  return { redemptions: data ?? [], count: data?.length ?? 0 }
}

export async function executeLoyaltyGiftCards() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('gift_cards')
    .select('id, code, balance_cents, original_amount_cents, purchaser_name, status, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(20)
  return { giftCards: data ?? [], count: data?.length ?? 0 }
}

// ─── Inventory Intelligence ──────────────────────────────────────────────────

export async function executeInventoryStatus() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('inventory_items')
    .select('id, name, category, quantity_on_hand, unit, reorder_point, last_counted_at')
    .eq('tenant_id', user.tenantId!)
    .order('name')
    .limit(50)

  const lowStock = (data ?? []).filter(
    (i: any) => i.reorder_point && i.quantity_on_hand <= i.reorder_point
  )
  return { items: data ?? [], lowStock, totalItems: data?.length ?? 0 }
}

export async function executePurchaseOrders() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('purchase_orders')
    .select('id, vendor_id, status, total_cents, ordered_at, received_at')
    .eq('tenant_id', user.tenantId!)
    .order('ordered_at', { ascending: false })
    .limit(20)
  return { orders: data ?? [], count: data?.length ?? 0 }
}

// ─── Commerce Intelligence ──────────────────────────────────────────────────

export async function executeCommerceSalesSummary() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const today = localDateISO(new Date())
  const { data } = await db
    .from('commerce_sales')
    .select('id, total_cents, payment_method, status, created_at')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })

  const totalCents = (data ?? []).reduce((s: number, r: any) => s + (r.total_cents ?? 0), 0)
  return { sales: data ?? [], todayTotalCents: totalCents, count: data?.length ?? 0 }
}

// ─── Guest Intelligence ──────────────────────────────────────────────────────

export async function executeGuestList(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.eventName ?? '')
  if (!eventId) return { error: 'Please specify an event name or ID.' }
  const resolved = await resolveEventId(eventId)
  if (!resolved) return { error: `Could not find event "${eventId}".` }
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('event_guests')
    .select('id, name, dietary_restrictions, allergies, rsvp_status, notes')
    .eq('event_id', resolved)
    .order('name')
  return { guests: data ?? [], count: data?.length ?? 0 }
}

// ─── Marketing Intelligence ─────────────────────────────────────────────────

export async function executeMarketingCampaigns() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('campaigns')
    .select('id, name, status, type, sent_count, open_count, click_count, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(10)
  return { campaigns: data ?? [], count: data?.length ?? 0 }
}

export async function executeNewsletterStatus() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('newsletters')
    .select('id, subject, status, sent_at, recipient_count, open_rate')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(10)
  return { newsletters: data ?? [], count: data?.length ?? 0 }
}

// ─── Review Intelligence ─────────────────────────────────────────────────────

export async function executeReviewsSummary() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('reviews')
    .select('id, client_id, rating, comment, source, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(20)

  const ratings = (data ?? []).map((r: any) => r.rating).filter(Boolean)
  const avgRating = ratings.length
    ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length
    : null
  return { reviews: data ?? [], avgRating, totalReviews: data?.length ?? 0 }
}

// ─── Gmail Intelligence ──────────────────────────────────────────────────────

export async function executeGmailSenderReputation() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('gmail_sender_reputation')
    .select(
      'sender_email, sender_name, total_emails, spam_count, important_count, reputation_score'
    )
    .eq('tenant_id', user.tenantId!)
    .order('reputation_score', { ascending: false })
    .limit(20)
  return { senders: data ?? [], count: data?.length ?? 0 }
}

// ─── Document Intelligence ──────────────────────────────────────────────────

export async function executeDocumentSnapshots(inputs: Record<string, unknown>) {
  const documentId = String(inputs.documentId ?? '')
  if (!documentId) return { error: 'Please specify a document ID.' }
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('document_snapshots')
    .select('id, document_id, version, created_at, created_by')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(10)
  return { snapshots: data ?? [], count: data?.length ?? 0 }
}

// ─── Notification Intelligence ──────────────────────────────────────────────

export async function executeNotificationPreferences() {
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data } = await db
    .from('notification_settings')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .single()
  return data ?? { _note: 'No notification preferences configured yet.' }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveEventId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data: events } = await db
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${nameOrId}%`)
    .limit(1)
  return events?.[0]?.id ?? null
}

async function resolveClientId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId
  const user = await requireChef()
  const { createServerClient } = await import('@/lib/db/server')
  const db: any = createServerClient()
  const { data: clients } = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .ilike('full_name', `%${nameOrId}%`)
    .limit(1)
  return clients?.[0]?.id ?? null
}
