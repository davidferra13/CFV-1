import 'server-only'

import type { PlannedTask } from '@/lib/ai/command-types'
import { searchClientsByName } from '@/lib/clients/actions'
import { loadRadarDataForChef } from '@/lib/culinary-radar/read-model'
import type { RadarMatchView } from '@/lib/culinary-radar/view-model'
import { createServerClient } from '@/lib/db/server'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'
import {
  executeCancellationImpact,
  executeClientMilestones,
  executeContingencyPlanning,
  executeContractGeneration,
  executeDietaryCheck as executeIngredientDietaryCheck,
  executeEquipmentList,
  executeEquipmentMaintenance,
  executeFoodSafetyQuery,
  executeGoalsDashboard,
  executeGroceryConsolidation,
  executeIngredientSubstitution,
  executeMorningBriefing,
  executeMultiEventComparison,
  executePnLReport,
  executePostEventSequence,
  executePricingAnalysis,
  executeReEngagementScoring,
  executeRevenueForecast,
  executeSeasonalProduce,
  executeTaxSummary,
  executeUtilizationAnalysis,
  executeVendorsList,
  executeAcquisitionFunnel,
} from '@/lib/ai/remy-intelligence-actions'
import {
  executeBenchmarks,
  executeBusinessHealthScore,
  executeCapacityCheck,
  executeCashFlowForecast,
  executeCertificationStatus,
  executeClientBirthdays,
  executeClientChurnRisk,
  executeClientCooling,
  executeClientLTVTrajectory,
  executeClientMenuHistory,
  executeClientNDAStatus,
  executeClientNextBestActions,
  executeClientPaymentPlans,
  executeClientReferralHealth,
  executeClientSpending,
  executeCommerceSalesSummary,
  executeContractorSummary,
  executeCostTrends,
  executeDemandForecast,
  executeDisputes,
  executeDocumentSnapshots,
  executeEquipmentRentals,
  executeEventCountdown,
  executeEventDebrief,
  executeEventDietaryConflicts,
  executeGoalCheckIns,
  executeGoalHistory,
  executeGmailSenderReputation,
  executeGuestList,
  executeInquiryFollowUps,
  executeInquiryLikelihood,
  executeInventoryStatus,
  executeInvoiceLookup,
  executeLoyaltyGiftCards,
  executeLoyaltyRedemptions,
  executeMarketingCampaigns,
  executeMenuDishIndex,
  executeMenuFoodCost,
  executeMenuShowcase,
  executeMileageSummary,
  executeNewsletterStatus,
  executeNotificationPreferences,
  executePaymentPlanLookup,
  executePayrollSummary,
  executePipelineAnalytics,
  executePrepBlocks,
  executePricingSuggestions,
  executeProtectedTime,
  executePurchaseOrders,
  executeQuoteLossAnalysis,
  executeRecipeAllergens,
  executeRecipeNutrition,
  executeRecipeProductionLogs,
  executeRecurringInvoices,
  executeReferralAnalytics,
  executeResponseTimeMetrics,
  executeRevenueByServiceType,
  executeReviewsSummary,
  executeSchedulingGaps,
  executeStaffAvailability,
  executeStaffBriefing,
  executeStaffClockSummary,
  executeStaffLaborDashboard,
  executeStaffPerformance,
  executeTaxPackage,
  executeTipSummary,
  executeVendorInvoices,
  executeVendorPaymentAging,
  executeVendorPriceInsights,
  executeYearOverYear,
} from '@/lib/ai/remy-intelligence-actions-2'
import {
  executeAARForgottenItems,
  executeAARList,
  executeAARStats,
  executeActivityFeed,
  executeCircleEvents,
  executeCirclesList,
  executeCirclesUnread,
  executeCommerceDailyReport,
  executeCommerceInventoryLow,
  executeCommerceProductReport,
  executeCommerceProducts,
  executeCommerceRecentSales,
  executeDailyPlan,
  executeDailyPlanStats,
  executeEngagementStats,
  executeEventsWithoutAAR,
  executeOpsLog,
  executePartnerEvents,
  executePartnerPerformance,
  executePartnersList,
  executePriorityQueue,
  executeRateCard,
  executeStationDetail,
  executeStationsList,
  executeTasksByDate,
  executeTasksList,
  executeTasksOverdue,
  executeTestimonialsList,
  executeTestimonialsPending,
  executeTravelPlan,
  executeTravelUpcoming,
  executeWaitlistStatus,
  executeWasteLog,
} from '@/lib/ai/remy-intelligence-actions-3'

