'use server'

// Ask Remy — Orchestrator
// PRIVACY: Chef commands may contain client PII — all processing via local Ollama only.
// DRAFT-FIRST: Tier 2 results are drafts. Nothing is sent or saved until chef approves.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { parseCommandIntent } from '@/lib/ai/command-intent-parser'
import { getAgentAction, isAgentAction } from '@/lib/ai/agent-registry'
import { ensureAgentActionsRegistered } from '@/lib/ai/agent-actions'
import { searchClientsByName, getClients, getClientById } from '@/lib/clients/actions'
import { getEvents, getEventById } from '@/lib/events/actions'
import { getInquiries, getInquiryById } from '@/lib/inquiries/actions'
import { getRecipes } from '@/lib/recipes/actions'
import { getMenus } from '@/lib/menus/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { checkCalendarAvailability } from '@/lib/scheduling/calendar-sync'
import { generateFollowUpDraft } from '@/lib/ai/followup-draft'
import { parseEventFromText } from '@/lib/events/parse-event-from-text'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import { searchWeb, readWebPage } from '@/lib/ai/remy-web-actions'
import { checkDietaryByClientName } from '@/lib/ai/dietary-check-actions'
import { getCulinaryProfile } from '@/lib/ai/chef-profile-actions'
import { getFavoriteChefs } from '@/lib/favorite-chefs/actions'
import { generatePrepTimelineByName } from '@/lib/ai/prep-timeline-actions'
import { getProactiveNudges } from '@/lib/ai/reminder-actions'
import { parseGroceryItems } from '@/lib/ai/grocery-quick-add-actions'
import { searchDocuments, listFolders, createFolder } from '@/lib/ai/document-management-actions'
import {
  calculatePortions,
  generatePackingList,
  analyzeCrossContamination,
} from '@/lib/ai/operations-actions'
import {
  analyzeBreakEven,
  calculateClientLTV,
  optimizeRecipeCost,
} from '@/lib/ai/analytics-actions'
import { getEventRecap, explainMenu } from '@/lib/ai/client-facing-actions'
import {
  getRecentEmails,
  searchEmails,
  getEmailThread,
  summarizeInbox,
  draftEmailReply,
} from '@/lib/ai/remy-email-actions'
import {
  generateThankYouDraft,
  generateReferralRequestDraft,
  generateTestimonialRequestDraft,
  generateQuoteCoverLetterDraft,
  generateDeclineResponseDraft,
  generateCancellationResponseDraft,
  generatePaymentReminderDraft,
  generateReEngagementDraft,
  generateMilestoneRecognitionDraft,
  generateFoodSafetyIncidentDraft,
  generateConfirmationDraft,
} from '@/lib/ai/draft-actions'
import type { CommandRun, TaskResult, PlannedTask, ApprovalTier } from '@/lib/ai/command-types'
import { getAvailableActions } from '@/lib/ai/remy-action-filter'
import { startRemyActionAudit, finishRemyActionAudit } from '@/lib/ai/remy-action-audit-actions'
import {
  resolveRemyApprovalDecision,
  type RemyApprovalPolicyMap,
} from '@/lib/ai/remy-approval-policy-core'
import { getTenantRemyApprovalPolicyMap } from '@/lib/ai/remy-approval-policy-actions'
import { validateSignificantApprovalPhrase } from '@/lib/ai/remy-significant-approval'
import {
  executeContractGeneration,
  executeContingencyPlanning,
  executeSeasonalProduce,
  executeGroceryConsolidation,
  executeRevenueForecast,
  executePnLReport,
  executeTaxSummary,
  executePricingAnalysis,
  executeUtilizationAnalysis,
  executeClientMilestones,
  executeReEngagementScoring,
  executeAcquisitionFunnel,
  executeMultiEventComparison,
  executeGoalsDashboard,
  executeEquipmentList,
  executeEquipmentMaintenance,
  executeVendorsList,
  executeMorningBriefing,
  executeCancellationImpact,
  executePostEventSequence,
  executeIngredientSubstitution,
} from '@/lib/ai/remy-intelligence-actions'
import {
  executeClientSpending,
  executeClientChurnRisk,
  executeClientBirthdays,
  executeClientNextBestActions,
  executeClientCooling,
  executeClientLTVTrajectory,
  executeClientMenuHistory,
  executeClientReferralHealth,
  executeClientNDAStatus,
  executeClientPaymentPlans,
  executeEventDietaryConflicts,
  executeEventDebrief,
  executeEventCountdown,
  executeInvoiceLookup,
  executeInquiryFollowUps,
  executeInquiryLikelihood,
  executeMenuFoodCost,
  executeMenuDishIndex,
  executeMenuShowcase,
  executeRecipeAllergens,
  executeRecipeNutrition,
  executeRecipeProductionLogs,
  executeCashFlowForecast,
  executeMileageSummary,
  executeTipSummary,
  executeContractorSummary,
  executeDisputes,
  executePaymentPlanLookup,
  executeRecurringInvoices,
  executeTaxPackage,
  executePayrollSummary,
  executeVendorInvoices,
  executeVendorPriceInsights,
  executeVendorPaymentAging,
  executeEquipmentRentals,
  executeStaffAvailability,
  executeStaffBriefing,
  executeStaffClockSummary,
  executeStaffPerformance,
  executeStaffLaborDashboard,
  executeCapacityCheck,
  executePrepBlocks,
  executeProtectedTime,
  executeSchedulingGaps,
  executePipelineAnalytics,
  executeYearOverYear,
  executeDemandForecast,
  executeBenchmarks,
  executePricingSuggestions,
  executeResponseTimeMetrics,
  executeCostTrends,
  executeReferralAnalytics,
  executeQuoteLossAnalysis,
  executeRevenueByServiceType,
  executeGoalHistory,
  executeGoalCheckIns,
  executeCertificationStatus,
  executeBusinessHealthScore,
  executeLoyaltyRedemptions,
  executeLoyaltyGiftCards,
  executeInventoryStatus,
  executePurchaseOrders,
  executeCommerceSalesSummary,
  executeGuestList,
  executeMarketingCampaigns,
  executeNewsletterStatus,
  executeReviewsSummary,
  executeGmailSenderReputation,
  executeNotificationPreferences,
  executeDocumentSnapshots,
} from '@/lib/ai/remy-intelligence-actions-2'
import {
  executeCirclesList,
  executeCirclesUnread,
  executeCircleEvents,
  executeRateCard,
  executeTasksList,
  executeTasksByDate,
  executeTasksOverdue,
  executeTravelPlan,
  executeTravelUpcoming,
  executeCommerceProducts,
  executeCommerceRecentSales,
  executeCommerceDailyReport,
  executeCommerceProductReport,
  executeCommerceInventoryLow,
  executeDailyPlan,
  executeDailyPlanStats,
  executePriorityQueue,
  executeStationsList,
  executeStationDetail,
  executeOpsLog,
  executeWasteLog,
  executeTestimonialsList,
  executeTestimonialsPending,
  executePartnersList,
  executePartnerEvents,
  executePartnerPerformance,
  executeActivityFeed,
  executeEngagementStats,
  executeAARList,
  executeAARStats,
  executeEventsWithoutAAR,
  executeAARForgottenItems,
  executeWaitlistStatus,
} from '@/lib/ai/remy-intelligence-actions-3'

// ─── Individual Task Executors ────────────────────────────────────────────────