type ReadTaskContext = {
  tenantId: string
}

type ReadTaskExecutor = (task: PlannedTask, ctx: ReadTaskContext) => Promise<unknown>

const REMY_READ_TASK_EXECUTORS: Record<string, ReadTaskExecutor> = {
  'contract.generate': (task) => executeContractGeneration(task.inputs),
  'contingency.plan': (task) => executeContingencyPlanning(task.inputs),
  'seasonal.produce': () => executeSeasonalProduce(),
  'grocery.consolidate': (task) => executeGroceryConsolidation(task.inputs),
  'finance.forecast': (_task, ctx) => executeRevenueForecast(ctx.tenantId),
  'finance.pnl': (task, ctx) => executePnLReport(ctx.tenantId, task.inputs),
  'finance.tax_summary': (task, ctx) => executeTaxSummary(ctx.tenantId, task.inputs),
  'finance.pricing': (_task, ctx) => executePricingAnalysis(ctx.tenantId),
  'capacity.utilization': (task, ctx) => executeUtilizationAnalysis(ctx.tenantId, task.inputs),
  'relationship.milestones': (_task, ctx) => executeClientMilestones(ctx.tenantId),
  'relationship.reengagement': (_task, ctx) => executeReEngagementScoring(ctx.tenantId),
  'relationship.acquisition': (_task, ctx) => executeAcquisitionFunnel(ctx.tenantId),
  'goals.dashboard': () => executeGoalsDashboard(),
  'equipment.list': () => executeEquipmentList(),
  'equipment.maintenance': () => executeEquipmentMaintenance(),
  'vendors.list': (_task, ctx) => executeVendorsList(ctx.tenantId),
  'analytics.compare_events': (task, ctx) => executeMultiEventComparison(task.inputs, ctx.tenantId),
  'briefing.morning': (_task, ctx) => executeMorningBriefing(ctx.tenantId),
  'loyalty.status': (task, ctx) => executeLoyaltyStatus(task, ctx),
  'safety.event_allergens': (task, ctx) => executeEventAllergens(task, ctx),
  'waitlist.list': (_task, ctx) => executeWaitlistList(ctx),
  'quote.compare': (task, ctx) => executeQuoteCompare(task, ctx),
  'workflow.cancellation_impact': (task, ctx) =>
    executeCancellationImpact(task.inputs, ctx.tenantId),
  'workflow.post_event': (task) => executePostEventSequence(task.inputs),
  'ops.ingredient_sub': (task) => executeIngredientSubstitution(task.inputs),
  'food.safety': (task) => executeFoodSafetyQuery(task.inputs),
  'food.dietary_ingredients': (task) => executeIngredientDietaryCheck(task.inputs),

  'client.spending': () => executeClientSpending(),
  'client.churn_risk': () => executeClientChurnRisk(),
  'client.birthdays': () => executeClientBirthdays(),
  'client.next_best_action': () => executeClientNextBestActions(),
  'client.cooling': () => executeClientCooling(),
  'client.ltv_trajectory': (task) => executeClientLTVTrajectory(task.inputs),
  'client.menu_history': (task) => executeClientMenuHistory(task.inputs),
  'client.referral_health': () => executeClientReferralHealth(),
  'client.nda_status': () => executeClientNDAStatus(),
  'client.payment_plans': (task) => executeClientPaymentPlans(task.inputs),
  'event.dietary_conflicts': (task) => executeEventDietaryConflicts(task.inputs),
  'event.debrief': (task) => executeEventDebrief(task.inputs),
  'event.countdown': (task) => executeEventCountdown(task.inputs),
  'event.invoice': (task) => executeInvoiceLookup(task.inputs),
  'inquiry.follow_ups': () => executeInquiryFollowUps(),
  'inquiry.likelihood': () => executeInquiryLikelihood(),
  'menu.food_cost': () => executeMenuFoodCost(),
  'menu.dish_index': () => executeMenuDishIndex(),
  'menu.showcase': () => executeMenuShowcase(),
  'recipe.allergens': () => executeRecipeAllergens(),
  'recipe.nutrition': (task) => executeRecipeNutrition(task.inputs),
  'recipe.production_logs': () => executeRecipeProductionLogs(),
  'finance.cash_flow': () => executeCashFlowForecast(),
  'finance.mileage': () => executeMileageSummary(),
  'finance.tips': () => executeTipSummary(),
  'finance.contractors': () => executeContractorSummary(),
  'finance.disputes': () => executeDisputes(),
  'finance.payment_plan': (task) => executePaymentPlanLookup(task.inputs),
  'finance.recurring_invoices': () => executeRecurringInvoices(),
  'finance.tax_package': () => executeTaxPackage(),
  'finance.payroll': () => executePayrollSummary(),
  'vendor.invoices': (task) => executeVendorInvoices(task.inputs),
  'vendor.price_insights': () => executeVendorPriceInsights(),
  'vendor.payment_aging': () => executeVendorPaymentAging(),
  'price.check': (task, ctx) => executePriceCheck(task, ctx),
  'equipment.rentals': (task) => executeEquipmentRentals(task.inputs),
  'staff.availability': (task) => executeStaffAvailability(task.inputs),
  'staff.briefing': (task) => executeStaffBriefing(task.inputs),
  'staff.clock_summary': (task) => executeStaffClockSummary(task.inputs),
  'staff.performance': () => executeStaffPerformance(),
  'staff.labor_dashboard': (task) => executeStaffLaborDashboard(task.inputs),
  'scheduling.capacity': (task) => executeCapacityCheck(task.inputs),
  'scheduling.prep_blocks': (task) => executePrepBlocks(task.inputs),
  'scheduling.protected_time': () => executeProtectedTime(),
  'scheduling.gaps': () => executeSchedulingGaps(),
  'analytics.pipeline': () => executePipelineAnalytics(),
  'analytics.yoy': () => executeYearOverYear(),
  'analytics.demand_forecast': () => executeDemandForecast(),
  'analytics.benchmarks': () => executeBenchmarks(),
  'analytics.pricing_suggestions': (task) => executePricingSuggestions(task.inputs),
  'analytics.response_time': () => executeResponseTimeMetrics(),
  'analytics.cost_trends': () => executeCostTrends(),
  'analytics.referrals': () => executeReferralAnalytics(),
  'analytics.quote_loss': () => executeQuoteLossAnalysis(),
  'analytics.service_mix': () => executeRevenueByServiceType(),
  'goals.history': (task) => executeGoalHistory(task.inputs),
  'goals.check_ins': (task) => executeGoalCheckIns(task.inputs),
  'protection.certifications': () => executeCertificationStatus(),
  'protection.business_health': () => executeBusinessHealthScore(),
  'loyalty.redemptions': () => executeLoyaltyRedemptions(),
  'loyalty.gift_cards': () => executeLoyaltyGiftCards(),
  'inventory.status': () => executeInventoryStatus(),
  'inventory.purchase_orders': () => executePurchaseOrders(),
  'commerce.sales_summary': () => executeCommerceSalesSummary(),
  'guest.list': (task) => executeGuestList(task.inputs),
  'marketing.campaigns': () => executeMarketingCampaigns(),
  'marketing.newsletters': () => executeNewsletterStatus(),
  'reviews.summary': () => executeReviewsSummary(),
  'gmail.sender_reputation': () => executeGmailSenderReputation(),
  'notifications.preferences': () => executeNotificationPreferences(),
  'document.snapshots': (task) => executeDocumentSnapshots(task.inputs),

  'circles.list': () => executeCirclesList(),
  'circles.unread': () => executeCirclesUnread(),
  'circles.events': (task) => executeCircleEvents(task.inputs),
  'circles.discover': async () => ({
    route: '/hub/circles',
    navigated: true,
    message:
      'Opening community circles discovery page. You can browse, search, and join public circles.',
  }),
  'rate_card.summary': () => executeRateCard(),
  'tasks.list': (task) => executeTasksList(task.inputs),
  'tasks.by_date': (task) => executeTasksByDate(task.inputs),
  'tasks.overdue': () => executeTasksOverdue(),
  'travel.plan': (task) => executeTravelPlan(task.inputs),
  'travel.upcoming': () => executeTravelUpcoming(),
  'commerce.products': () => executeCommerceProducts(),
  'commerce.recent_sales': () => executeCommerceRecentSales(),
  'commerce.daily_report': () => executeCommerceDailyReport(),
  'commerce.product_report': () => executeCommerceProductReport(),
  'commerce.inventory_low': () => executeCommerceInventoryLow(),
  'daily.plan': () => executeDailyPlan(),
  'daily.stats': () => executeDailyPlanStats(),
  'queue.status': () => executePriorityQueue(),
  'stations.list': () => executeStationsList(),
  'stations.detail': (task) => executeStationDetail(task.inputs),
  'stations.ops_log': (task) => executeOpsLog(task.inputs),
  'stations.waste_log': () => executeWasteLog(),
  'testimonials.list': () => executeTestimonialsList(),
  'testimonials.pending': () => executeTestimonialsPending(),
  'partners.list': () => executePartnersList(),
  'partners.events': (task) => executePartnerEvents(task.inputs),
  'partners.performance': () => executePartnerPerformance(),
  'activity.feed': () => executeActivityFeed(),
  'activity.engagement': () => executeEngagementStats(),
  'aar.list': () => executeAARList(),
  'aar.stats': () => executeAARStats(),
  'aar.events_without': () => executeEventsWithoutAAR(),
  'aar.forgotten_items': () => executeAARForgottenItems(),
  'waitlist.status': () => executeWaitlistStatus(),
  'radar.latest': (task, ctx) => executeRadarLatest(task, ctx),
  'radar.safety': (task, ctx) =>
    executeRadarLatest({ ...task, inputs: { ...task.inputs, category: 'safety' } }, ctx),
  'radar.opportunities': (task, ctx) =>
    executeRadarLatest({ ...task, inputs: { ...task.inputs, category: 'opportunity' } }, ctx),
  'radar.explain_item': (task, ctx) => executeRadarExplain(task, ctx),
}

export async function executeRegisteredRemyReadTask(
  task: PlannedTask,
  ctx: ReadTaskContext
): Promise<{ handled: true; data: unknown } | { handled: false }> {
  const executor = REMY_READ_TASK_EXECUTORS[task.taskType]
  if (!executor) return { handled: false }
  return { handled: true, data: await executor(task, ctx) }
}

async function executeRadarLatest(task: PlannedTask, ctx: ReadTaskContext) {
  const category = typeof task.inputs.category === 'string' ? task.inputs.category : null
  const limit =
    typeof task.inputs.limit === 'number' && Number.isFinite(task.inputs.limit)
      ? Math.max(1, Math.min(10, Math.round(task.inputs.limit)))
      : 5
  const overview = await loadRadarDataForChef(ctx.tenantId, undefined, 25)

  if (!overview.success) {
    return {
      matches: [],
      count: 0,
      generatedAt: new Date().toISOString(),
      unavailable: true,
      error: overview.error ?? 'Culinary Radar could not load.',
      sourceFreshness: 'unavailable',
    }
  }

  const matches = overview.matches
    .filter((match) => !category || match.item.category === category)
    .slice(0, limit)

  return {
    matches: matches.map(toRemyRadarMatch),
    count: matches.length,
    generatedAt: new Date().toISOString(),
    unavailable: false,
    sourceFreshness: summarizeSourceFreshness(overview.sources),
    unavailableSources: overview.sources
      .filter((source) => source.active && source.lastError)
      .map((source) => source.name),
  }
}