async function executeClientSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  const clients = await searchClientsByName(query)
  if (clients.length === 0) return { clients: [] }

  // Enrich with dietary/allergy data (safety-critical)
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()
  const clientIds = clients.map((c) => c.id)

  const [{ data: enriched }, { data: eventCounts }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, dietary_restrictions, allergies, vibe_notes, loyalty_tier, loyalty_points')
      .eq('tenant_id', tenantId)
      .in('id', clientIds),
    // Frequency-based resolution: rank by event count when multiple clients match
    clients.length > 1
      ? supabase
          .from('events')
          .select('client_id')
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)
      : Promise.resolve({ data: [] }),
  ])

  const enrichedMap = new Map(
    ((enriched ?? []) as Array<Record<string, unknown>>).map((e) => [e.id as string, e])
  )

  // Count events per client for frequency ranking
  const eventCountMap = new Map<string, number>()
  for (const row of (eventCounts ?? []) as Array<Record<string, unknown>>) {
    const cid = row.client_id as string
    eventCountMap.set(cid, (eventCountMap.get(cid) || 0) + 1)
  }

  const enrichedClients = clients.map((c) => {
    const extra = enrichedMap.get(c.id)
    const allergies = (extra?.allergies as string[]) ?? []
    const dietary = (extra?.dietary_restrictions as string[]) ?? []
    return {
      id: c.id,
      name: c.full_name ?? '',
      email: c.email ?? '',
      status: c.status ?? '',
      allergies,
      dietaryRestrictions: dietary,
      loyaltyTier: (extra?.loyalty_tier as string) ?? null,
      eventCount: eventCountMap.get(c.id) ?? 0,
    }
  })

  // Sort by event frequency (most events = most likely the chef's intended client)
  if (enrichedClients.length > 1) {
    enrichedClients.sort((a, b) => b.eventCount - a.eventCount)
  }

  // Ambiguity detection: if multiple clients match and the top two have similar event counts,
  // the match is genuinely ambiguous — flag it so dependent tasks can hold for clarification
  const isAmbiguous =
    enrichedClients.length > 1 &&
    Math.abs(enrichedClients[0].eventCount - enrichedClients[1].eventCount) <= 1

  return {
    clients: enrichedClients,
    ambiguous: isAmbiguous,
    // Signal to Remy when auto-resolving ambiguity
    ...(enrichedClients.length > 1 && {
      disambiguationNote: isAmbiguous
        ? `Found ${enrichedClients.length} clients matching "${query}": ${enrichedClients.map((c) => `${c.name} (${c.eventCount} events)`).join(', ')}. Which one did you mean?`
        : `Found ${enrichedClients.length} clients matching "${query}". Ranked by event frequency — "${enrichedClients[0].name}" has ${enrichedClients[0].eventCount} events.`,
    }),
  }
}

async function executeCalendarAvailability(inputs: Record<string, unknown>) {
  const date = String(inputs.date ?? '')
  const result = await checkCalendarAvailability(date)
  return { date, ...result }
}

async function executeEventListUpcoming(tenantId: string) {
  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })
    .limit(5)

  return {
    events: (data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      occasion: e.occasion as string | null,
      date: e.event_date as string | null,
      status: e.status as string,
      clientName: ((e.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
    })),
  }
}

async function executeFinanceSummary(tenantId: string) {
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled")')

  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('amount_cents, entry_type')
    .eq('tenant_id', tenantId)
    .eq('entry_type', 'payment')

  const totalRevenueCents = (ledger ?? []).reduce(
    (sum: number, e: Record<string, unknown>) => sum + ((e.amount_cents as number) ?? 0),
    0
  )
  const completed = (events ?? []).filter((e: Record<string, unknown>) => e.status === 'completed')

  return {
    totalRevenueCents,
    eventCount: (events ?? []).length,
    completedCount: completed.length,
  }
}

async function executeEmailFollowup(
  inputs: Record<string, unknown>,
  resolvedDeps: Record<string, unknown>
) {
  // Try to resolve client from a prior client.search dependency
  const searchResult = resolvedDeps['client.search'] as
    | {
        clients: Array<{ id: string; name: string }>
        ambiguous?: boolean
        disambiguationNote?: string
      }
    | undefined

  // If client search was ambiguous, hold this task for disambiguation
  if (searchResult?.ambiguous && searchResult.clients.length > 1) {
    throw new Error(
      `Multiple clients match — ${searchResult.disambiguationNote ?? 'which one did you mean?'}`
    )
  }

  let clientId: string | null = searchResult?.clients?.[0]?.id ?? null
  const clientName = String(inputs.clientName ?? searchResult?.clients?.[0]?.name ?? 'Client')

  // If no client from deps, fall back to name search
  if (!clientId) {
    const clients = await searchClientsByName(clientName)
    clientId = clients[0]?.id ?? null
  }

  if (!clientId) {
    throw new Error(`Could not find a client matching "${clientName}".`)
  }

  const draftText = await generateFollowUpDraft(clientId)
  return { clientId, clientName, draftText }
}

async function executeEventCreateDraft(inputs: Record<string, unknown>) {
  const description = String(inputs.description ?? '')
  const result = await parseEventFromText(description)
  return { draft: result.draft, error: result.error }
}

// ─── Remy-expanded Executors ──────────────────────────────────────────────────

async function executeClientListRecent(inputs: Record<string, unknown>) {
  const limit = Number(inputs.limit) || 5
  const allClients = await getClients()
  const recent = (allClients ?? []).slice(0, limit)
  return {
    clients: recent.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: (c.full_name as string) ?? 'Unknown',
      email: (c.email as string) ?? '',
    })),
  }
}

async function executeClientDetails(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  const matches = await searchClientsByName(clientName)
  if (matches.length === 0) return { found: false, clientName }

  // Load full client with all fields including dietary, loyalty, and notes
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { data: client } = await supabase
    .from('clients')
    .select(
      'id, full_name, email, phone, status, dietary_restrictions, allergies, vibe_notes, loyalty_tier, loyalty_points, total_events_count, lifetime_value_cents, preferred_contact_method, address'
    )
    .eq('id', matches[0].id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) return { found: false, clientName }

  return {
    found: true,
    client: {
      id: client.id,
      name: client.full_name ?? 'Unknown',
      email: client.email ?? '',
      phone: client.phone ?? '',
      status: client.status ?? '',
      dietaryRestrictions: client.dietary_restrictions ?? [],
      allergies: client.allergies ?? [],
      vibeNotes: client.vibe_notes ?? '',
      loyaltyTier: client.loyalty_tier ?? null,
      loyaltyPoints: client.loyalty_points ?? 0,
      totalEvents: client.total_events_count ?? 0,
      lifetimeValueCents: client.lifetime_value_cents ?? 0,
      preferredContact: client.preferred_contact_method ?? '',
      address: client.address ?? '',
    },
  }
}

async function executeEventDetails(inputs: Record<string, unknown>, tenantId: string) {
  const eventName = String(inputs.eventName ?? '')
  const supabase: any = createServerClient()

  // Search events by occasion
  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .ilike('occasion', `%${eventName}%`)
    .order('event_date', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return { found: false, query: eventName }

  const e = data[0] as Record<string, unknown>
  return {
    found: true,
    event: {
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      status: e.status,
      guestCount: e.guest_count,
      clientName: ((e.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
    },
  }
}

async function executeEventListByStatus(inputs: Record<string, unknown>, tenantId: string) {
  const status = String(inputs.status ?? 'confirmed') as
    | 'draft'
    | 'proposed'
    | 'accepted'
    | 'paid'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', status)
    .order('event_date', { ascending: true })
    .limit(10)

  return {
    status,
    events: (data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      occasion: e.occasion as string | null,
      date: e.event_date as string | null,
      status: e.status as string,
      guestCount: e.guest_count as number | null,
      clientName: ((e.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
    })),
  }
}

async function executeInquiryListOpen() {
  const inquiries = await getInquiries({
    status: ['new', 'awaiting_chef', 'awaiting_client'] as never,
  })

  return {
    inquiries: (inquiries ?? []).slice(0, 10).map((i: Record<string, unknown>) => {
      // Resolve the best display name: linked client > unknown_fields contact > source_message excerpt
      const linkedClientName = (i.client as Record<string, unknown> | null)?.full_name as
        | string
        | undefined
      const unknownFields = i.unknown_fields as Record<string, unknown> | null
      const unknownContactName = unknownFields?.client_name as string | undefined
      const occasion = (i.confirmed_occasion as string | null) ?? (i.event_type as string | null)
      const sourceMsg = i.source_message as string | null

      let clientName = linkedClientName ?? unknownContactName ?? ''
      if (!clientName && sourceMsg) {
        clientName = `Lead: ${sourceMsg.slice(0, 40)}`
      }
      if (!clientName) clientName = 'New lead'

      return {
        id: i.id as string,
        status: i.status as string,
        eventType: occasion,
        eventDate: (i.confirmed_date as string | null) ?? (i.event_date as string | null),
        guestCount: (i.confirmed_guest_count as number | null) ?? (i.guest_count as number | null),
        clientName,
        channel: i.channel as string | null,
        sourceMessage: sourceMsg ? sourceMsg.slice(0, 80) : null,
      }
    }),
  }
}

async function executeInquiryDetails(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  // Get all inquiries and search by client name or event type
  const allInquiries = await getInquiries()
  const match = (allInquiries ?? []).find((i: Record<string, unknown>) => {
    const clientName = ((i.client as Record<string, unknown> | null)?.full_name as string) ?? ''
    const eventType = (i.event_type as string) ?? ''
    return (
      clientName.toLowerCase().includes(query.toLowerCase()) ||
      eventType.toLowerCase().includes(query.toLowerCase())
    )
  })

  if (!match) return { found: false, query }

  const m = match as Record<string, unknown>
  return {
    found: true,
    inquiry: {
      id: m.id,
      status: m.status,
      eventType: m.event_type,
      eventDate: m.event_date,
      guestCount: m.guest_count,
      budget: m.budget_cents,
      message: m.message,
      clientName: ((m.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
    },
  }
}

async function executeFinanceMonthlySnapshot() {
  const summary = await getTenantFinancialSummary()
  return {
    totalRevenueCents: summary.totalRevenueCents,
    totalRefundsCents: summary.totalRefundsCents,
    totalTipsCents: summary.totalTipsCents,
    netRevenueCents: summary.netRevenueCents,
    totalWithTipsCents: summary.totalWithTipsCents,
  }
}

async function executeRecipeSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  const recipes = await getRecipes({ search: query })
  return {
    recipes: (recipes ?? []).slice(0, 10).map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      prepTime: r.prep_time_minutes,
      cookTime: r.cook_time_minutes,
      timesCooked: r.times_cooked,
    })),
  }
}

async function executeMenuList(inputs: Record<string, unknown>) {
  const status = inputs.status as string | undefined
  const menus = await getMenus(
    status ? { statusFilter: status as 'draft' | 'shared' | 'locked' | 'archived' } : {}
  )
  return {
    menus: (menus ?? []).slice(0, 10).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.name as string,
      status: m.status as string,
    })),
  }
}