async function executeRadarExplain(task: PlannedTask, ctx: ReadTaskContext) {
  const itemId = String(task.inputs.itemId ?? '').trim()
  if (!itemId) {
    return { found: false, message: 'Please specify which radar item to explain.' }
  }

  const overview = await loadRadarDataForChef(ctx.tenantId, undefined, 50)
  if (!overview.success) {
    return {
      found: false,
      unavailable: true,
      message: overview.error ?? 'Culinary Radar could not load.',
    }
  }

  const match = overview.matches.find((entry) => entry.id === itemId || entry.itemId === itemId)
  if (!match) {
    return { found: false, message: 'No matching radar item found in your active Radar.' }
  }

  return {
    found: true,
    match: toRemyRadarMatch(match),
    reasons: match.matchReasons,
    matchedEntities: match.matchedEntities,
    recommendedActions: match.recommendedActions,
  }
}

function toRemyRadarMatch(match: RadarMatchView) {
  return {
    id: match.id,
    itemId: match.itemId,
    title: match.item.title,
    category: match.item.category,
    severity: match.severity,
    sourceName: match.item.sourceName,
    sourceUrl: match.item.canonicalUrl,
    sourcePublishedAt: match.item.sourcePublishedAt,
    matchedReason: match.matchReasons[0] ?? 'Matched by Culinary Radar.',
    impactSummary: match.recommendedActions[0] ?? 'Read the source and decide whether it matters.',
    relatedEntityLabel: match.matchedEntities[0]?.label,
    route: '/radar',
  }
}

function summarizeSourceFreshness(
  sources: Array<{ active: boolean; lastSuccessAt: string | null }>
) {
  const active = sources.filter((source) => source.active)
  if (active.length === 0) return 'no active sources'
  const withSuccess = active.filter((source) => source.lastSuccessAt)
  if (withSuccess.length === 0) return 'not refreshed yet'
  const newest = withSuccess
    .map((source) => source.lastSuccessAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
  return newest ? `last refreshed ${newest}` : 'not refreshed yet'
}

async function executePriceCheck(task: PlannedTask, ctx: ReadTaskContext) {
  const ingredientNames = (task.inputs.ingredients as string[]) || []
  if (ingredientNames.length === 0) {
    return { message: 'Please specify which ingredients to check prices for.' }
  }

  const db: any = createServerClient()
  const { data: priceRows } = await db
    .from('ingredients')
    .select('id, name')
    .eq('tenant_id', ctx.tenantId)
    .in(
      'name',
      ingredientNames.map((name: string) => name.toLowerCase())
    )

  let matchedRows: { id: string; name: string }[] = priceRows ?? []
  if (matchedRows.length === 0) {
    const { data: fuzzyRows } = await db
      .from('ingredients')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)

    matchedRows = ((fuzzyRows ?? []) as { id: string; name: string }[]).filter((row) =>
      ingredientNames.some((name: string) => row.name.toLowerCase().includes(name.toLowerCase()))
    )
  }

  if (matchedRows.length === 0) {
    return { message: 'No matching ingredients found in your library.' }
  }

  const resolved = await resolvePricesBatch(
    matchedRows.map((row) => row.id),
    ctx.tenantId
  )
  const piPrices = await lookupPiPrices(matchedRows.map((row) => row.name))

  return {
    prices: matchedRows.map((row) => {
      const price = resolved.get(row.id)
      const piMatch = piPrices.get(row.name.toLowerCase())
      return {
        ingredient: row.name,
        cents: price?.cents || null,
        unit: price?.unit || 'each',
        store: price?.store || null,
        source: price?.source || 'none',
        confidence: price?.confidence || 0,
        piCents: piMatch?.cents || null,
        piStore: piMatch?.store || null,
      }
    }),
  }
}

async function executeLoyaltyStatus(task: PlannedTask, ctx: ReadTaskContext) {
  const clientName = String(task.inputs.clientName ?? '')
  const clients = await searchClientsByName(clientName)
  if (!clients.length) throw new Error(`Could not find a client matching "${clientName}".`)

  const client = clients[0]
  const db: any = createServerClient()

  const { data: loyaltyTxns } = await db
    .from('loyalty_transactions')
    .select('points, type')
    .eq('tenant_id', ctx.tenantId)
    .eq('client_id', client.id)

  const lifetimePoints = (loyaltyTxns ?? [])
    .filter((txn: any) => txn.type === 'earn')
    .reduce((sum: number, txn: any) => sum + ((txn.points as number) ?? 0), 0)
  const redeemedPoints = (loyaltyTxns ?? [])
    .filter((txn: any) => txn.type === 'redeem')
    .reduce((sum: number, txn: any) => sum + Math.abs((txn.points as number) ?? 0), 0)
  const pointsBalance = lifetimePoints - redeemedPoints
  const derivedTier =
    lifetimePoints >= 500
      ? 'platinum'
      : lifetimePoints >= 250
        ? 'gold'
        : lifetimePoints >= 100
          ? 'silver'
          : 'bronze'

  const { count: eventCount } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('client_id', client.id)
    .not('status', 'eq', 'cancelled')

  const tierThresholds: Record<string, number> = {
    bronze: 100,
    silver: 250,
    gold: 500,
    platinum: Infinity,
  }
  const nextTier =
    derivedTier === 'platinum'
      ? null
      : Object.keys(tierThresholds).find(
          (tier) => tierThresholds[tier] > (tierThresholds[derivedTier] ?? 0)
        )

  return {
    clientName: client.full_name ?? clientName,
    tier: derivedTier,
    pointsBalance,
    lifetimePoints,
    totalEvents: eventCount ?? 0,
    nextTier,
    pointsToNextTier: nextTier ? (tierThresholds[nextTier] ?? 0) - pointsBalance : null,
  }
}