async function executeSchedulingNextAvailable(inputs: Record<string, unknown>) {
  const startDateStr = String(inputs.startDate ?? new Date().toISOString().split('T')[0])
  const startDate = new Date(startDateStr)

  // Check up to 30 days from start
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(startDate)
    checkDate.setDate(checkDate.getDate() + i)
    const dateStr = checkDate.toISOString().split('T')[0]
    const result = await checkCalendarAvailability(dateStr)
    if (result.available) {
      return { nextAvailable: dateStr, daysFromStart: i }
    }
  }

  return { nextAvailable: null, message: 'No availability found in the next 30 days.' }
}

// ─── Web Task Executors ─────────────────────────────────────────────────────────

/** Block web searches that are trying to find/generate recipes */
const WEB_RECIPE_BLOCK_PATTERN =
  /\b(recipe|how\s+to\s+(cook|make|prepare|bake|roast|grill|braise|fry)|meal\s+(plan|idea|prep)|what\s+to\s+(cook|make))\b/i

async function executeWebSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  if (WEB_RECIPE_BLOCK_PATTERN.test(query)) {
    return {
      query,
      results: [],
      blocked: true,
      message:
        "Web recipe searches are not allowed — recipes are the chef's creative domain. Use recipe.search to look through your existing recipe book instead.",
    }
  }
  const limit = Number(inputs.limit) || 5
  const results = await searchWeb(query, limit)
  return { query, results }
}

async function executeWebRead(inputs: Record<string, unknown>) {
  const url = String(inputs.url ?? '')
  if (!url.startsWith('http')) {
    throw new Error('Invalid URL — must start with http:// or https://')
  }
  const result = await readWebPage(url)
  return { url: result.url, title: result.title, summary: result.summary }
}

// ─── Phase 2 Executors ────────────────────────────────────────────────────────

async function executeDietaryCheck(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName) {
    return { summary: 'Please specify a client name to check dietary restrictions for.' }
  }
  const result = await checkDietaryByClientName(clientName)
  return {
    clientName: result.clientName,
    restrictions: result.restrictions,
    flags: result.flags,
    safeItems: result.safeItems,
    summary: result.summary,
  }
}

async function executeFavoriteChefs() {
  const chefs = await getFavoriteChefs()
  return {
    chefs: chefs.map((c) => ({
      name: c.chefName,
      reason: c.reason,
      websiteUrl: c.websiteUrl,
    })),
    count: chefs.length,
  }
}

async function executeCulinaryProfile() {
  const profile = await getCulinaryProfile()
  const answered = profile.filter((a) => a.answer.trim().length > 0)
  return {
    answers: answered.map((a) => ({
      question: a.question,
      answer: a.answer,
    })),
    answeredCount: answered.length,
    totalCount: profile.length,
  }
}

async function executePrepTimeline(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName) {
    return { summary: 'Please specify an event name to generate a prep timeline for.' }
  }
  const result = await generatePrepTimelineByName(eventName)
  return {
    eventName: result.eventName,
    eventDate: result.eventDate,
    guestCount: result.guestCount,
    steps: result.steps,
    totalPrepHours: result.totalPrepHours,
    summary: result.summary,
  }
}

async function executeNudgeList() {
  const nudges = await getProactiveNudges()
  return {
    nudges: nudges.map((n) => ({
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority,
      actionLabel: n.actionLabel,
      actionHref: n.actionHref,
    })),
    count: nudges.length,
  }
}

async function executeGroceryQuickAdd(inputs: Record<string, unknown>) {
  const items = String(inputs.items ?? '')
  if (!items) {
    return { summary: 'Please specify grocery items to parse.' }
  }
  const result = await parseGroceryItems(items)
  return {
    items: result.items,
    summary: result.summary,
  }
}

async function executeDocumentSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  const docs = await searchDocuments(query)
  return {
    documents: docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      folderName: d.folderName,
    })),
    count: docs.length,
  }
}

async function executeListFolders() {
  const folders = await listFolders()
  return {
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      icon: f.icon,
    })),
    count: folders.length,
  }
}

async function executeCreateFolder(inputs: Record<string, unknown>) {
  const name = String(inputs.name ?? '')
  if (!name) {
    return { success: false, error: 'Please specify a folder name.' }
  }
  const result = await createFolder(name)
  return result
}

// ─── Operations / Analytics / Client-Facing Executors ───────────────────────

async function executePortionCalc(inputs: Record<string, unknown>) {
  const recipeName = String(inputs.recipeName ?? '')
  const guestCount = Number(inputs.guestCount) || 10
  if (!recipeName) return { summary: 'Please specify a recipe name.' }
  return calculatePortions(recipeName, guestCount)
}

async function executePackingList(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName) return { summary: 'Please specify an event name.' }
  return generatePackingList(eventName)
}

async function executeCrossContamination(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName) return { summary: 'Please specify an event name.' }
  return analyzeCrossContamination(eventName)
}

async function executeBreakEven(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName) return { summary: 'Please specify an event name.' }
  return analyzeBreakEven(eventName)
}

async function executeClientLTV(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName) return { summary: 'Please specify a client name.' }
  return calculateClientLTV(clientName)
}

async function executeRecipeCost(inputs: Record<string, unknown>) {
  const recipeName = String(inputs.recipeName ?? '')
  if (!recipeName) return { summary: 'Please specify a recipe name.' }
  return optimizeRecipeCost(recipeName)
}

async function executeEventRecap(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName) return { summary: 'Please specify an event name.' }
  return getEventRecap(eventName)
}

async function executeMenuExplanation(inputs: Record<string, unknown>) {
  const menuName = String(inputs.menuName ?? '')
  if (!menuName) return { summary: 'Please specify a menu name.' }
  return explainMenu(menuName)
}

// ─── Communication Draft Executors ──────────────────────────────────────────

async function executeDraftThankYou(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName) return { draftText: '', error: 'Please specify which client to thank.' }
  const eventHint = inputs.eventName ? String(inputs.eventName) : undefined
  return generateThankYouDraft(clientName, eventHint)
}

async function executeDraftReferralRequest(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName)
    return { draftText: '', error: 'Please specify which client to ask for referrals.' }
  return generateReferralRequestDraft(clientName)
}

async function executeDraftTestimonialRequest(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName)
    return { draftText: '', error: 'Please specify which client to ask for a testimonial.' }
  return generateTestimonialRequestDraft(clientName)
}

async function executeDraftQuoteCoverLetter(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName)
    return { draftText: '', error: 'Please specify which event needs a cover letter.' }
  return generateQuoteCoverLetterDraft(eventName)
}

async function executeDraftDeclineResponse(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName) return { draftText: '', error: 'Please specify which client to decline.' }
  const reason = inputs.reason ? String(inputs.reason) : undefined
  return generateDeclineResponseDraft(clientName, reason)
}

async function executeDraftCancellationResponse(inputs: Record<string, unknown>) {
  const eventName = String(inputs.eventName ?? '')
  if (!eventName) return { draftText: '', error: 'Please specify which event was cancelled.' }
  return generateCancellationResponseDraft(eventName)
}