async function executeEventAllergens(task: PlannedTask, ctx: ReadTaskContext) {
  const eventName = String(task.inputs.eventName ?? '')
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select(
      'id, occasion, event_date, client_id, client:clients(full_name, dietary_restrictions, allergies)'
    )
    .eq('tenant_id', ctx.tenantId)
    .ilike('occasion', `%${eventName}%`)
    .limit(1)

  if (!events?.length) throw new Error(`Could not find event matching "${eventName}".`)

  const event = events[0] as Record<string, unknown>
  const client = event.client as Record<string, unknown> | null
  const { data: menuData } = await db
    .from('menus')
    .select('id, name, dishes(name, description, dietary_tags)')
    .eq('event_id', event.id as string)

  const allergies = (client?.allergies as string) ?? ''
  const dietaryRestrictions = (client?.dietary_restrictions as string) ?? ''
  const menuItems = (menuData ?? []).flatMap((menu: any) =>
    ((menu?.dishes as Array<Record<string, unknown>>) ?? []).map((dish) => ({
      dish: dish.name as string,
      description: (dish.description as string) ?? '',
      dietaryTags: (dish.dietary_tags as string[]) ?? [],
    }))
  )

  return {
    eventName: (event.occasion as string) ?? eventName,
    clientName: (client?.full_name as string) ?? 'Unknown',
    allergies: allergies || 'None recorded',
    dietaryRestrictions: dietaryRestrictions || 'None recorded',
    menuItemCount: menuItems.length,
    menuItems,
    warning: allergies ? `ALLERGY ALERT: ${allergies}` : null,
  }
}

async function executeWaitlistList(ctx: ReadTaskContext) {
  const db: any = createServerClient()
  const { data } = await db
    .from('waitlist_entries')
    .select('id, client:clients(full_name), requested_date, occasion, status, created_at')
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['waiting', 'pending'])
    .order('requested_date', { ascending: true })
    .limit(20)

  return {
    entries: (data ?? []).map((entry: Record<string, unknown>) => ({
      id: entry.id as string,
      clientName:
        ((entry.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      requestedDate: entry.requested_date as string | null,
      occasion: entry.occasion as string | null,
      status: entry.status as string,
      addedOn: entry.created_at as string,
    })),
    totalCount: (data ?? []).length,
  }
}

async function executeQuoteCompare(task: PlannedTask, ctx: ReadTaskContext) {
  const eventName = String(task.inputs.eventName ?? '')
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', ctx.tenantId)
    .ilike('occasion', `%${eventName}%`)
    .limit(1)

  if (!events?.length) throw new Error(`Could not find event matching "${eventName}".`)

  const event = events[0] as Record<string, unknown>
  const { data: quotes } = await db
    .from('quotes')
    .select(
      'id, name, status, total_cents, deposit_cents, pricing_notes, created_at, version_number'
    )
    .eq('event_id', event.id)
    .order('version_number', { ascending: true })

  return {
    eventName: (event.occasion as string) ?? eventName,
    quoteCount: (quotes ?? []).length,
    quotes: (quotes ?? []).map((quote: Record<string, unknown>) => ({
      id: quote.id as string,
      name: (quote.name as string) ?? `Version ${quote.version_number ?? '?'}`,
      version: (quote.version_number as number) ?? null,
      status: quote.status as string,
      totalCents: (quote.total_cents as number) ?? 0,
      depositCents: (quote.deposit_cents as number) ?? 0,
      pricingNotes: (quote.pricing_notes as string) ?? '',
      createdAt: quote.created_at as string,
    })),
  }
}

async function lookupPiPrices(
  ingredients: string[]
): Promise<Map<string, { cents: number; store: string }>> {
  const piApi = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
  const piPrices = new Map<string, { cents: number; store: string }>()

  try {
    const piRes = await fetch(`${piApi}/api/lookup/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
      signal: AbortSignal.timeout(3000),
    })

    if (!piRes.ok) return piPrices

    const piData = await piRes.json()
    for (const item of piData.results || piData.ingredients || []) {
      const name = (item.name || item.query || '').toLowerCase()
      const cents = item.best_price_cents || item.price_cents
      const store = item.best_store || item.store || ''
      if (name && cents) piPrices.set(name, { cents, store })
    }
  } catch {
    // Pi lookup is non-blocking. DB prices still answer the command.
  }

  return piPrices
}