async function executeDraftPaymentReminder(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName)
    return { draftText: '', error: 'Please specify which client needs a payment reminder.' }
  return generatePaymentReminderDraft(clientName)
}

async function executeDraftReEngagement(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName) return { draftText: '', error: 'Please specify which client to re-engage.' }
  return generateReEngagementDraft(clientName)
}

async function executeDraftMilestoneRecognition(inputs: Record<string, unknown>) {
  const clientName = String(inputs.clientName ?? '')
  if (!clientName) return { draftText: '', error: 'Please specify which client hit a milestone.' }
  const milestone = inputs.milestone ? String(inputs.milestone) : undefined
  return generateMilestoneRecognitionDraft(clientName, milestone)
}

async function executeDraftFoodSafetyIncident(inputs: Record<string, unknown>) {
  const description = String(inputs.description ?? '')
  if (!description) return { draftText: '', error: 'Please describe the food safety incident.' }
  return generateFoodSafetyIncidentDraft(description)
}

async function executeDraftConfirmation(inputs: Record<string, unknown>) {
  const eventId = String(inputs.eventId ?? inputs.event_id ?? '')
  const clientName = String(inputs.clientName ?? inputs.client_name ?? '')
  if (!eventId && !clientName)
    return { draftText: '', error: 'Please specify an event or client to confirm.' }
  return generateConfirmationDraft(eventId || clientName)
}

async function executeEmailGeneric(inputs: Record<string, unknown>) {
  const description = String(inputs.description ?? '')
  if (!description) {
    return { draftText: '', error: 'Please describe what the email should be about.' }
  }

  // Use Ollama to draft the email
  const { parseWithOllama } = await import('@/lib/ai/parse-ollama')
  const { z } = await import('zod')

  const EmailDraftSchema = z.object({
    subject: z.string(),
    body: z.string(),
  })

  const result = await parseWithOllama(
    `You are a private chef's email assistant. Draft a professional, warm email based on the chef's description. Write in the chef's voice (first person singular "I"). Keep it concise (3-5 short paragraphs max). Don't be salesy. Return JSON: { "subject": "...", "body": "..." }`,
    `Draft this email: ${description}`,
    EmailDraftSchema,
    { modelTier: 'standard' }
  )

  return {
    subject: result.subject,
    draftText: `Subject: ${result.subject}\n\n${result.body}`,
  }
}

// ─── Email Awareness Executors ────────────────────────────────────────────────

async function executeEmailRecent(inputs: Record<string, unknown>) {
  const limit = Number(inputs.limit) || 10
  return getRecentEmails(limit)
}

async function executeEmailSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  if (!query) return { error: 'Please specify what to search for in emails.' }
  return searchEmails(query)
}

async function executeEmailThread(inputs: Record<string, unknown>) {
  const threadId = String(inputs.threadId ?? '')
  if (!threadId) return { error: 'Please specify a thread ID.' }
  return getEmailThread(threadId)
}

async function executeEmailInboxSummary() {
  return summarizeInbox()
}

async function executeEmailDraftReply(inputs: Record<string, unknown>) {
  const messageId = String(inputs.messageId ?? '')
  if (!messageId) return { error: 'Please specify which email to reply to.', draftText: '' }
  return draftEmailReply(messageId)
}

// ─── DAG Execution Engine ─────────────────────────────────────────────────────

/**
 * Groups tasks into execution rounds based on their dependsOn graph.
 * Tasks with no dependencies go in round 0 and run first (in parallel).
 * Tasks whose deps are all in round N-1 go in round N.
 */
function buildExecutionRounds(tasks: PlannedTask[]): PlannedTask[][] {
  const remaining = new Map(tasks.map((t) => [t.id, t]))
  const done = new Set<string>()
  const rounds: PlannedTask[][] = []

  while (remaining.size > 0) {
    const readyThisRound = [...remaining.values()].filter((t) =>
      t.dependsOn.every((dep) => done.has(dep))
    )

    if (readyThisRound.length === 0) {
      // Circular or unresolvable deps — add remaining as held
      for (const t of remaining.values()) {
        rounds.push([
          {
            ...t,
            tier: 3,
            holdReason: 'This task has unresolvable dependencies.',
          },
        ])
      }
      break
    }

    rounds.push(readyThisRound)
    for (const t of readyThisRound) {
      remaining.delete(t.id)
      done.add(t.id)
    }
  }

  return rounds
}

// ─── New Tool Executors (Remy upgrade) ────────────────────────────────────────

function executeNavGo(inputs: Record<string, unknown>) {
  const route = String(inputs.route ?? '/dashboard')
  return { route, navigated: true }
}

async function executeLoyaltyStatus(inputs: Record<string, unknown>, tenantId: string) {
  const clientName = String(inputs.clientName ?? '')
  const clients = await searchClientsByName(clientName)
  if (!clients.length) throw new Error(`Could not find a client matching "${clientName}".`)

  const client = clients[0]
  const supabase: any = createServerClient()

  // Get loyalty data (loyalty_accounts doesn't exist — derive from loyalty_transactions)
  const { data: loyaltyTxns } = await supabase
    .from('loyalty_transactions')
    .select('points, type')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)

  const lifetimePoints = (loyaltyTxns ?? [])
    .filter((t: any) => t.type === 'earn')
    .reduce((s: number, t: any) => s + ((t.points as number) ?? 0), 0)
  const redeemedPoints = (loyaltyTxns ?? [])
    .filter((t: any) => t.type === 'redeem')
    .reduce((s: number, t: any) => s + Math.abs((t.points as number) ?? 0), 0)
  const pointsBalance = lifetimePoints - redeemedPoints
  // Derive tier from lifetime points
  const derivedTier =
    lifetimePoints >= 500
      ? 'platinum'
      : lifetimePoints >= 250
        ? 'gold'
        : lifetimePoints >= 100
          ? 'silver'
          : 'bronze'
  const loyalty = {
    tier: derivedTier,
    points_balance: pointsBalance,
    lifetime_points: lifetimePoints,
  }

  // Get event count for this client
  const { count: eventCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .not('status', 'eq', 'cancelled')

  const tierThresholds: Record<string, number> = {
    bronze: 100,
    silver: 250,
    gold: 500,
    platinum: Infinity,
  }
  const currentTier = (loyalty?.tier as string) ?? 'bronze'
  const currentPoints = (loyalty?.points_balance as number) ?? 0
  const nextTier =
    currentTier === 'platinum'
      ? null
      : Object.keys(tierThresholds).find(
          (t) => tierThresholds[t] > (tierThresholds[currentTier] ?? 0)
        )
  const pointsToNext = nextTier ? (tierThresholds[nextTier] ?? 0) - currentPoints : null

  return {
    clientName: client.full_name ?? clientName,
    tier: currentTier,
    pointsBalance: currentPoints,
    lifetimePoints: (loyalty?.lifetime_points as number) ?? 0,
    totalEvents: eventCount ?? 0,
    nextTier,
    pointsToNextTier: pointsToNext,
  }
}

async function executeEventAllergens(inputs: Record<string, unknown>, tenantId: string) {
  const eventName = String(inputs.eventName ?? '')
  const supabase: any = createServerClient()

  // Find the event
  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, client_id, client:clients(full_name, dietary_restrictions, allergies)'
    )
    .eq('tenant_id', tenantId)
    .ilike('occasion', `%${eventName}%`)
    .limit(1)

  if (!events?.length) throw new Error(`Could not find event matching "${eventName}".`)
  const event = events[0] as Record<string, unknown>
  const client = event.client as Record<string, unknown> | null

  // Get menu items linked to this event (via menus table, not event_menus join table)
  const { data: menuData } = await supabase
    .from('menus')
    .select('id, name, dishes(name, description, dietary_tags)')
    .eq('event_id', event.id as string)
  const menuLinks = (menuData ?? []).map((m: any) => ({ menu: m }))

  const allergies = (client?.allergies as string) ?? ''
  const dietaryRestrictions = (client?.dietary_restrictions as string) ?? ''
  const menuItems = (menuLinks ?? []).flatMap((link: Record<string, unknown>) => {
    const menu = link.menu as Record<string, unknown> | null
    return ((menu?.dishes as Array<Record<string, unknown>>) ?? []).map((d) => ({
      dish: d.name as string,
      description: (d.description as string) ?? '',
      dietaryTags: (d.dietary_tags as string[]) ?? [],
    }))
  })

  return {
    eventName: (event.occasion as string) ?? eventName,
    clientName: (client?.full_name as string) ?? 'Unknown',
    allergies: allergies || 'None recorded',
    dietaryRestrictions: dietaryRestrictions || 'None recorded',
    menuItemCount: menuItems.length,
    menuItems,
    warning: allergies ? `⚠️ ALLERGY ALERT: ${allergies}` : null,
  }
}

async function executeWaitlistList(tenantId: string) {
  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('waitlist_entries')
    .select('id, client:clients(full_name), requested_date, occasion, status, created_at')
    .eq('tenant_id', tenantId)
    .in('status', ['waiting', 'pending'])
    .order('requested_date', { ascending: true })
    .limit(20)

  return {
    entries: (data ?? []).map((w: Record<string, unknown>) => ({
      id: w.id as string,
      clientName: ((w.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      requestedDate: w.requested_date as string | null,
      occasion: w.occasion as string | null,
      status: w.status as string,
      addedOn: w.created_at as string,
    })),
    totalCount: (data ?? []).length,
  }
}

async function executeQuoteCompare(inputs: Record<string, unknown>, tenantId: string) {
  const eventName = String(inputs.eventName ?? '')
  const supabase: any = createServerClient()

  // Find the event
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', tenantId)
    .ilike('occasion', `%${eventName}%`)
    .limit(1)

  if (!events?.length) throw new Error(`Could not find event matching "${eventName}".`)
  const event = events[0] as Record<string, unknown>

  // Get all quotes for this event
  const { data: quotes } = await supabase
    .from('quotes')
    .select(
      'id, name, status, total_cents, deposit_cents, pricing_notes, created_at, version_number'
    )
    .eq('event_id', event.id)
    .order('version_number', { ascending: true })

  return {
    eventName: (event.occasion as string) ?? eventName,
    quoteCount: (quotes ?? []).length,
    quotes: (quotes ?? []).map((q: Record<string, unknown>) => ({
      id: q.id as string,
      name: (q.name as string) ?? `Version ${q.version_number ?? '?'}`,
      version: (q.version_number as number) ?? null,
      status: q.status as string,
      totalCents: (q.total_cents as number) ?? 0,
      depositCents: (q.deposit_cents as number) ?? 0,
      pricingNotes: (q.pricing_notes as string) ?? '',
      createdAt: q.created_at as string,
    })),
  }
}

async function executeSingleTask(
  task: PlannedTask,
  resolvedDeps: Record<string, unknown>,
  tenantId: string,
  policyMap: RemyApprovalPolicyMap
): Promise<TaskResult> {
  const name = getTaskName(task.taskType)

  // Tier 3: always hold, never execute
  if (task.tier === 3) {
    return {
      taskId: task.id,
      taskType: task.taskType,
      tier: 3,
      name,
      status: 'held',
      holdReason: task.holdReason ?? 'This action requires your review before proceeding.',
    }
  }

  try {
    let data: unknown

    // ─── Agent Action Registry (write actions) ──────────────────────────
    ensureAgentActionsRegistered()
    const agentAction = getAgentAction(task.taskType)
    if (agentAction) {
      const user = await requireChef()
      const ctx = { tenantId, userId: user.id }
      const policy = resolveRemyApprovalDecision({
        taskType: task.taskType,
        safety: agentAction.safety,
        policyMap,
      })

      if (policy.decision === 'block') {
        let preview: Awaited<ReturnType<typeof agentAction.executor>>['preview'] | undefined
        if (agentAction.safety === 'restricted') {
          try {
            preview = (await agentAction.executor(task.inputs, ctx)).preview
          } catch {
            // Keep blocked behavior even if preview generation fails.
          }
        }
        return {
          taskId: task.id,
          taskType: task.taskType,
          tier: 3,
          name: agentAction.name,
          status: 'held',
          holdReason:
            policy.reason ??
            preview?.fields.find((f) => f.label === 'Why')?.value ??
            'This action is blocked by your Remy approval policy.',
          preview,
        }
      }

      // Reversible/significant actions → execute to build preview, return pending
      const { preview, commitPayload } = await agentAction.executor(task.inputs, ctx)
      return {
        taskId: task.id,
        taskType: task.taskType,
        tier: 2,
        name: agentAction.name,
        status: 'pending',
        data: commitPayload,
        preview: { ...preview, commitPayload },
      }
    }

    // ─── Security guardrail: block dangerous/injection task types ────────────
    // The switch statement below handles all supported tasks; unknown types hit default.
    // This check blocks explicitly dangerous patterns before they reach the switch.
    if (
      task.taskType.includes('system') ||
      task.taskType.includes('prompt') ||
      task.taskType.includes('delete') ||
      task.taskType.includes('agent.')
    ) {
      return {
        taskId: task.id,
        taskType: task.taskType,
        tier: 3,
        name: task.taskType,
        status: 'error',
        error: 'That request is outside the scope of what I can help with.',
      }
    }

    switch (task.taskType) {
      case 'client.search':
        data = await executeClientSearch(task.inputs)
        break
      case 'calendar.availability':
        data = await executeCalendarAvailability(task.inputs)
        break
      case 'event.list_upcoming':
        data = await executeEventListUpcoming(tenantId)
        break
      case 'finance.summary':
        data = await executeFinanceSummary(tenantId)
        break
      case 'email.followup':
        data = await executeEmailFollowup(task.inputs, resolvedDeps)
        break
      case 'event.create_draft':
        data = await executeEventCreateDraft(task.inputs)
        break
      case 'client.count': {
        const allForCount = await getClients()
        data = { totalClients: (allForCount ?? []).length }
        break
      }
      case 'client.list_recent':
        data = await executeClientListRecent(task.inputs)
        break
      case 'client.details':
        data = await executeClientDetails(task.inputs)
        break
      case 'event.details':
        data = await executeEventDetails(task.inputs, tenantId)
        break
      case 'event.list_by_status':
        data = await executeEventListByStatus(task.inputs, tenantId)
        break
      case 'inquiry.list_open':
        data = await executeInquiryListOpen()
        break
      case 'inquiry.details':
        data = await executeInquiryDetails(task.inputs)
        break
      case 'finance.monthly_snapshot':
        data = await executeFinanceMonthlySnapshot()
        break
      case 'recipe.search':
        data = await executeRecipeSearch(task.inputs)
        break
      case 'menu.list':
        data = await executeMenuList(task.inputs)
        break
      case 'scheduling.next_available':
        data = await executeSchedulingNextAvailable(task.inputs)
        break
      case 'web.search':
        data = await executeWebSearch(task.inputs)
        break
      case 'web.read':
        data = await executeWebRead(task.inputs)
        break
      case 'dietary.check':
      case 'client.dietary':
      case 'client.dietary_restrictions':
        data = await executeDietaryCheck(task.inputs)
        break
      case 'chef.favorite_chefs':
        data = await executeFavoriteChefs()
        break
      case 'chef.culinary_profile':
        data = await executeCulinaryProfile()
        break
      case 'prep.timeline':
        data = await executePrepTimeline(task.inputs)
        break
      case 'nudge.list':
        data = await executeNudgeList()
        break
      case 'grocery.quick_add':
        data = await executeGroceryQuickAdd(task.inputs)
        break
      case 'document.search':
        data = await executeDocumentSearch(task.inputs)
        break
      case 'document.list_folders':
        data = await executeListFolders()
        break
      case 'document.create_folder':
        data = await executeCreateFolder(task.inputs)
        break
      case 'email.generic':
        data = await executeEmailGeneric(task.inputs)
        break
      case 'email.recent':
        data = await executeEmailRecent(task.inputs)
        break
      case 'email.search':
        data = await executeEmailSearch(task.inputs)
        break
      case 'email.thread':
        data = await executeEmailThread(task.inputs)
        break
      case 'email.inbox_summary':
      case 'email.status':
        data = await executeEmailInboxSummary()
        break
      case 'email.draft_reply':
        data = await executeEmailDraftReply(task.inputs)
        break
      case 'draft.thank_you':
        data = await executeDraftThankYou(task.inputs)
        break
      case 'draft.referral_request':
        data = await executeDraftReferralRequest(task.inputs)
        break
      case 'draft.testimonial_request':
        data = await executeDraftTestimonialRequest(task.inputs)
        break
      case 'draft.quote_cover_letter':
        data = await executeDraftQuoteCoverLetter(task.inputs)
        break
      case 'draft.decline_response':
        data = await executeDraftDeclineResponse(task.inputs)
        break
      case 'draft.cancellation_response':
        data = await executeDraftCancellationResponse(task.inputs)
        break
      case 'draft.payment_reminder':
        data = await executeDraftPaymentReminder(task.inputs)
        break
      case 'draft.re_engagement':
        data = await executeDraftReEngagement(task.inputs)
        break
      case 'draft.milestone_recognition':
        data = await executeDraftMilestoneRecognition(task.inputs)
        break
      case 'draft.food_safety_incident':
        data = await executeDraftFoodSafetyIncident(task.inputs)
        break
      case 'draft.confirmation':
        data = await executeDraftConfirmation(task.inputs)
        break
      case 'ops.portion_calc':
        data = await executePortionCalc(task.inputs)
        break
      case 'ops.packing_list':
        data = await executePackingList(task.inputs)
        break
      case 'ops.cross_contamination':
        data = await executeCrossContamination(task.inputs)
        break
      case 'analytics.break_even':
        data = await executeBreakEven(task.inputs)
        break
      case 'analytics.client_ltv':
        data = await executeClientLTV(task.inputs)
        break
      case 'analytics.recipe_cost':
        data = await executeRecipeCost(task.inputs)
        break
      case 'client.event_recap':
        data = await executeEventRecap(task.inputs)
        break
      case 'client.menu_explanation':
        data = await executeMenuExplanation(task.inputs)
        break

      // ─── New tools (Remy upgrade) ──────────────────────────────────────────
      case 'nav.go':
      case 'navigation.goto':
        data = executeNavGo(task.inputs)
        break
      case 'loyalty.status':
        data = await executeLoyaltyStatus(task.inputs, tenantId)
        break
      case 'safety.event_allergens':
        data = await executeEventAllergens(task.inputs, tenantId)
        break
      case 'waitlist.list':
        data = await executeWaitlistList(tenantId)
        break
      case 'quote.compare':
        data = await executeQuoteCompare(task.inputs, tenantId)
        break

      // ─── Phase 1: Wire existing features ──────────────────────────────────
      case 'contract.generate':
        data = await executeContractGeneration(task.inputs)
        break
      case 'contingency.plan':
        data = await executeContingencyPlanning(task.inputs)
        break
      case 'seasonal.produce':
        data = executeSeasonalProduce()
        break
      case 'grocery.consolidate':
        data = await executeGroceryConsolidation(task.inputs)
        break

      // ─── Phase 2: Financial intelligence ──────────────────────────────────
      case 'finance.forecast':
        data = await executeRevenueForecast(tenantId)
        break
      case 'finance.pnl':
        data = await executePnLReport(tenantId, task.inputs)
        break
      case 'finance.tax_summary':
        data = await executeTaxSummary(tenantId, task.inputs)
        break
      case 'finance.pricing':
        data = await executePricingAnalysis(tenantId)
        break

      // ─── Phase 3: Capacity ────────────────────────────────────────────────
      case 'capacity.utilization':
        data = await executeUtilizationAnalysis(tenantId, task.inputs)
        break

      // ─── Phase 4: Relationship intelligence ───────────────────────────────
      case 'relationship.milestones':
        data = await executeClientMilestones(tenantId)
        break
      case 'relationship.reengagement':
        data = await executeReEngagementScoring(tenantId)
        break
      case 'relationship.acquisition':
        data = await executeAcquisitionFunnel(tenantId)
        break

      // ─── Phase 5: Entity awareness ────────────────────────────────────────
      case 'goals.dashboard':
        data = await executeGoalsDashboard()
        break
      case 'equipment.list':
        data = await executeEquipmentList()
        break
      case 'equipment.maintenance':
        data = await executeEquipmentMaintenance()
        break
      case 'vendors.list':
        data = await executeVendorsList(tenantId)
        break

      // ─── Phase 6: Multi-event intelligence ────────────────────────────────
      case 'analytics.compare_events':
        data = await executeMultiEventComparison(task.inputs, tenantId)
        break

      // ─── Phase 7: Day-of support ──────────────────────────────────────────
      case 'briefing.morning':
        data = await executeMorningBriefing(tenantId)
        break

      // ─── Phase 6: Workflow chains ─────────────────────────────────────────
      case 'workflow.cancellation_impact':
        data = await executeCancellationImpact(task.inputs, tenantId)
        break
      case 'workflow.post_event':
        data = await executePostEventSequence(task.inputs)
        break

      // ─── Phase 8-9: Operational intelligence ──────────────────────────────
      case 'ops.ingredient_sub':
        data = executeIngredientSubstitution(task.inputs)
        break

      // ─── Batch 2: Complete Domain Coverage ────────────────────────────────

      // Client Intelligence
      case 'client.spending':
        data = await executeClientSpending()
        break
      case 'client.churn_risk':
        data = await executeClientChurnRisk()
        break
      case 'client.birthdays':
        data = await executeClientBirthdays()
        break
      case 'client.next_best_action':
        data = await executeClientNextBestActions()
        break
      case 'client.cooling':
        data = await executeClientCooling()
        break
      case 'client.ltv_trajectory':
        data = await executeClientLTVTrajectory(task.inputs)
        break
      case 'client.menu_history':
        data = await executeClientMenuHistory(task.inputs)
        break
      case 'client.referral_health':
        data = await executeClientReferralHealth()
        break
      case 'client.nda_status':
        data = await executeClientNDAStatus()
        break
      case 'client.payment_plans':
        data = await executeClientPaymentPlans(task.inputs)
        break

      // Event Intelligence
      case 'event.dietary_conflicts':
        data = await executeEventDietaryConflicts(task.inputs)
        break
      case 'event.debrief':
        data = await executeEventDebrief(task.inputs)
        break
      case 'event.countdown':
        data = await executeEventCountdown(task.inputs)
        break
      case 'event.invoice':
        data = await executeInvoiceLookup(task.inputs)
        break

      // Inquiry Intelligence
      case 'inquiry.follow_ups':
        data = await executeInquiryFollowUps()
        break
      case 'inquiry.likelihood':
        data = await executeInquiryLikelihood()
        break

      // Menu Intelligence
      case 'menu.food_cost':
        data = await executeMenuFoodCost()
        break
      case 'menu.dish_index':
        data = await executeMenuDishIndex()
        break
      case 'menu.showcase':
        data = await executeMenuShowcase()
        break

      // Recipe Intelligence
      case 'recipe.allergens':
        data = await executeRecipeAllergens()
        break
      case 'recipe.nutrition':
        data = await executeRecipeNutrition(task.inputs)
        break
      case 'recipe.production_logs':
        data = await executeRecipeProductionLogs()
        break

      // Finance Intelligence
      case 'finance.cash_flow':
        data = await executeCashFlowForecast()
        break
      case 'finance.mileage':
        data = await executeMileageSummary()
        break
      case 'finance.tips':
        data = await executeTipSummary()
        break
      case 'finance.contractors':
        data = await executeContractorSummary()
        break
      case 'finance.disputes':
        data = await executeDisputes()
        break
      case 'finance.payment_plan':
        data = await executePaymentPlanLookup(task.inputs)
        break
      case 'finance.recurring_invoices':
        data = await executeRecurringInvoices()
        break
      case 'finance.tax_package':
        data = await executeTaxPackage()
        break
      case 'finance.payroll':
        data = await executePayrollSummary()
        break

      // Vendor Intelligence
      case 'vendor.invoices':
        data = await executeVendorInvoices(task.inputs)
        break
      case 'vendor.price_insights':
        data = await executeVendorPriceInsights()
        break
      case 'vendor.payment_aging':
        data = await executeVendorPaymentAging()
        break

      // Equipment Intelligence
      case 'equipment.rentals':
        data = await executeEquipmentRentals(task.inputs)
        break

      // Staff Intelligence
      case 'staff.availability':
        data = await executeStaffAvailability(task.inputs)
        break
      case 'staff.briefing':
        data = await executeStaffBriefing(task.inputs)
        break
      case 'staff.clock_summary':
        data = await executeStaffClockSummary(task.inputs)
        break
      case 'staff.performance':
        data = await executeStaffPerformance()
        break
      case 'staff.labor_dashboard':
        data = await executeStaffLaborDashboard(task.inputs)
        break

      // Scheduling Intelligence
      case 'scheduling.capacity':
        data = await executeCapacityCheck(task.inputs)
        break
      case 'scheduling.prep_blocks':
        data = await executePrepBlocks(task.inputs)
        break
      case 'scheduling.protected_time':
        data = await executeProtectedTime()
        break
      case 'scheduling.gaps':
        data = await executeSchedulingGaps()
        break

      // Analytics Intelligence
      case 'analytics.pipeline':
        data = await executePipelineAnalytics()
        break
      case 'analytics.yoy':
        data = await executeYearOverYear()
        break
      case 'analytics.demand_forecast':
        data = await executeDemandForecast()
        break
      case 'analytics.benchmarks':
        data = await executeBenchmarks()
        break
      case 'analytics.pricing_suggestions':
        data = await executePricingSuggestions(task.inputs)
        break
      case 'analytics.response_time':
        data = await executeResponseTimeMetrics()
        break
      case 'analytics.cost_trends':
        data = await executeCostTrends()
        break
      case 'analytics.referrals':
        data = await executeReferralAnalytics()
        break
      case 'analytics.quote_loss':
        data = await executeQuoteLossAnalysis()
        break
      case 'analytics.service_mix':
        data = await executeRevenueByServiceType()
        break

      // Goal Intelligence
      case 'goals.history':
        data = await executeGoalHistory(task.inputs)
        break
      case 'goals.check_ins':
        data = await executeGoalCheckIns(task.inputs)
        break

      // Protection & Compliance
      case 'protection.certifications':
        data = await executeCertificationStatus()
        break
      case 'protection.business_health':
        data = await executeBusinessHealthScore()
        break

      // Loyalty Intelligence
      case 'loyalty.redemptions':
        data = await executeLoyaltyRedemptions()
        break
      case 'loyalty.gift_cards':
        data = await executeLoyaltyGiftCards()
        break

      // Inventory Intelligence
      case 'inventory.status':
        data = await executeInventoryStatus()
        break
      case 'inventory.purchase_orders':
        data = await executePurchaseOrders()
        break

      // Commerce Intelligence
      case 'commerce.sales_summary':
        data = await executeCommerceSalesSummary()
        break

      // Guest Intelligence
      case 'guest.list':
        data = await executeGuestList(task.inputs)
        break

      // Marketing Intelligence
      case 'marketing.campaigns':
        data = await executeMarketingCampaigns()
        break
      case 'marketing.newsletters':
        data = await executeNewsletterStatus()
        break

      // Review Intelligence
      case 'reviews.summary':
        data = await executeReviewsSummary()
        break

      // Gmail Intelligence
      case 'gmail.sender_reputation':
        data = await executeGmailSenderReputation()
        break

      // Notification Intelligence
      case 'notifications.preferences':
        data = await executeNotificationPreferences()
        break

      // Document Intelligence
      case 'document.snapshots':
        data = await executeDocumentSnapshots(task.inputs)
        break

      // ─── Batch 3: Gap Closure ─────────────────────────────────────────────

      // Hub Circles
      case 'circles.list':
        data = await executeCirclesList()
        break
      case 'circles.unread':
        data = await executeCirclesUnread()
        break
      case 'circles.events':
        data = await executeCircleEvents(task.inputs)
        break

      // Rate Card
      case 'rate_card.summary':
        data = await executeRateCard()
        break

      // Tasks / Kanban
      case 'tasks.list':
        data = await executeTasksList(task.inputs)
        break
      case 'tasks.by_date':
        data = await executeTasksByDate(task.inputs)
        break
      case 'tasks.overdue':
        data = await executeTasksOverdue()
        break

      // Travel
      case 'travel.plan':
        data = await executeTravelPlan(task.inputs)
        break
      case 'travel.upcoming':
        data = await executeTravelUpcoming()
        break

      // Commerce / POS
      case 'commerce.products':
        data = await executeCommerceProducts()
        break
      case 'commerce.recent_sales':
        data = await executeCommerceRecentSales()
        break
      case 'commerce.daily_report':
        data = await executeCommerceDailyReport()
        break
      case 'commerce.product_report':
        data = await executeCommerceProductReport()
        break
      case 'commerce.inventory_low':
        data = await executeCommerceInventoryLow()
        break

      // Daily Ops
      case 'daily.plan':
        data = await executeDailyPlan()
        break
      case 'daily.stats':
        data = await executeDailyPlanStats()
        break

      // Priority Queue
      case 'queue.status':
        data = await executePriorityQueue()
        break

      // Stations
      case 'stations.list':
        data = await executeStationsList()
        break
      case 'stations.detail':
        data = await executeStationDetail(task.inputs)
        break
      case 'stations.ops_log':
        data = await executeOpsLog(task.inputs)
        break
      case 'stations.waste_log':
        data = await executeWasteLog()
        break

      // Testimonials
      case 'testimonials.list':
        data = await executeTestimonialsList()
        break
      case 'testimonials.pending':
        data = await executeTestimonialsPending()
        break

      // Partners / Referrals
      case 'partners.list':
        data = await executePartnersList()
        break
      case 'partners.events':
        data = await executePartnerEvents(task.inputs)
        break
      case 'partners.performance':
        data = await executePartnerPerformance()
        break

      // Activity Feed
      case 'activity.feed':
        data = await executeActivityFeed()
        break
      case 'activity.engagement':
        data = await executeEngagementStats()
        break

      // AAR (After-Action Reviews)
      case 'aar.list':
        data = await executeAARList()
        break
      case 'aar.stats':
        data = await executeAARStats()
        break
      case 'aar.events_without':
        data = await executeEventsWithoutAAR()
        break
      case 'aar.forgotten_items':
        data = await executeAARForgottenItems()
        break

      // Waitlist
      case 'waitlist.status':
        data = await executeWaitlistStatus()
        break

      default:
        return {
          taskId: task.id,
          taskType: task.taskType,
          tier: 3,
          name: task.taskType,
          status: 'held',
          holdReason: `"${task.taskType}" is not currently supported. Try rephrasing your request.`,
        }
    }

    return {
      taskId: task.id,
      taskType: task.taskType,
      tier: task.tier as ApprovalTier,
      name,
      // tier 1 = done automatically; tier 2 = pending chef approval
      status: task.tier === 1 ? 'done' : 'pending',
      data,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    const message = err instanceof Error ? err.message : String(err)
    return {
      taskId: task.id,
      taskType: task.taskType,
      tier: task.tier as ApprovalTier,
      name,
      status: 'error',
      error: message,
    }
  }
}

// ─── Public Server Actions ────────────────────────────────────────────────────

/**
 * Main entry point. Parses the chef's command, builds a dependency DAG,
 * executes tasks in parallel rounds, and returns results grouped by tier.
 */
async function assertRemyRuntimeEnabled(tenantId: string): Promise<void> {
  // Runtime is forced-on for this portal experience.
  void tenantId
}

export async function runCommand(rawInput: string): Promise<CommandRun> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  await assertRemyRuntimeEnabled(tenantId)
  const approvalPolicyMap = await getTenantRemyApprovalPolicyMap(tenantId)
  const runId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  try {
    // Safety-critical fast-path: explicit dietary lookup queries should bypass intent parsing.
    // Guard against write intents (create/update/profile) so this does not hijack client creation.
    const dietaryMatch = rawInput.match(/\b(?:allerg|dietary|restriction|epipen|intoleran)\w*\b/i)
    const hasWriteIntent =
      /\b(?:create|add|make|set up|setup|start|update|change|edit)\b/i.test(rawInput) &&
      /\b(?:client|profile|record)\b/i.test(rawInput)
    const isLikelyDietaryLookup =
      /\b(?:check|review|show|list|what|which|does|do|is|are|any)\b[\s\S]{0,120}\b(?:allerg|dietary|restriction|intoleran)\w*\b/i.test(
        rawInput
      ) || /\?/.test(rawInput)
    const nameMatch = rawInput.match(
      /(?:for|about|does|do)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    )
    if (dietaryMatch && nameMatch && !hasWriteIntent && isLikelyDietaryLookup) {
      const clientName = nameMatch[1].replace(/(?:'s|'s)\s*$/i, '')
      const task: PlannedTask = {
        id: 't1',
        taskType: 'dietary.check',
        tier: 1,
        confidence: 1.0,
        inputs: { clientName },
        dependsOn: [],
      }
      const result = await executeSingleTask(task, {}, tenantId, approvalPolicyMap)
      return {
        runId,
        rawInput,
        startedAt,
        results: [result],
        ollamaOffline: false,
      }
    }

    let plan = await parseCommandIntent(rawInput)

    // Recovery guard: if the parser missed an explicit client create request, inject
    // a brain-dump intake task instead of leaving only read-only checks.
    const requestedClientCreate =
      /\b(?:create|add|make|set up|setup|start)\b[\s\S]{0,100}\b(?:client|profile|record)\b/i.test(
        rawInput
      )
    const hasClientWriteTask = plan.tasks.some(
      (t) =>
        t.taskType === 'agent.create_client' ||
        t.taskType === 'agent.intake_brain_dump' ||
        t.taskType === 'agent.intake_transcript' ||
        t.taskType === 'agent.intake_bulk_clients'
    )
    if (requestedClientCreate && !hasClientWriteTask) {
      const nonDietaryTasks = plan.tasks.filter((t) => t.taskType !== 'dietary.check')
      const nextId = `t${nonDietaryTasks.length + 1}`
      nonDietaryTasks.push({
        id: nextId,
        taskType: 'agent.intake_brain_dump',
        tier: 2,
        confidence: 0.85,
        inputs: { text: rawInput },
        dependsOn: [],
      })
      plan = {
        ...plan,
        tasks: nonDietaryTasks,
        overallConfidence: Math.max(plan.overallConfidence, 0.85),
      }
    }

    // Focus Mode: filter tasks to only allowed actions
    const allTaskTypes = plan.tasks.map((t) => t.taskType)
    const allowedTypes = new Set(await getAvailableActions(allTaskTypes))
    const filteredTasks = plan.tasks.filter((t) => allowedTypes.has(t.taskType))

    const rounds = buildExecutionRounds(filteredTasks)

    const allResults: TaskResult[] = []
    // Accumulates result data from completed tasks for dep resolution
    const resultsByType = new Map<string, unknown>()

    for (const round of rounds) {
      const roundResults = await Promise.all(
        round.map(async (task) => {
          // Build resolvedDeps from prior round results
          const resolvedDeps: Record<string, unknown> = {}
          for (const depId of task.dependsOn) {
            const depTask = plan.tasks.find((t) => t.id === depId)
            if (depTask && resultsByType.has(depTask.taskType)) {
              resolvedDeps[depTask.taskType] = resultsByType.get(depTask.taskType)
            }
          }
          return executeSingleTask(task, resolvedDeps, tenantId, approvalPolicyMap)
        })
      )

      for (const result of roundResults) {
        allResults.push(result)
        if (result.data !== undefined) {
          resultsByType.set(result.taskType, result.data)
        }
      }
    }

    return { runId, rawInput, startedAt, results: allResults }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      return { runId, rawInput, startedAt, results: [], ollamaOffline: true }
    }
    const message = err instanceof Error ? err.message : String(err)
    return {
      runId,
      rawInput,
      startedAt,
      results: [
        {
          taskId: 'error',
          taskType: 'error',
          tier: 3,
          name: 'Error',
          status: 'error',
          error: message,
        },
      ],
    }
  }
}

function getLegacyTaskSafety(taskType: string): 'reversible' | 'significant' | null {
  switch (taskType) {
    case 'event.create_draft':
      return 'significant'
    default:
      return null
  }
}

/**
 * Called when the chef approves a Tier 2 draft result.
 * For email drafts: copies to clipboard + provides mailto link.
 * For event drafts: creates a draft event in the database.
 */
export async function approveTask(
  taskType: string,
  data: unknown,
  approvalConfirmation?: string
): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  try {
    await assertRemyRuntimeEnabled(tenantId)
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Remy is disabled for this account.',
    }
  }
  const chefId = user.entityId ?? tenantId
  const startedAtMs = Date.now()

  // Hard guarantee: do not execute if the audit row cannot be created.
  let auditId: string
  try {
    auditId = await startRemyActionAudit({
      tenantScopeId: tenantId,
      chefId,
      authUserId: user.id,
      taskType,
      requestPayload: data,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[remy-audit] Failed to create audit row; action execution blocked', err)
    throw new Error(`Action execution blocked because audit logging failed: ${msg}`)
  }

  let auditStatus: 'success' | 'error' | 'blocked' = 'success'
  let outcome: { success: boolean; message: string; redirectUrl?: string } = {
    success: false,
    message: 'Unable to approve task.',
  }
  const approvalPolicyMap = await getTenantRemyApprovalPolicyMap(tenantId)

  try {
    ensureAgentActionsRegistered()
    const agentAction = getAgentAction(taskType)
    if (agentAction) {
      const policy = resolveRemyApprovalDecision({
        taskType,
        safety: agentAction.safety,
        policyMap: approvalPolicyMap,
      })
      if (policy.decision === 'block') {
        auditStatus = 'blocked'
        outcome = {
          success: false,
          message: policy.reason ?? 'This action is blocked by your Remy approval policy.',
        }
        return outcome
      }

      const payload = (data as Record<string, unknown>) ?? {}
      if (payload._error || payload._restricted) {
        auditStatus = 'blocked'
        outcome = { success: false, message: 'Cannot proceed - see the error in the preview.' }
        return outcome
      }

      if (agentAction.safety === 'significant') {
        const confirmation = validateSignificantApprovalPhrase({
          taskType,
          provided: approvalConfirmation,
        })
        if (!confirmation.valid) {
          auditStatus = 'blocked'
          outcome = {
            success: false,
            message: `Type "${confirmation.expected}" to approve this significant action.`,
          }
          return outcome
        }
      }

      outcome = await agentAction.commitAction(payload, { tenantId, userId: user.id })
      auditStatus = outcome.success ? 'success' : 'error'
      return outcome
    }

    const legacySafety = getLegacyTaskSafety(taskType)
    if (legacySafety) {
      const policy = resolveRemyApprovalDecision({
        taskType,
        safety: legacySafety,
        policyMap: approvalPolicyMap,
      })
      if (policy.decision === 'block') {
        auditStatus = 'blocked'
        outcome = {
          success: false,
          message: policy.reason ?? 'This action is blocked by your Remy approval policy.',
        }
        return outcome
      }
      if (legacySafety === 'significant') {
        const confirmation = validateSignificantApprovalPhrase({
          taskType,
          provided: approvalConfirmation,
        })
        if (!confirmation.valid) {
          auditStatus = 'blocked'
          outcome = {
            success: false,
            message: `Type "${confirmation.expected}" to approve this significant action.`,
          }
          return outcome
        }
      }
    }

    switch (taskType) {
      case 'email.followup':
      case 'email.generic':
      case 'email.draft_reply': {
        const d = data as { clientId?: string; clientName?: string; draftText?: string } | null
        if (d?.draftText) {
          outcome = {
            success: true,
            message:
              'Draft approved! The email text has been copied to your clipboard. Send it from your email client.',
          }
          return outcome
        }
        outcome = {
          success: true,
          message: 'Draft approved. Copy and send from your email client.',
        }
        return outcome
      }
      case 'event.create_draft': {
        const d = data as { draft?: Record<string, unknown>; error?: string } | null
        if (d?.draft && !d.error) {
          const supabase: any = createServerClient()
          const draft = d.draft
          try {
            const { data: event, error } = await supabase
              .from('events')
              .insert({
                tenant_id: tenantId,
                occasion: draft.occasion ?? 'New Event',
                event_date: draft.event_date ?? null,
                guest_count: draft.guest_count ?? null,
                status: 'draft',
                notes: draft.notes ?? `Created by Remy from: "${draft.rawDescription ?? ''}"`,
                client_id: draft.client_id ?? null,
              })
              .select('id')
              .single()

            if (error) throw error

            outcome = {
              success: true,
              message: 'Event draft created! Redirecting to the event page...',
              redirectUrl: `/events/${event.id}`,
            }
            return outcome
          } catch (err) {
            auditStatus = 'error'
            const msg = err instanceof Error ? err.message : String(err)
            outcome = { success: false, message: `Failed to create event: ${msg}` }
            return outcome
          }
        }

        outcome = {
          success: true,
          message: 'Event draft approved. Head to /events/new to fill out the details.',
          redirectUrl: '/events/new',
        }
        return outcome
      }
      default:
        outcome = { success: true, message: 'Approved.' }
        return outcome
    }
  } catch (err) {
    auditStatus = 'error'
    const msg = err instanceof Error ? err.message : String(err)
    outcome = { success: false, message: `Failed to approve task: ${msg}` }
    return outcome
  } finally {
    const finalizePayload = {
      auditId,
      tenantScopeId: tenantId,
      status: auditStatus,
      resultPayload: outcome,
      errorMessage: auditStatus === 'error' ? outcome.message : null,
      durationMs: Date.now() - startedAtMs,
    } as const

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await finishRemyActionAudit(finalizePayload)
        break
      } catch (err) {
        if (attempt === 2) {
          // Do not fail an already-executed action when audit finalization write fails.
          console.error('[remy-audit] Failed to finalize action audit row after retry', err)
        }
      }
    }
  }
}
