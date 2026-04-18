'use server'

// Remy - Context Loader
// PRIVACY: Loads chef business context for Remy's system prompt.
// Contains client names, event details, and financial data - must stay local.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { RemyContext, PageEntityContext } from '@/lib/ai/remy-types'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'

// Safe local-date ISO string - avoids UTC offset shifting after ~7pm ET
function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}
function localDateOffset(d: Date, days: number): string {
  return localDateISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days))
}
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { archetypeToOperatorType, OPERATOR_TARGETS } from '@/lib/costing/knowledge'
import { loadEmailDigest } from '@/lib/ai/remy-email-actions'
import { sanitizeForPrompt } from '@/lib/ai/remy-input-validation'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import { getBusinessHealthSummary } from '@/lib/intelligence/business-health-summary'
import { getEventIntelligenceContext } from '@/lib/intelligence/event-context'
import { getClientIntelligenceContext } from '@/lib/intelligence/client-intelligence-context'
import { getInquiryConversionContext } from '@/lib/intelligence/inquiry-conversion-context'
import { getServiceConfigForTenant } from '@/lib/chef-services/service-config-internal'
import { formatServiceConfigForPrompt } from '@/lib/chef-services/service-config-actions'

// ─── In-Memory Cache (per-tenant, 5-min TTL) ────────────────────────────────

interface CachedContext {
  data: Omit<
    RemyContext,
    | 'clientCount'
    | 'upcomingEventCount'
    | 'openInquiryCount'
    | 'currentPage'
    | 'chefName'
    | 'businessName'
    | 'tagline'
    | 'chefCity'
    | 'chefState'
    | 'chefArchetype'
    | 'pageEntity'
    | 'mentionedEntities'
    | 'dailyPlan'
    | 'emailDigest'
    | 'serviceConfigPrompt'
    | 'recentSurveyFeedback'
    | 'pendingMilestones'
  >
  expiresAt: number
}

const contextCache = new Map<string, CachedContext>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Empty detailed context for minimal scope - skips all 31 Tier 2 queries */
function getEmptyDetailedContext(): CachedContext['data'] {
  return {
    upcomingEvents: [],
    recentClients: [],
    monthRevenueCents: undefined,
    pendingQuoteCount: 0,
    calendarSummary: { blockedDates: [], calendarEntries: [], waitlistEntries: [] },
    yearlyStats: undefined,
    quoteDistribution: undefined,
    inquiryVelocity: undefined,
    profitabilityStats: undefined,
    staffRoster: [],
    equipmentSummary: { totalItems: 0, categories: [] },
    activeGoals: [],
    activeTodos: [],
    upcomingCalls: [],
    documentSummary: { totalDocuments: 0, totalFolders: 0 },
    recentArtifacts: [],
    recipeStats: undefined,
    clientVibeNotes: [],
    recentAARInsights: [],
    pendingMenuApprovals: [],
    unreadInquiryMessages: [],
    staleInquiries: [],
    overduePayments: [],
    upcomingPaymentDeadlines: [],
    expiringQuotes: [],
    clientReengagement: [],
    revenuePattern: undefined,
    conversionRate: undefined,
    expenseBreakdown: [],
    dayOfWeekPattern: undefined,
    serviceStyles: [],
    repeatClientRatio: undefined,
    avgLeadTime: undefined,
    guestCountTrend: undefined,
    costingContext: undefined,
  } as CachedContext['data']
}

/**
 * Bust the Remy context cache for a tenant so the next Remy query
 * picks up freshly-mutated data instead of stale 5-minute context.
 * Call this from any server action that mutates data Remy reads
 * (events, clients, recipes, menus, financials, inquiries, etc.).
 */
export async function invalidateRemyContextCache(tenantId: string): Promise<void> {
  contextCache.delete(tenantId)
}

async function recordContextFailure(
  tenantId: string,
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error)

  await recordSideEffectFailure({
    source: 'remy-context',
    operation,
    severity: 'medium',
    tenantId,
    errorMessage,
    context,
  })
}

async function withContextFallback<T>(
  tenantId: string,
  operation: string,
  fallback: T,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    await recordContextFailure(tenantId, operation, error, context)
    return fallback
  }
}

async function reportContextQueryErrors(
  tenantId: string,
  results: Record<string, { error?: { message: string } | null }>
): Promise<void> {
  const failures = Object.entries(results).filter(([, result]) => result.error)
  await Promise.all(
    failures.map(([operation, result]) =>
      recordContextFailure(tenantId, operation, result.error, { queryScope: 'remy_context' })
    )
  )
}

// ─── Public Loader ──────────────────────────────────────────────────────────

export async function loadRemyContext(
  currentPage?: string,
  scopeHint?: 'minimal' | 'focused' | 'full' | null
): Promise<RemyContext> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const isMinimal = scopeHint === 'minimal'

  // Tier 1: Always fresh (cheap count queries + chef profile + daily plan + service config)
  // These run even for minimal scope - they're fast and provide core business summary.
  const [chefProfile, counts, dailyPlan, healthSummary, serviceConfig, archetype] =
    await Promise.all([
      loadChefProfile(db, tenantId),
      loadQuickCounts(db, tenantId),
      isMinimal
        ? Promise.resolve(null)
        : withContextFallback(tenantId, 'load_daily_plan', null, () => getDailyPlanStats()),
      isMinimal
        ? Promise.resolve(null)
        : withContextFallback(tenantId, 'load_business_health_summary', null, async () => {
            const summary = await getBusinessHealthSummary()
            return summary.remyContext
          }),
      isMinimal
        ? Promise.resolve(null)
        : withContextFallback(tenantId, 'load_service_config', null, () =>
            getServiceConfigForTenant(tenantId)
          ),
      isMinimal ? Promise.resolve(null) : getCachedChefArchetype(tenantId),
    ])

  // Tier 2: Cached for 5 minutes - SKIP ENTIRELY for minimal scope
  // This is the big win: 31 queries eliminated for simple questions like "hi" or "where do I add a client?"
  let detailed: CachedContext['data']

  if (isMinimal) {
    // Return empty defaults - minimal scope only needs profile + counts + page entity
    detailed = getEmptyDetailedContext()
  } else {
    const cached = contextCache.get(tenantId)
    if (cached && cached.expiresAt > Date.now()) {
      detailed = cached.data
    } else {
      detailed = await loadDetailedContext(db, tenantId)
      contextCache.set(tenantId, {
        data: detailed,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
    }
  }

  // Tier 2b: Skip entirely for minimal scope
  let emailDigest: Awaited<ReturnType<typeof loadEmailDigest>> | undefined
  let recentSurveyFeedback: any
  let pendingMilestones: any

  if (isMinimal) {
    emailDigest = undefined
    recentSurveyFeedback = undefined
    pendingMilestones = undefined
  } else {
    emailDigest =
      (await withContextFallback(
        tenantId,
        'load_email_digest',
        undefined,
        () => loadEmailDigest(tenantId),
        { currentPage: currentPage ?? null }
      )) ?? undefined

    recentSurveyFeedback = await withContextFallback(
      tenantId,
      'load_recent_survey_feedback',
      undefined,
      async () => {
        const { data } = await db
          .from('post_event_surveys')
          .select(
            'overall_rating, would_book_again, completed_at, event:events(occasion, client:clients(full_name))'
          )
          .eq('chef_id', tenantId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5)
        if (!data || data.length === 0) return undefined
        return data.map((s: any) => ({
          clientName: s.event?.client?.full_name ?? 'Unknown',
          overallRating: s.overall_rating ?? 0,
          wouldBookAgain: s.would_book_again ?? false,
          completedAt: s.completed_at,
        }))
      }
    )

    pendingMilestones = await withContextFallback(
      tenantId,
      'load_pending_milestones',
      undefined,
      async () => {
        const { data } = await db
          .from('event_payment_milestones')
          .select('name, amount_cents, due_date, event:events(occasion, client:clients(full_name))')
          .eq('chef_id', tenantId)
          .in('status', ['pending', 'partial'])
          .order('due_date', { ascending: true })
          .limit(10)
        if (!data || data.length === 0) return undefined
        return data.map((m: any) => ({
          clientName: m.event?.client?.full_name ?? 'Unknown',
          occasion: m.event?.occasion ?? 'Event',
          milestoneName: m.name ?? 'Payment',
          amountCents: m.amount_cents ?? 0,
          dueDate: m.due_date,
        }))
      }
    )
  }

  // Tier 3: Page-specific entity context - always load (cheap and useful even for minimal)
  const pageEntity = await withContextFallback(
    tenantId,
    'load_page_entity_context',
    undefined,
    () => loadPageEntityContext(db, tenantId, currentPage),
    { currentPage: currentPage ?? null }
  )

  return {
    chefName: chefProfile.businessName,
    businessName: chefProfile.businessName,
    tagline: chefProfile.tagline,
    chefCity: chefProfile.city,
    chefState: chefProfile.state,
    chefArchetype: chefProfile.archetype,
    clientCount: counts.clients,
    upcomingEventCount: counts.upcomingEvents,
    openInquiryCount: counts.openInquiries,
    upcomingEvents: detailed.upcomingEvents,
    recentClients: detailed.recentClients,
    monthRevenueCents: detailed.monthRevenueCents,
    pendingQuoteCount: detailed.pendingQuoteCount,
    currentPage,
    pageEntity,
    dailyPlan: dailyPlan ?? undefined,
    emailDigest: emailDigest ?? undefined,
    calendarSummary: detailed.calendarSummary,
    yearlyStats: detailed.yearlyStats,
    staffRoster: detailed.staffRoster,
    equipmentSummary: detailed.equipmentSummary,
    activeGoals: detailed.activeGoals,
    activeTodos: detailed.activeTodos,
    upcomingCalls: detailed.upcomingCalls,
    documentSummary: detailed.documentSummary,
    recentArtifacts: detailed.recentArtifacts,
    // Proactive nudges
    staleInquiries: detailed.staleInquiries,
    overduePayments: detailed.overduePayments,
    // Re-engagement signals
    clientReengagement: detailed.clientReengagement,
    // Revenue patterns
    revenuePattern: detailed.revenuePattern,
    // Business intelligence (cross-engine synthesis)
    businessIntelligence: healthSummary ?? undefined,
    // Service configuration (what this chef offers/doesn't offer)
    serviceConfigPrompt: serviceConfig
      ? await formatServiceConfigForPrompt(serviceConfig)
      : undefined,
    // Post-event survey feedback
    recentSurveyFeedback: recentSurveyFeedback ?? undefined,
    // Payment milestones
    pendingMilestones: pendingMilestones ?? undefined,
    // Food costing targets (operator-specific)
    costingContext: (() => {
      const opType = archetypeToOperatorType(archetype)
      const targets = OPERATOR_TARGETS[opType]
      return {
        operationType: opType,
        foodCostTargetLow: targets.foodCostPctLow,
        foodCostTargetHigh: targets.foodCostPctHigh,
        primeCostTarget: targets.primeCostPctTarget,
        qFactorDefault: targets.qFactorDefault,
        recostFrequency: targets.recostFrequency,
      }
    })(),
  }
}

// ─── Tier 1: Chef Profile ───────────────────────────────────────────────────

async function loadChefProfile(db: any, tenantId: string) {
  const { data, error } = await db
    .from('chefs')
    .select('business_name, tagline, city, state, archetype')
    .eq('id', tenantId)
    .single()

  if (error) {
    await recordContextFailure(tenantId, 'load_chef_profile', error)
  }

  return {
    businessName: data?.business_name ?? null,
    tagline: data?.tagline ?? null,
    city: data?.city ?? null,
    state: data?.state ?? null,
    archetype: data?.archetype ?? null,
  }
}

// ─── Tier 1: Quick Counts ───────────────────────────────────────────────────

async function loadQuickCounts(db: any, tenantId: string) {
  const [clientsResult, eventsResult, inquiriesResult] = await Promise.all([
    db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', localDateISO(new Date())),
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef', 'awaiting_client']),
  ])

  await reportContextQueryErrors(tenantId, {
    count_clients: clientsResult,
    count_upcoming_events: eventsResult,
    count_open_inquiries: inquiriesResult,
  })

  return {
    clients: clientsResult.count ?? 0,
    upcomingEvents: eventsResult.count ?? 0,
    openInquiries: inquiriesResult.count ?? 0,
  }
}

// ─── Tier 2: Detailed Context (cached 5 min) ────────────────────────────────

async function loadDetailedContext(db: any, tenantId: string) {
  const now = new Date()
  const today = localDateISO(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const next30 = localDateOffset(now, 30)

  const [
    eventsResult,
    clientsResult,
    revenueResult,
    quotesResult,
    // New: calendar, availability, staff, equipment, goals, todos, calls, documents, artifacts, yearly stats
    availabilityResult,
    calendarResult,
    waitlistResult,
    staffResult,
    equipmentResult,
    goalsResult,
    todosResult,
    callsResult,
    documentsResult,
    foldersResult,
    artifactsResult,
    yearRevenueResult,
    yearExpensesResult,
    yearEventsResult,
    // Context enrichment (2026-02-28)
    recipeStatsResult,
    clientVibeNotesResult,
    recentAARsResult,
    pendingMenuApprovalsResult,
    unreadInquiryMsgsResult,
    // Proactive nudges (2026-03-06)
    staleInquiriesResult,
    overduePaymentsResult,
    clientBookingHistoryResult,
    monthlyRevenueResult,
    // Deadline warnings (2026-03-06)
    upcomingPaymentDeadlinesResult,
    expiringQuotesResult,
    // Event profitability
    eventProfitabilityResult,
    // Inquiry velocity
    inquiryVelocityResult,
    // Staff utilization
    staffAssignmentsResult,
    // Wave 9-12 intelligence
    conversionRateResult,
    expenseBreakdownResult,
    allEventsPatternResult,
    menuApprovalResult,
    clientReferralResult,
  ] = await Promise.all([
    // Upcoming events (next 7 days, limit 10)
    db
      .from('events')
      .select(
        'id, occasion, event_date, status, guest_count, prep_list_ready, grocery_list_ready, timeline_ready, client:clients(full_name, loyalty_tier, loyalty_points)'
      )
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(10),

    // Recent clients (limit 5)
    db
      .from('clients')
      .select('id, full_name, loyalty_tier, loyalty_points')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Month revenue from ledger (all non-refund, non-tip entry types)
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('is_refund', false)
      .not('entry_type', 'eq', 'tip')
      .gte('created_at', monthStart),

    // Pending quotes
    db
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'sent']),

    // Availability blocks (next 30 days)
    db
      .from('chef_availability_blocks')
      .select('block_date, block_type, reason')
      .eq('chef_id', tenantId)
      .gte('block_date', today)
      .lte('block_date', next30)
      .order('block_date', { ascending: true })
      .limit(20),

    // Calendar entries (next 30 days)
    db
      .from('chef_calendar_entries')
      .select('title, start_date, end_date, entry_type, blocks_bookings')
      .eq('chef_id', tenantId)
      .gte('end_date', today)
      .lte('start_date', next30)
      .order('start_date', { ascending: true })
      .limit(15),

    // Waitlist entries (active)
    db
      .from('waitlist_entries')
      .select('requested_date, occasion, status, client:clients(full_name)')
      .eq('chef_id', tenantId)
      .in('status', ['waiting', 'contacted'])
      .order('requested_date', { ascending: true })
      .limit(10),

    // Staff roster
    db
      .from('staff_members')
      .select('id, full_name, default_role, phone, status')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .order('full_name', { ascending: true })
      .limit(20),

    // Equipment count by category
    db
      .from('equipment_items')
      .select('id, category')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .limit(100),

    // Active goals
    db
      .from('chef_goals')
      .select('title, target_date, progress_pct, status')
      .eq('chef_id', tenantId)
      .in('status', ['active', 'in_progress'])
      .order('target_date', { ascending: true })
      .limit(10),

    // Active todos (chef_todos only has: text, completed, sort_order)
    db
      .from('chef_todos')
      .select('text, completed, sort_order')
      .eq('chef_id', tenantId)
      .eq('completed', false)
      .order('sort_order', { ascending: true })
      .limit(10),

    // Scheduled calls (upcoming)
    db
      .from('scheduled_calls')
      .select('scheduled_at, purpose, status, client:clients(full_name)')
      .eq('chef_id', tenantId)
      .gte('scheduled_at', now.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true })
      .limit(5),

    // Documents count
    db.from('chef_documents').select('id', { count: 'exact', head: true }).eq('chef_id', tenantId),

    // Folders count
    db.from('chef_folders').select('id', { count: 'exact', head: true }).eq('chef_id', tenantId),

    // Recent Remy artifacts
    db
      .from('remy_artifacts')
      .select('artifact_type, title, created_at')
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Year revenue (all non-refund, non-tip ledger entries YTD)
    db
      .from('ledger_entries')
      .select('amount_cents, client_id')
      .eq('tenant_id', tenantId)
      .eq('is_refund', false)
      .not('entry_type', 'eq', 'tip')
      .gte('created_at', yearStart),

    // Year expenses
    db
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .gte('expense_date', yearStart.split('T')[0]),

    // Year events
    db
      .from('events')
      .select('id, status, quoted_price_cents, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', yearStart.split('T')[0])
      .not('status', 'eq', 'cancelled'),

    // ─── Context enrichment (2026-02-28) ─────────────────────────────────

    // Recipe library stats
    db.from('recipes').select('id, category').eq('tenant_id', tenantId).limit(200),

    // Client vibe notes + dietary/allergy data (safety-critical)
    // No vibe_notes filter: clients with allergies but no vibe notes must still be visible
    // Q16/Q19: include id (for structured allergy lookup) and status (dormancy visibility)
    db
      .from('clients')
      .select('id, full_name, vibe_notes, dietary_restrictions, allergies, status')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(20),

    // Recent after-action reviews (lessons learned)
    db
      .from('after_action_reviews')
      .select('event_id, overall_rating, went_well, to_improve, lessons_learned, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(3),

    // Pending menu approvals
    db
      .from('menu_approval_requests')
      .select('id, status, client:clients(full_name), created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),

    // Unread inbound messages (inquiry_messages table doesn't exist - use messages table)
    db
      .from('messages')
      .select('id, inquiry_id, direction, created_at, clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('direction', 'inbound')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10),

    // ─── Proactive nudges (2026-03-06) ────────────────────────────────────

    // Stale inquiries (no response in >3 days) - includes lead score for urgency escalation
    db
      .from('inquiries')
      .select('id, lead_name, updated_at, chef_likelihood, unknown_fields')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef'])
      .lt('updated_at', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: true })
      .limit(5),

    // Overdue payments (events past due date with outstanding balance)
    db
      .from('events')
      .select('id, occasion, payment_due_date, balance_due_cents, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gt('balance_due_cents', 0)
      .lt('payment_due_date', today)
      .not('status', 'eq', 'cancelled')
      .order('payment_due_date', { ascending: true })
      .limit(5),

    // Client booking frequency - all completed/confirmed events with client + date
    // Used to detect clients overdue for re-engagement based on their historical cadence
    db
      .from('events')
      .select('client_id, event_date, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
      .not('client_id', 'is', null)
      .order('event_date', { ascending: true })
      .limit(500),

    // Monthly revenue distribution - all revenue entries from past 12 months
    // Used to identify busy/slow months for revenue pattern awareness
    db
      .from('ledger_entries')
      .select('amount_cents, created_at')
      .eq('tenant_id', tenantId)
      .eq('is_refund', false)
      .not('entry_type', 'eq', 'tip')
      .gte('created_at', new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString()),

    // Upcoming payment deadlines (due within 7 days, not yet overdue)
    db
      .from('events')
      .select('id, occasion, payment_due_date, balance_due_cents, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gt('balance_due_cents', 0)
      .gte('payment_due_date', today)
      .lte('payment_due_date', localDateOffset(now, 7))
      .not('status', 'eq', 'cancelled')
      .order('payment_due_date', { ascending: true })
      .limit(5),

    // Expiring quotes (valid_until within 7 days)
    db
      .from('quotes')
      .select('id, valid_until, total_cents, event:events(occasion, client:clients(full_name))')
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .gte('valid_until', today)
      .lte('valid_until', localDateOffset(now, 7))
      .order('valid_until', { ascending: true })
      .limit(5),

    // Event profitability - completed events this year with profit data
    db
      .from('event_financial_summary' as any)
      .select(
        'event_id, quoted_price_cents, net_revenue_cents, total_expenses_cents, profit_cents, profit_margin'
      )
      .eq('tenant_id', tenantId)
      .gt('net_revenue_cents', 0)
      .limit(50),

    // Inquiry velocity - this week vs last week
    db
      .from('inquiries')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100),

    // Staff assignments - upcoming events (for utilization awareness)
    db
      .from('event_staff_assignments')
      .select('staff_member_id, event:events!inner(event_date, status)')
      .eq('chef_id', tenantId)
      .eq('status', 'confirmed')
      .limit(100),

    // Conversion rate - all inquiries with their resolution status
    db
      .from('inquiries')
      .select('id, status, created_at, channel')
      .eq('tenant_id', tenantId)
      .gte('created_at', yearStart)
      .limit(500),

    // Expense breakdown - categories for this year
    db
      .from('expenses')
      .select('category, amount_cents')
      .eq('tenant_id', tenantId)
      .gte('expense_date', yearStart.split('T')[0])
      .limit(500),

    // All events with dates, guest counts, service style, location for pattern detection
    db
      .from('events')
      .select(
        'id, event_date, guest_count, service_style, status, location_city, location_state, dietary_restrictions, allergies, client_id, occasion, created_at'
      )
      .eq('tenant_id', tenantId)
      .not('status', 'eq', 'cancelled')
      .order('event_date', { ascending: false })
      .limit(200),

    // Menu approval turnaround
    db
      .from('menu_approval_requests')
      .select('sent_at, responded_at, status')
      .eq('chef_id', tenantId)
      .not('responded_at', 'is', null)
      .limit(50),

    // Client referral sources
    db
      .from('clients')
      .select('id, referral_source, created_at')
      .eq('tenant_id', tenantId)
      .limit(500),
  ])

  await reportContextQueryErrors(tenantId, {
    load_detailed_upcoming_events: eventsResult,
    load_detailed_recent_clients: clientsResult,
    load_detailed_month_revenue: revenueResult,
    load_detailed_pending_quotes: quotesResult,
    load_detailed_availability: availabilityResult,
    load_detailed_calendar: calendarResult,
    load_detailed_waitlist: waitlistResult,
    load_detailed_staff_roster: staffResult,
    load_detailed_equipment: equipmentResult,
    load_detailed_goals: goalsResult,
    load_detailed_todos: todosResult,
    load_detailed_calls: callsResult,
    load_detailed_documents: documentsResult,
    load_detailed_folders: foldersResult,
    load_detailed_artifacts: artifactsResult,
    load_detailed_year_revenue: yearRevenueResult,
    load_detailed_year_expenses: yearExpensesResult,
    load_detailed_year_events: yearEventsResult,
    load_detailed_recipe_stats: recipeStatsResult,
    load_detailed_client_vibe_notes: clientVibeNotesResult,
    load_detailed_recent_aars: recentAARsResult,
    load_detailed_pending_menu_approvals: pendingMenuApprovalsResult,
    load_detailed_unread_inquiry_messages: unreadInquiryMsgsResult,
    load_detailed_stale_inquiries: staleInquiriesResult,
    load_detailed_overdue_payments: overduePaymentsResult,
    load_detailed_client_booking_history: clientBookingHistoryResult,
    load_detailed_monthly_revenue_pattern: monthlyRevenueResult,
    load_detailed_upcoming_payment_deadlines: upcomingPaymentDeadlinesResult,
    load_detailed_expiring_quotes: expiringQuotesResult,
    load_detailed_event_profitability: eventProfitabilityResult,
    load_detailed_inquiry_velocity: inquiryVelocityResult,
    load_detailed_staff_assignments: staffAssignmentsResult,
    load_detailed_conversion_rate: conversionRateResult,
    load_detailed_expense_breakdown: expenseBreakdownResult,
    load_detailed_all_events_pattern: allEventsPatternResult,
    load_detailed_menu_approval_turnaround: menuApprovalResult,
    load_detailed_client_referrals: clientReferralResult,
  })

  const monthRevenueCents = (revenueResult.data ?? []).reduce(
    (sum: any, entry: any) => sum + ((entry as { amount_cents: number }).amount_cents ?? 0),
    0
  )

  // Build yearly stats
  const yearRevenue = (yearRevenueResult.data ?? []) as Array<Record<string, unknown>>
  const yearRevenueCents = yearRevenue.reduce((s, e) => s + ((e.amount_cents as number) ?? 0), 0)
  const yearExpenseCents = (yearExpensesResult.data ?? []).reduce(
    (s: any, e: any) => s + (((e as Record<string, unknown>).amount_cents as number) ?? 0),
    0
  )
  const yearEvents = (yearEventsResult.data ?? []) as Array<Record<string, unknown>>
  const completedEventsThisYear = yearEvents.filter((e) => e.status === 'completed').length

  // Top clients by revenue (from ledger)
  const clientRevMap = new Map<string, { name: string; cents: number; count: number }>()
  for (const entry of yearRevenue) {
    const cid = entry.client_id as string | null
    if (!cid) continue
    const existing = clientRevMap.get(cid)
    if (existing) {
      existing.cents += (entry.amount_cents as number) ?? 0
      existing.count += 1
    } else {
      clientRevMap.set(cid, { name: '', cents: (entry.amount_cents as number) ?? 0, count: 1 })
    }
  }
  // Resolve client names from year events
  for (const ev of yearEvents) {
    const client = ev.client as Record<string, unknown> | null
    if (!client?.full_name) continue
    // Find matching client in the revenue map by checking events
  }
  // Simple approach: get top clients from events with revenue
  const topClientsArr = Array.from(clientRevMap.entries())
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 5)

  // Resolve top client names from the clients list
  const topClientIds = topClientsArr.map(([id]) => id)
  let topClientNames: Record<string, string> = {}
  if (topClientIds.length > 0) {
    const { data: nameData } = await db
      .from('clients')
      .select('id, full_name')
      .in('id', topClientIds)
    if (nameData) {
      topClientNames = Object.fromEntries(
        nameData.map((c: Record<string, unknown>) => [
          c.id as string,
          (c.full_name as string) ?? 'Unknown',
        ])
      )
    }
  }

  // Staff utilization - count upcoming assignments per staff member
  const staffAssignmentCounts = new Map<string, number>()
  for (const a of (staffAssignmentsResult.data ?? []) as Array<Record<string, unknown>>) {
    const memberId = a.staff_member_id as string
    if (!memberId) continue
    const event = a.event as Record<string, unknown> | null
    if (!event) continue
    const eventDate = event.event_date as string | null
    const eventStatus = event.status as string
    if (
      eventDate &&
      new Date(eventDate).getTime() > now.getTime() &&
      eventStatus !== 'cancelled' &&
      eventStatus !== 'completed'
    ) {
      staffAssignmentCounts.set(memberId, (staffAssignmentCounts.get(memberId) ?? 0) + 1)
    }
  }

  // Event profitability aggregates - avg margin, best/worst margin
  const profitData = (eventProfitabilityResult.data ?? []) as Array<Record<string, unknown>>
  const marginsWithData = profitData
    .filter((p) => typeof p.profit_margin === 'number' && (p.net_revenue_cents as number) > 0)
    .map((p) => ({
      margin: p.profit_margin as number,
      profitCents: (p.profit_cents as number) ?? 0,
    }))

  // Inquiry velocity - this week vs last week
  const recentInquiries = (inquiryVelocityResult.data ?? []) as Array<Record<string, unknown>>
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thisWeekInquiries = recentInquiries.filter(
    (i) => new Date(i.created_at as string).getTime() >= oneWeekAgo.getTime()
  ).length
  const lastWeekInquiries = recentInquiries.filter((i) => {
    const t = new Date(i.created_at as string).getTime()
    return t >= twoWeeksAgo.getTime() && t < oneWeekAgo.getTime()
  }).length

  // Quote distribution - for comparison intelligence
  const quotedPrices = yearEvents
    .map((e) => (e.quoted_price_cents as number) ?? 0)
    .filter((p) => p > 0)
    .sort((a, b) => a - b)

  // ─── Wave 9-12 Intelligence Computations (Formula > AI) ─────────────────

  // Conversion rate - inquiry to event
  const allInquiries = (conversionRateResult.data ?? []) as Array<Record<string, unknown>>
  const totalInquiries = allInquiries.length
  const convertedInquiries = allInquiries.filter((i) => (i.status as string) === 'converted').length
  const conversionRate =
    totalInquiries >= 5
      ? {
          total: totalInquiries,
          converted: convertedInquiries,
          rate: Math.round((convertedInquiries / totalInquiries) * 100),
          byChannel: (() => {
            const channels = new Map<string, { total: number; converted: number }>()
            for (const i of allInquiries) {
              const ch = (i.channel as string) ?? 'unknown'
              if (!channels.has(ch)) channels.set(ch, { total: 0, converted: 0 })
              const c = channels.get(ch)!
              c.total++
              if ((i.status as string) === 'converted') c.converted++
            }
            return Array.from(channels.entries())
              .filter(([, v]) => v.total >= 3)
              .map(([channel, v]) => ({
                channel,
                total: v.total,
                converted: v.converted,
                rate: Math.round((v.converted / v.total) * 100),
              }))
              .sort((a, b) => b.rate - a.rate)
          })(),
        }
      : undefined

  // Expense category breakdown
  const expenses = (expenseBreakdownResult.data ?? []) as Array<Record<string, unknown>>
  const expenseByCategory = new Map<string, number>()
  for (const e of expenses) {
    const cat = (e.category as string) ?? 'other'
    expenseByCategory.set(
      cat,
      (expenseByCategory.get(cat) ?? 0) + ((e.amount_cents as number) ?? 0)
    )
  }
  const expenseBreakdown =
    expenseByCategory.size > 0
      ? Array.from(expenseByCategory.entries())
          .map(([category, totalCents]) => ({ category, totalCents }))
          .sort((a, b) => b.totalCents - a.totalCents)
      : undefined

  // All events pattern analysis
  const allEvents = (allEventsPatternResult.data ?? []) as Array<Record<string, unknown>>

  // Day-of-week patterns
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
  const eventsWithDates = allEvents.filter((e) => e.event_date)
  for (const e of eventsWithDates) {
    const day = new Date(e.event_date as string).getDay()
    dayOfWeekCounts[day]++
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const busiestDayIdx = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts))
  const slowestDayIdx = dayOfWeekCounts.indexOf(Math.min(...dayOfWeekCounts))

  // Service style distribution
  const styleMap = new Map<string, number>()
  for (const e of allEvents) {
    const style = (e.service_style as string) ?? 'not specified'
    styleMap.set(style, (styleMap.get(style) ?? 0) + 1)
  }
  const serviceStyles =
    styleMap.size > 0
      ? Array.from(styleMap.entries())
          .map(([style, count]) => ({
            style: style.replace(/_/g, ' '),
            count,
            pct: Math.round((count / allEvents.length) * 100),
          }))
          .sort((a, b) => b.count - a.count)
      : undefined

  // Repeat client ratio
  const clientIds = new Set<string>()
  const repeatClientIds = new Set<string>()
  const clientEventCounts = new Map<string, number>()
  for (const e of allEvents) {
    const cid = e.client_id as string | null
    if (!cid) continue
    clientEventCounts.set(cid, (clientEventCounts.get(cid) ?? 0) + 1)
    clientIds.add(cid)
  }
  for (const [cid, count] of clientEventCounts) {
    if (count >= 2) repeatClientIds.add(cid)
  }
  const repeatClientRatio =
    clientIds.size >= 3
      ? {
          totalClients: clientIds.size,
          repeatClients: repeatClientIds.size,
          ratio: Math.round((repeatClientIds.size / clientIds.size) * 100),
        }
      : undefined

  // Guest count trend (last 10 events vs previous 10)
  const eventsWithGuests = eventsWithDates
    .filter((e) => (e.guest_count as number) > 0)
    .sort(
      (a, b) =>
        new Date(b.event_date as string).getTime() - new Date(a.event_date as string).getTime()
    )
  let guestCountTrend: { recentAvg: number; previousAvg: number; direction: string } | undefined
  if (eventsWithGuests.length >= 6) {
    const half = Math.floor(eventsWithGuests.length / 2)
    const recent = eventsWithGuests.slice(0, half)
    const previous = eventsWithGuests.slice(half)
    const recentAvg = Math.round(
      recent.reduce((s, e) => s + ((e.guest_count as number) ?? 0), 0) / recent.length
    )
    const previousAvg = Math.round(
      previous.reduce((s, e) => s + ((e.guest_count as number) ?? 0), 0) / previous.length
    )
    const change = recentAvg - previousAvg
    const direction = Math.abs(change) <= 2 ? 'stable' : change > 0 ? 'growing' : 'shrinking'
    guestCountTrend = { recentAvg, previousAvg, direction }
  }

  // Booking lead time - how far in advance clients book
  const leadTimes: number[] = []
  for (const e of eventsWithDates) {
    const created = e.created_at ? new Date(e.created_at as string).getTime() : null
    const eventDate = new Date(e.event_date as string).getTime()
    if (!created) continue
    const daysAhead = Math.round((eventDate - created) / (1000 * 60 * 60 * 24))
    if (daysAhead > 0 && daysAhead < 365) leadTimes.push(daysAhead)
  }
  leadTimes.sort((a, b) => a - b)
  const avgLeadTime =
    leadTimes.length >= 3
      ? {
          avgDays: Math.round(leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length),
          medianDays: leadTimes[Math.floor(leadTimes.length / 2)],
          shortestDays: leadTimes[0],
          longestDays: leadTimes[leadTimes.length - 1],
        }
      : undefined

  // Dietary restriction frequency
  const dietaryFreq = new Map<string, number>()
  const allergyFreq = new Map<string, number>()
  for (const e of allEvents) {
    const diets = e.dietary_restrictions as string[] | null
    const allergies = e.allergies as string[] | null
    if (diets) {
      for (const d of diets) {
        if (d) dietaryFreq.set(d.toLowerCase(), (dietaryFreq.get(d.toLowerCase()) ?? 0) + 1)
      }
    }
    if (allergies) {
      for (const a of allergies) {
        if (a) allergyFreq.set(a.toLowerCase(), (allergyFreq.get(a.toLowerCase()) ?? 0) + 1)
      }
    }
  }
  const dietaryProfile =
    dietaryFreq.size > 0 || allergyFreq.size > 0
      ? {
          topDietary: Array.from(dietaryFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count })),
          topAllergies: Array.from(allergyFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count })),
        }
      : undefined

  // Menu approval turnaround
  const approvals = (menuApprovalResult.data ?? []) as Array<Record<string, unknown>>
  const turnaroundDays: number[] = []
  for (const a of approvals) {
    if (a.sent_at && a.responded_at) {
      const sent = new Date(a.sent_at as string).getTime()
      const responded = new Date(a.responded_at as string).getTime()
      const days = Math.round((responded - sent) / (1000 * 60 * 60 * 24))
      if (days >= 0 && days < 60) turnaroundDays.push(days)
    }
  }
  turnaroundDays.sort((a, b) => a - b)
  const menuApprovalStats =
    turnaroundDays.length >= 3
      ? {
          avgDays: Math.round(turnaroundDays.reduce((s, d) => s + d, 0) / turnaroundDays.length),
          medianDays: turnaroundDays[Math.floor(turnaroundDays.length / 2)],
          fastestDays: turnaroundDays[0],
          slowestDays: turnaroundDays[turnaroundDays.length - 1],
        }
      : undefined

  // Client referral sources
  const allClients = (clientReferralResult.data ?? []) as Array<Record<string, unknown>>
  const referralMap = new Map<string, number>()
  for (const c of allClients) {
    const source = (c.referral_source as string) ?? 'unknown'
    referralMap.set(source, (referralMap.get(source) ?? 0) + 1)
  }
  const referralSources =
    referralMap.size > 0
      ? Array.from(referralMap.entries())
          .map(([source, count]) => ({
            source: source.replace(/_/g, ' '),
            count,
            pct: Math.round((count / allClients.length) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : undefined

  // Cash flow projection - expected payments from upcoming events
  const cashFlowProjection = (() => {
    const upcoming = (eventsResult.data ?? []) as Array<Record<string, unknown>>
    let expectedCents = 0
    let count = 0
    for (const e of upcoming) {
      const price = (e.quoted_price_cents as number) ?? 0
      const status = e.status as string
      if (price > 0 && status !== 'cancelled' && status !== 'completed') {
        expectedCents += price
        count++
      }
    }
    return count > 0 ? { expectedCents, eventCount: count } : undefined
  })()

  // Build calendar summary
  const blockedDates = (availabilityResult.data ?? []).map((b: Record<string, unknown>) => ({
    date: b.block_date as string,
    reason: (b.reason as string) ?? 'Blocked',
    type: (b.block_type as string) ?? 'full_day',
  }))
  const calendarEntries = (calendarResult.data ?? []).map((c: Record<string, unknown>) => ({
    title: (c.title as string) ?? 'Untitled',
    startDate: c.start_date as string,
    endDate: c.end_date as string,
    type: (c.entry_type as string) ?? 'other',
    blocksBookings: (c.blocks_bookings as boolean) ?? true,
  }))
  const waitlistEntries = (waitlistResult.data ?? []).map((w: Record<string, unknown>) => ({
    clientName: ((w.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
    date: w.requested_date as string,
    occasion: (w.occasion as string) ?? '',
    status: w.status as string,
  }))

  // Build equipment summary
  const equipItems = (equipmentResult.data ?? []) as Array<Record<string, unknown>>
  const equipCategories = [...new Set(equipItems.map((e) => (e.category as string) ?? 'other'))]

  return {
    upcomingEvents: (eventsResult.data ?? []).map((e: Record<string, unknown>) => {
      const client = (e.client as Record<string, unknown> | null) ?? null
      return {
        id: e.id as string,
        occasion: e.occasion as string | null,
        date: e.event_date as string | null,
        status: e.status as string,
        clientName: (client?.full_name as string) ?? 'Unknown',
        guestCount: e.guest_count as number | null,
        clientLoyaltyTier:
          (client?.loyalty_tier as 'bronze' | 'silver' | 'gold' | 'platinum' | null) ?? null,
        clientLoyaltyPoints: (client?.loyalty_points as number | null) ?? null,
        prepReady: (e.prep_list_ready as boolean) ?? false,
        groceryReady: (e.grocery_list_ready as boolean) ?? false,
        timelineReady: (e.timeline_ready as boolean) ?? false,
      }
    }),
    recentClients: (clientsResult.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: (c.full_name as string) ?? 'Unknown',
      tier: (c.loyalty_tier as 'bronze' | 'silver' | 'gold' | 'platinum' | null) ?? null,
      pointsBalance: (c.loyalty_points as number | null) ?? null,
    })),
    monthRevenueCents,
    pendingQuoteCount: quotesResult.count ?? 0,
    // New data domains
    calendarSummary: {
      blockedDates,
      calendarEntries,
      waitlistEntries,
    },
    yearlyStats: {
      yearRevenueCents,
      yearExpenseCents,
      totalEventsThisYear: yearEvents.length,
      completedEventsThisYear,
      avgEventRevenueCents:
        completedEventsThisYear > 0 ? Math.round(yearRevenueCents / completedEventsThisYear) : 0,
      topClients: topClientsArr.map(([id, data]) => ({
        name: topClientNames[id] ?? 'Unknown',
        revenueCents: data.cents,
        eventCount: data.count,
      })),
    },
    // Quote distribution - historical range for comparison intelligence
    quoteDistribution:
      quotedPrices.length >= 3
        ? {
            count: quotedPrices.length,
            minCents: quotedPrices[0],
            maxCents: quotedPrices[quotedPrices.length - 1],
            medianCents: quotedPrices[Math.floor(quotedPrices.length / 2)],
            p25Cents: quotedPrices[Math.floor(quotedPrices.length * 0.25)],
            p75Cents: quotedPrices[Math.floor(quotedPrices.length * 0.75)],
          }
        : undefined,
    // Inquiry velocity - week-over-week comparison
    inquiryVelocity:
      thisWeekInquiries > 0 || lastWeekInquiries > 0
        ? { thisWeek: thisWeekInquiries, lastWeek: lastWeekInquiries }
        : undefined,
    // Profitability stats - aggregate margins across events
    profitabilityStats:
      marginsWithData.length >= 2
        ? {
            eventCount: marginsWithData.length,
            avgMargin: Math.round(
              marginsWithData.reduce((sum, m) => sum + m.margin, 0) / marginsWithData.length
            ),
            bestMargin: Math.max(...marginsWithData.map((m) => m.margin)),
            worstMargin: Math.min(...marginsWithData.map((m) => m.margin)),
            avgProfitCents: Math.round(
              marginsWithData.reduce((sum, m) => sum + m.profitCents, 0) / marginsWithData.length
            ),
          }
        : undefined,
    staffRoster: (staffResult.data ?? []).map((s: Record<string, unknown>) => ({
      name: (s.full_name as string) ?? 'Unknown',
      role: (s.default_role as string) ?? 'general',
      phone: (s.phone as string) ?? null,
      activeAssignments: staffAssignmentCounts.get(s.id as string) ?? 0,
    })),
    equipmentSummary: { totalItems: equipItems.length, categories: equipCategories },
    activeGoals: (goalsResult.data ?? []).map((g: Record<string, unknown>) => ({
      title: (g.title as string) ?? 'Untitled',
      targetDate: (g.target_date as string) ?? null,
      progress: (g.progress_pct as number) ?? null,
      status: (g.status as string) ?? 'active',
    })),
    activeTodos: (todosResult.data ?? []).map((t: Record<string, unknown>) => ({
      title: (t.text as string) ?? 'Untitled',
      dueDate: null,
      priority: 'normal',
      status: 'pending',
    })),
    upcomingCalls: (callsResult.data ?? []).map((c: Record<string, unknown>) => ({
      clientName: ((c.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      scheduledAt: c.scheduled_at as string,
      purpose: (c.purpose as string) ?? null,
      status: (c.status as string) ?? 'scheduled',
    })),
    documentSummary: {
      totalDocuments: documentsResult.count ?? 0,
      totalFolders: foldersResult.count ?? 0,
    },
    recentArtifacts: (artifactsResult.data ?? []).map((a: Record<string, unknown>) => ({
      type: (a.artifact_type as string) ?? 'unknown',
      title: (a.title as string) ?? 'Untitled',
      createdAt: a.created_at as string,
    })),

    // ─── Context enrichment (2026-02-28) ─────────────────────────────────
    recipeStats: (() => {
      const recipes = (recipeStatsResult.data ?? []) as Array<Record<string, unknown>>
      const categories = [...new Set(recipes.map((r) => (r.category as string) ?? 'uncategorized'))]
      return { totalRecipes: recipes.length, categories }
    })(),
    clientVibeNotes: await (async () => {
      // Q16: Fetch structured allergy records with severity for all vibe-note clients
      const vibeClients = (clientVibeNotesResult.data ?? []) as Array<Record<string, unknown>>
      const vibeClientIds = vibeClients.map((c) => c.id as string).filter(Boolean)
      const structuredAllergyMap = new Map<string, Array<{ allergen: string; severity: string }>>()
      if (vibeClientIds.length > 0) {
        const { data: allergyRecords } = await db
          .from('client_allergy_records')
          .select('client_id, allergen, severity')
          .eq('tenant_id', tenantId)
          .in('client_id', vibeClientIds)
        for (const r of (allergyRecords ?? []) as any[]) {
          const list = structuredAllergyMap.get(r.client_id) ?? []
          list.push({ allergen: r.allergen, severity: r.severity })
          structuredAllergyMap.set(r.client_id, list)
        }
      }
      return vibeClients.map((c) => ({
        name: (c.full_name as string) ?? 'Unknown',
        vibeNotes: (c.vibe_notes as string) ?? '',
        dietaryRestrictions: (c.dietary_restrictions as string[]) ?? [],
        allergies: (c.allergies as string[]) ?? [],
        // Q16: structured allergy records with severity (anaphylaxis/allergy/intolerance/preference)
        allergyRecords: structuredAllergyMap.get(c.id as string) ?? [],
        // Q19: client status for dormancy visibility
        status: (c.status as string) ?? 'active',
      }))
    })(),
    recentAARInsights: (recentAARsResult.data ?? []).map((a: Record<string, unknown>) => ({
      rating: (a.overall_rating as number) ?? null,
      wentWell: (a.went_well as string) ?? '',
      toImprove: (a.to_improve as string) ?? '',
      lessonsLearned: (a.lessons_learned as string) ?? '',
    })),
    pendingMenuApprovals: (pendingMenuApprovalsResult.data ?? []).map(
      (m: Record<string, unknown>) => ({
        clientName:
          ((m.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      })
    ),
    unreadInquiryMessages: (unreadInquiryMsgsResult.data ?? []).map(
      (m: Record<string, unknown>) => ({
        leadName: ((m.inquiry as Record<string, unknown> | null)?.lead_name as string) ?? 'Unknown',
      })
    ),

    // Proactive nudges (2026-03-06)
    staleInquiries: (staleInquiriesResult.data ?? [])
      .map((i: Record<string, unknown>) => {
        const daysSinceContact = Math.floor(
          (now.getTime() - new Date(i.updated_at as string).getTime()) / (1000 * 60 * 60 * 24)
        )
        // Lead score from chef_likelihood or GOLDMINE unknown_fields
        const uf = i.unknown_fields as Record<string, unknown> | null
        const leadScore =
          (i.chef_likelihood as number) ??
          (uf && typeof uf === 'object' && !Array.isArray(uf)
            ? ((uf.lead_score as number) ?? 0)
            : 0)
        // Urgency = days stale × lead score (higher = more urgent to respond)
        const urgency = daysSinceContact * Math.max(leadScore, 10)
        return {
          leadName: (i.lead_name as string) ?? 'Unknown',
          daysSinceContact,
          leadScore,
          urgency,
        }
      })
      .sort((a: { urgency: number }, b: { urgency: number }) => b.urgency - a.urgency),
    overduePayments: (overduePaymentsResult.data ?? []).map((p: Record<string, unknown>) => ({
      clientName: ((p.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      amountCents: (p.balance_due_cents as number) ?? 0,
      daysOverdue: Math.floor(
        (now.getTime() - new Date(p.payment_due_date as string).getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),

    // Client re-engagement signals - detect clients overdue for a booking
    clientReengagement: computeClientReengagement(
      (clientBookingHistoryResult.data ?? []) as Array<Record<string, unknown>>,
      now
    ),

    // Revenue pattern - monthly distribution for busy/slow awareness
    revenuePattern: computeRevenuePattern(
      (monthlyRevenueResult.data ?? []) as Array<Record<string, unknown>>
    ),

    // Deadline warnings (2026-03-06)
    upcomingPaymentDeadlines: (upcomingPaymentDeadlinesResult.data ?? []).map(
      (p: Record<string, unknown>) => ({
        clientName:
          ((p.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
        occasion: (p.occasion as string) ?? 'Event',
        amountCents: (p.balance_due_cents as number) ?? 0,
        dueDate: (p.payment_due_date as string) ?? '',
        daysUntilDue: Math.ceil(
          (new Date(p.payment_due_date as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })
    ),
    expiringQuotes: (expiringQuotesResult.data ?? []).map((q: Record<string, unknown>) => {
      const event = q.event as Record<string, unknown> | null
      const client = event ? (event.client as Record<string, unknown> | null) : null
      return {
        clientName: (client?.full_name as string) ?? 'Unknown',
        occasion: (event?.occasion as string) ?? 'Event',
        totalCents: (q.total_cents as number) ?? 0,
        validUntil: (q.valid_until as string) ?? '',
        daysUntilExpiry: Math.ceil(
          (new Date(q.valid_until as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    }),

    // Wave 9-12 Intelligence
    conversionRate,
    expenseBreakdown,
    dayOfWeekPattern:
      eventsWithDates.length >= 5
        ? {
            busiestDay: dayNames[busiestDayIdx],
            slowestDay: dayNames[slowestDayIdx],
            distribution: dayNames.map((name, i) => ({ day: name, count: dayOfWeekCounts[i] })),
          }
        : undefined,
    serviceStyles,
    repeatClientRatio,
    guestCountTrend,
    avgLeadTime,
    dietaryProfile,
    menuApprovalStats,
    referralSources,
    cashFlowProjection,
  }
}

// ─── Client Re-engagement Detection (Formula > AI) ─────────────────────────
// Analyzes booking history to find clients whose booking cadence has lapsed.
// If a client books every ~60 days and hasn't booked in 90, they're flagged.

function computeClientReengagement(
  bookingHistory: Array<Record<string, unknown>>,
  now: Date
): Array<{
  clientName: string
  avgIntervalDays: number
  daysSinceLastBooking: number
  eventCount: number
}> {
  if (bookingHistory.length === 0) return []

  // Group events by client
  const byClient = new Map<string, { name: string; dates: Date[] }>()
  for (const row of bookingHistory) {
    const clientId = row.client_id as string
    if (!clientId || !row.event_date) continue
    const client = row.client as Record<string, unknown> | null
    const name = (client?.full_name as string) ?? 'Unknown'
    if (!byClient.has(clientId)) byClient.set(clientId, { name, dates: [] })
    byClient.get(clientId)!.dates.push(new Date(row.event_date as string))
  }

  const results: Array<{
    clientName: string
    avgIntervalDays: number
    daysSinceLastBooking: number
    eventCount: number
  }> = []

  for (const [, { name, dates }] of byClient) {
    // Need at least 2 events to compute a cadence
    if (dates.length < 2) continue

    dates.sort((a, b) => a.getTime() - b.getTime())

    // Compute average interval between bookings
    let totalInterval = 0
    for (let i = 1; i < dates.length; i++) {
      totalInterval += dates[i].getTime() - dates[i - 1].getTime()
    }
    const avgIntervalMs = totalInterval / (dates.length - 1)
    const avgIntervalDays = Math.round(avgIntervalMs / (1000 * 60 * 60 * 24))

    // How long since last booking?
    const lastBooking = dates[dates.length - 1]
    const daysSinceLast = Math.floor(
      (now.getTime() - lastBooking.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Flag if they've gone 50% past their usual interval (and at least 30 days since last)
    if (daysSinceLast > avgIntervalDays * 1.5 && daysSinceLast >= 30) {
      results.push({
        clientName: name,
        avgIntervalDays,
        daysSinceLastBooking: daysSinceLast,
        eventCount: dates.length,
      })
    }
  }

  // Sort by most overdue first (ratio of daysSince / avgInterval)
  results.sort(
    (a, b) =>
      b.daysSinceLastBooking / b.avgIntervalDays - a.daysSinceLastBooking / a.avgIntervalDays
  )

  return results.slice(0, 5) // Top 5 most overdue
}

// ─── Revenue Pattern Detection (Formula > AI) ──────────────────────────────
// Identifies busy and slow months from historical revenue.

function computeRevenuePattern(
  ledgerEntries: Array<Record<string, unknown>>
): { busiestMonth: string; slowestMonth: string; monthlyAvgCents: number } | undefined {
  if (ledgerEntries.length < 5) return undefined // Need meaningful data

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const byMonth = new Map<number, number>()

  for (const entry of ledgerEntries) {
    const date = new Date(entry.created_at as string)
    const month = date.getMonth()
    byMonth.set(month, (byMonth.get(month) ?? 0) + ((entry.amount_cents as number) ?? 0))
  }

  if (byMonth.size < 2) return undefined

  let busiestMonth = 0
  let slowestMonth = 0
  let maxRev = -Infinity
  let minRev = Infinity
  let totalRev = 0

  for (const [month, rev] of byMonth) {
    totalRev += rev
    if (rev > maxRev) {
      maxRev = rev
      busiestMonth = month
    }
    if (rev < minRev) {
      minRev = rev
      slowestMonth = month
    }
  }

  return {
    busiestMonth: monthNames[busiestMonth],
    slowestMonth: monthNames[slowestMonth],
    monthlyAvgCents: Math.round(totalRev / byMonth.size),
  }
}

// ─── Tier 3: Page Entity Context ────────────────────────────────────────────
// Detects entity IDs from the current URL and fetches rich detail so Remy
// understands exactly what the chef is looking at.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

async function loadPageEntityContext(
  db: any,
  tenantId: string,
  currentPage?: string
): Promise<PageEntityContext | undefined> {
  if (!currentPage) return undefined

  const idMatch = currentPage.match(UUID_RE)
  if (!idMatch) return undefined
  const entityId = idMatch[0]

  if (currentPage.startsWith('/events/')) {
    return loadEventEntity(db, tenantId, entityId)
  }
  if (currentPage.startsWith('/clients/')) {
    return loadClientEntity(db, tenantId, entityId)
  }
  if (currentPage.startsWith('/recipes/')) {
    return loadRecipeEntity(db, tenantId, entityId)
  }
  if (currentPage.startsWith('/inquiries/')) {
    return loadInquiryEntity(db, tenantId, entityId)
  }
  if (currentPage.startsWith('/menus/')) {
    return loadMenuEntity(db, tenantId, entityId)
  }

  return undefined
}

async function loadEventEntity(
  db: any,
  tenantId: string,
  eventId: string
): Promise<PageEntityContext | undefined> {
  // Primary event data + 8 parallel sub-queries for full context
  const [
    eventResult,
    ledgerResult,
    expensesResult,
    staffResult,
    tempLogsResult,
    quotesResult,
    transitionsResult,
    approvalResult,
    groceryResult,
    aarResult,
  ] = await Promise.all([
    db
      .from('events')
      .select(
        `id, occasion, event_date, serve_time, guest_count, status, service_style,
         location_address, location_city, location_state,
         dietary_restrictions, allergies, special_requests,
         quoted_price_cents, payment_status, kitchen_notes,
         prep_list_ready, grocery_list_ready, timeline_ready,
         menu_approval_status, menu_sent_at, menu_approved_at, menu_revision_notes,
         ambiance_notes,
         client:clients(full_name, email, phone, dietary_restrictions, allergies, vibe_notes, loyalty_tier, loyalty_points)`
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    // Ledger entries (payments, deposits, refunds)
    db
      .from('ledger_entries')
      .select('entry_type, amount_cents, description, payment_method, received_at, is_refund')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(20),
    // Expenses linked to this event
    db
      .from('expenses')
      .select('category, amount_cents, vendor_name, description, expense_date')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('expense_date', { ascending: true })
      .limit(20),
    // Staff assignments
    db
      .from('event_staff_assignments')
      .select(
        'role_override, scheduled_hours, actual_hours, pay_amount_cents, status, notes, staff_member:staff_members(full_name)'
      )
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .limit(10),
    // Temperature logs
    db
      .from('event_temp_logs')
      .select('item_description, temp_fahrenheit, phase, is_safe, logged_at, notes')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .order('logged_at', { ascending: true })
      .limit(20),
    // Quotes for this event
    db
      .from('quotes')
      .select(
        'quote_name, status, total_quoted_cents, pricing_model, deposit_amount_cents, sent_at, accepted_at, pricing_notes'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Event transitions (audit trail)
    db
      .from('event_transitions' as any)
      .select('from_status, to_status, transitioned_at, reason')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('transitioned_at', { ascending: true })
      .limit(15),
    // Menu approval requests
    db
      .from('menu_approval_requests')
      .select('status, sent_at, responded_at, revision_notes')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Grocery price quotes
    db
      .from('grocery_price_quotes')
      .select(
        'status, ingredient_count, spoonacular_total_cents, kroger_total_cents, average_total_cents, instacart_link, created_at'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(3),
    // After-action reviews
    db
      .from('after_action_reviews')
      .select('overall_rating, went_well, to_improve, lessons_learned, would_repeat, created_at')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  await reportContextQueryErrors(tenantId, {
    load_event_entity: eventResult,
    load_event_entity_ledger: ledgerResult,
    load_event_entity_expenses: expensesResult,
    load_event_entity_staff: staffResult,
    load_event_entity_temp_logs: tempLogsResult,
    load_event_entity_quotes: quotesResult,
    load_event_entity_transitions: transitionsResult,
    load_event_entity_approvals: approvalResult,
    load_event_entity_grocery_quotes: groceryResult,
    load_event_entity_after_action_review: aarResult,
  })

  const data = eventResult.data
  if (!data) return undefined

  const client = data.client as Record<string, unknown> | null
  const lines: string[] = []
  lines.push(`EVENT: ${data.occasion ?? 'Untitled event'}`)
  lines.push(`Status: ${data.status}`)
  lines.push(`Date: ${data.event_date ?? 'TBD'}${data.serve_time ? ` at ${data.serve_time}` : ''}`)
  lines.push(`Guests: ${data.guest_count ?? 'TBD'}`)
  if (data.service_style) lines.push(`Style: ${data.service_style.replace(/_/g, ' ')}`)
  if (data.location_address) {
    lines.push(
      `Location: ${data.location_address}, ${data.location_city ?? ''} ${data.location_state ?? ''}`.trim()
    )
  }
  if (data.quoted_price_cents) lines.push(`Quoted: $${(data.quoted_price_cents / 100).toFixed(2)}`)
  if (data.payment_status) lines.push(`Payment: ${data.payment_status.replace(/_/g, ' ')}`)
  if (data.dietary_restrictions?.length)
    lines.push(`Dietary: ${data.dietary_restrictions.join(', ')}`)
  if (data.allergies?.length) lines.push(`Allergies: ${data.allergies.join(', ')}`)
  if (data.special_requests)
    lines.push(`Special requests: ${sanitizeForPrompt(data.special_requests)}`)
  if (data.kitchen_notes) lines.push(`Kitchen notes: ${sanitizeForPrompt(data.kitchen_notes)}`)

  const readiness: string[] = []
  if (data.prep_list_ready) readiness.push('prep')
  if (data.grocery_list_ready) readiness.push('grocery')
  if (data.timeline_ready) readiness.push('timeline')
  if (readiness.length > 0) lines.push(`Ready: ${readiness.join(', ')}`)
  const notReady: string[] = []
  if (!data.prep_list_ready) notReady.push('prep')
  if (!data.grocery_list_ready) notReady.push('grocery')
  if (!data.timeline_ready) notReady.push('timeline')
  if (notReady.length > 0) lines.push(`Not ready: ${notReady.join(', ')}`)

  // Menu approval status
  if (data.menu_approval_status && data.menu_approval_status !== 'not_sent') {
    lines.push(`\nMENU APPROVAL: ${data.menu_approval_status.replace(/_/g, ' ')}`)
    if (data.menu_sent_at) lines.push(`Sent: ${new Date(data.menu_sent_at).toLocaleDateString()}`)
    if (data.menu_approved_at)
      lines.push(`Approved: ${new Date(data.menu_approved_at).toLocaleDateString()}`)
    if (data.menu_revision_notes)
      lines.push(`Client feedback: ${sanitizeForPrompt(data.menu_revision_notes)}`)
  }
  // Approval request history
  const approvals = approvalResult.data ?? []
  if (approvals.length > 0 && !data.menu_approval_status) {
    lines.push(`\nMENU APPROVAL HISTORY (${approvals.length} rounds):`)
    for (const a of approvals as Array<Record<string, unknown>>) {
      const status = (a.status as string).replace(/_/g, ' ')
      const sent = a.sent_at ? new Date(a.sent_at as string).toLocaleDateString() : 'not sent'
      lines.push(`- ${status} (sent ${sent})${a.revision_notes ? `: ${a.revision_notes}` : ''}`)
    }
  }

  if (client) {
    lines.push(`\nCLIENT: ${client.full_name ?? 'Unknown'}`)
    if (client.email) lines.push(`Email: ${client.email}`)
    if (client.phone) lines.push(`Phone: ${client.phone}`)
    if ((client.dietary_restrictions as string[] | null)?.length)
      lines.push(`Client dietary: ${(client.dietary_restrictions as string[]).join(', ')}`)
    if ((client.allergies as string[] | null)?.length)
      lines.push(`Client allergies: ${(client.allergies as string[]).join(', ')}`)
    if (client.vibe_notes) lines.push(`Vibe: ${sanitizeForPrompt(client.vibe_notes as string)}`)
    if (client.loyalty_tier) lines.push(`Loyalty tier: ${client.loyalty_tier}`)
    if (typeof client.loyalty_points === 'number') {
      lines.push(`Loyalty points: ${client.loyalty_points}`)
    }
  }

  // Ledger entries (financial breakdown)
  const ledger = ledgerResult.data ?? []
  if (ledger.length > 0) {
    const totalPaid = ledger.reduce(
      (s: any, e: any) => s + (((e as Record<string, unknown>).amount_cents as number) ?? 0),
      0
    )
    lines.push(
      `\nFINANCIALS (${ledger.length} ledger entries, total: $${(totalPaid / 100).toFixed(2)}):`
    )
    for (const entry of ledger as Array<Record<string, unknown>>) {
      const type = (entry.entry_type as string).replace(/_/g, ' ')
      const amt = `$${(Math.abs(entry.amount_cents as number) / 100).toFixed(2)}`
      const method = entry.payment_method
        ? ` via ${(entry.payment_method as string).replace(/_/g, ' ')}`
        : ''
      const desc = entry.description ? ` - ${entry.description}` : ''
      const refund = entry.is_refund ? ' (REFUND)' : ''
      lines.push(`- ${type}: ${amt}${method}${refund}${desc}`)
    }
  }

  // Expenses
  const expenses = expensesResult.data ?? []
  if (expenses.length > 0) {
    const totalExpenses = expenses.reduce(
      (s: any, e: any) => s + (((e as Record<string, unknown>).amount_cents as number) ?? 0),
      0
    )
    lines.push(
      `\nEXPENSES (${expenses.length} entries, total: $${(totalExpenses / 100).toFixed(2)}):`
    )
    for (const exp of expenses as Array<Record<string, unknown>>) {
      const cat = (exp.category as string).replace(/_/g, ' ')
      const amt = `$${((exp.amount_cents as number) / 100).toFixed(2)}`
      const vendor = exp.vendor_name ? ` at ${exp.vendor_name}` : ''
      const desc = exp.description ? ` - ${exp.description}` : ''
      lines.push(`- ${cat}: ${amt}${vendor}${desc}`)
    }
  }

  // Event profitability summary (deterministic - revenue vs expenses)
  if (ledger.length > 0 || expenses.length > 0) {
    const totalPaidForProfit = ledger.reduce(
      (s: any, e: any) => s + (((e as Record<string, unknown>).amount_cents as number) ?? 0),
      0
    )
    const totalExpensesForProfit = expenses.reduce(
      (s: any, e: any) => s + (((e as Record<string, unknown>).amount_cents as number) ?? 0),
      0
    )
    const profit = totalPaidForProfit - totalExpensesForProfit
    const margin = totalPaidForProfit > 0 ? Math.round((profit / totalPaidForProfit) * 100) : 0
    if (totalPaidForProfit > 0) {
      const guestCount = (data.guest_count as number) ?? 0
      const perGuest =
        guestCount > 0 ? ` ($${Math.round(totalPaidForProfit / guestCount / 100)}/guest)` : ''
      lines.push(
        `\nEVENT PROFITABILITY: Revenue $${(totalPaidForProfit / 100).toFixed(0)} - Expenses $${(totalExpensesForProfit / 100).toFixed(0)} = Profit $${(profit / 100).toFixed(0)} (${margin}% margin)${perGuest}`
      )
    }
  }

  // Staff assignments
  const staff = staffResult.data ?? []
  if (staff.length > 0) {
    lines.push(`\nSTAFF (${staff.length} assigned):`)
    for (const s of staff as Array<Record<string, unknown>>) {
      const member = s.staff_member as Record<string, unknown> | null
      const name = (member?.full_name as string) ?? 'Unknown'
      const role = s.role_override ? ` (${(s.role_override as string).replace(/_/g, ' ')})` : ''
      const hours = s.scheduled_hours ? ` ${s.scheduled_hours}h scheduled` : ''
      const actual = s.actual_hours ? `, ${s.actual_hours}h worked` : ''
      const pay = s.pay_amount_cents
        ? ` - $${((s.pay_amount_cents as number) / 100).toFixed(2)}`
        : ''
      const status = s.status ? ` [${s.status as string}]` : ''
      lines.push(`- ${name}${role}${hours}${actual}${pay}${status}`)
    }
  }

  // Temperature logs
  const temps = tempLogsResult.data ?? []
  if (temps.length > 0) {
    const unsafe = temps.filter((t: any) => !(t as Record<string, unknown>).is_safe)
    lines.push(`\nTEMP LOGS (${temps.length} readings, ${unsafe.length} flagged unsafe):`)
    for (const t of temps as Array<Record<string, unknown>>) {
      const safe = t.is_safe ? '' : ' ⚠ UNSAFE'
      const phase = (t.phase as string).replace(/_/g, ' ')
      lines.push(`- ${t.item_description}: ${t.temp_fahrenheit}°F (${phase})${safe}`)
    }
  }

  // Quotes
  const quotes = quotesResult.data ?? []
  if (quotes.length > 0) {
    lines.push(`\nQUOTES (${quotes.length}):`)
    for (const q of quotes as Array<Record<string, unknown>>) {
      const name = (q.quote_name as string) ?? 'Untitled'
      const status = q.status as string
      const total = q.total_quoted_cents
        ? `$${((q.total_quoted_cents as number) / 100).toFixed(2)}`
        : '?'
      const deposit = q.deposit_amount_cents
        ? ` (deposit: $${((q.deposit_amount_cents as number) / 100).toFixed(2)})`
        : ''
      const notes = q.pricing_notes ? ` - ${q.pricing_notes}` : ''
      lines.push(`- ${name}: ${total} [${status}]${deposit}${notes}`)
    }
  }

  // Event transitions (audit trail)
  const transitions = transitionsResult.data ?? []
  if (transitions.length > 0) {
    lines.push(`\nSTATUS HISTORY (${transitions.length} transitions):`)
    for (const t of transitions as Array<Record<string, unknown>>) {
      const from = (t.from_status as string) ?? 'new'
      const to = t.to_status as string
      const when = new Date(t.transitioned_at as string).toLocaleDateString()
      const reason = t.reason ? ` - ${t.reason}` : ''
      lines.push(`- ${from} → ${to} (${when})${reason}`)
    }
  }

  // Grocery price quotes
  const grocery = groceryResult.data ?? []
  if (grocery.length > 0) {
    lines.push(`\nGROCERY QUOTES (${grocery.length}):`)
    for (const g of grocery as Array<Record<string, unknown>>) {
      const status = g.status as string
      const count = g.ingredient_count ?? 0
      const avg = g.average_total_cents
        ? `$${((g.average_total_cents as number) / 100).toFixed(2)}`
        : 'N/A'
      const spoon = g.spoonacular_total_cents
        ? `Spoonacular: $${((g.spoonacular_total_cents as number) / 100).toFixed(2)}`
        : ''
      const kroger = g.kroger_total_cents
        ? `Kroger: $${((g.kroger_total_cents as number) / 100).toFixed(2)}`
        : ''
      const sources = [spoon, kroger].filter(Boolean).join(', ')
      const link = g.instacart_link ? ' [Instacart cart available]' : ''
      lines.push(
        `- ${count} ingredients, avg ${avg} [${status}]${sources ? ` (${sources})` : ''}${link}`
      )
    }
  }

  // After-action review
  const aars = aarResult.data ?? []
  if (aars.length > 0) {
    const aar = aars[0] as Record<string, unknown>
    lines.push(`\nAFTER-ACTION REVIEW:`)
    if (aar.overall_rating) lines.push(`Rating: ${aar.overall_rating}/5`)
    if (aar.went_well) {
      lines.push(`Went well: ${sanitizeForPrompt(aar.went_well as string)}`)
    }
    if (aar.to_improve) {
      lines.push(`To improve: ${sanitizeForPrompt(aar.to_improve as string)}`)
    }
    if (aar.lessons_learned) {
      lines.push(`Lessons: ${sanitizeForPrompt(aar.lessons_learned as string)}`)
    }
    if (aar.would_repeat !== null && aar.would_repeat !== undefined) {
      lines.push(`Would repeat: ${aar.would_repeat ? 'Yes' : 'No'}`)
    }
  }

  // Smart follow-up suggestions - deterministic "next best action" based on event state
  const eventSuggestions: string[] = []
  const evtStatus = data.status as string
  const evtDate = data.event_date ? new Date(data.event_date as string) : null
  const hoursUntilEvent = evtDate ? (evtDate.getTime() - Date.now()) / (1000 * 60 * 60) : null

  if (evtStatus === 'draft') {
    eventSuggestions.push('Send a quote to move this event forward')
  } else if (evtStatus === 'proposed') {
    eventSuggestions.push('Follow up with client on the quote')
  } else if (evtStatus === 'accepted' && data.payment_status === 'unpaid') {
    eventSuggestions.push('Send a payment request - event is accepted but unpaid')
  } else if (
    (evtStatus === 'paid' || evtStatus === 'confirmed') &&
    hoursUntilEvent !== null &&
    hoursUntilEvent > 0 &&
    hoursUntilEvent < 72
  ) {
    const missing: string[] = []
    if (!data.prep_list_ready) missing.push('prep list')
    if (!data.grocery_list_ready) missing.push('grocery list')
    if (!data.timeline_ready) missing.push('timeline')
    if (missing.length > 0) {
      eventSuggestions.push(
        `Event is in ${Math.round(hoursUntilEvent)}h - finalize: ${missing.join(', ')}`
      )
    } else {
      eventSuggestions.push('All prep done - send a confirmation message to the client')
    }
  } else if (evtStatus === 'completed') {
    const hasAAR = aars.length > 0
    if (!hasAAR) {
      eventSuggestions.push('Write an after-action review while the event is fresh')
    }
    eventSuggestions.push('Send a thank-you note to the client')
  }

  // Menu not sent yet for upcoming event
  if (
    !data.menu_sent_at &&
    evtStatus !== 'draft' &&
    evtStatus !== 'completed' &&
    evtStatus !== 'cancelled' &&
    hoursUntilEvent !== null &&
    hoursUntilEvent > 0
  ) {
    eventSuggestions.push('Send the menu for client approval')
  }

  if (eventSuggestions.length > 0) {
    lines.push(`\nSUGGESTED NEXT ACTIONS:`)
    for (const s of eventSuggestions) {
      lines.push(`- ${s}`)
    }
  }

  // Intelligence context (non-blocking)
  const eventIntel = await withContextFallback(
    tenantId,
    'load_event_intelligence',
    null,
    () =>
      getEventIntelligenceContext({
        eventId,
        guestCount: (data.guest_count as number) ?? null,
        occasion: (data.occasion as string) ?? null,
        quotedPriceCents: (data.quoted_price_cents as number) ?? null,
        status: data.status as string,
        eventDate: (data.event_date as string) ?? null,
      }),
    { eventId }
  )

  if (eventIntel) {
    if (eventIntel.profitabilityProjection) {
      lines.push(
        `\nPROFITABILITY PROJECTION: Expected ${eventIntel.profitabilityProjection.expectedMarginPercent}% margin (range: ${eventIntel.profitabilityProjection.worstMarginPercent}%-${eventIntel.profitabilityProjection.bestMarginPercent}%, based on ${eventIntel.profitabilityProjection.similarEventsCount} similar events)`
      )
    }
    if (eventIntel.priceComparison) {
      const dir = eventIntel.priceComparison.isAboveAverage ? 'above' : 'below'
      lines.push(
        `PRICE CONTEXT: ${Math.abs(eventIntel.priceComparison.percentFromAvg)}% ${dir} your average per-guest rate`
      )
    }
    if (eventIntel.insights.length > 0) {
      lines.push(`INSIGHTS: ${eventIntel.insights.join('. ')}`)
    }
  }

  return { type: 'event', summary: lines.join('\n') }
}

async function loadClientEntity(
  db: any,
  tenantId: string,
  clientId: string
): Promise<PageEntityContext | undefined> {
  const [clientResult, eventsResult, notesResult, reviewsResult, lastMessageResult] =
    await Promise.all([
      db
        .from('clients')
        .select(
          `id, full_name, email, phone, preferred_contact_method, referral_source,
         partner_name, dietary_restrictions, allergies, dislikes, spice_tolerance,
         favorite_cuisines, favorite_dishes, vibe_notes, payment_behavior,
         tipping_pattern, what_they_care_about, kitchen_size, kitchen_constraints,
         lifetime_value_cents, total_events_count, average_spend_cents, status,
         loyalty_tier, loyalty_points`
        )
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single(),
      // Event history for this client
      db
        .from('events')
        .select(
          'id, occasion, event_date, status, guest_count, quoted_price_cents, payment_status, service_style'
        )
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .order('event_date', { ascending: false })
        .limit(15),
      // Client notes
      db
        .from('client_notes')
        .select('note, category, created_at')
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10),
      // Client reviews
      db
        .from('client_reviews')
        .select('rating, review_text, event_id, created_at')
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5),
      // Last communication - most recent message with this client
      db
        .from('messages')
        .select('direction, body, created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

  await reportContextQueryErrors(tenantId, {
    load_client_entity: clientResult,
    load_client_entity_events: eventsResult,
    load_client_entity_notes: notesResult,
    load_client_entity_reviews: reviewsResult,
    load_client_entity_last_message: lastMessageResult,
  })

  const data = clientResult.data
  if (!data) return undefined

  const lines: string[] = []
  lines.push(`CLIENT: ${data.full_name ?? 'Unknown'}`)
  lines.push(`Status: ${data.status ?? 'active'}`)
  if (data.email) lines.push(`Email: ${data.email}`)
  if (data.phone) lines.push(`Phone: ${data.phone}`)
  if (data.preferred_contact_method) lines.push(`Prefers: ${data.preferred_contact_method}`)
  if (data.referral_source) lines.push(`Source: ${data.referral_source.replace(/_/g, ' ')}`)
  if (data.partner_name) lines.push(`Partner: ${data.partner_name}`)
  if (data.dietary_restrictions?.length)
    lines.push(`Dietary: ${data.dietary_restrictions.join(', ')}`)
  if (data.allergies?.length) lines.push(`Allergies: ${data.allergies.join(', ')}`)
  if (data.dislikes?.length) lines.push(`Dislikes: ${data.dislikes.join(', ')}`)
  if (data.spice_tolerance) lines.push(`Spice tolerance: ${data.spice_tolerance}`)
  if (data.favorite_cuisines?.length)
    lines.push(`Favorite cuisines: ${data.favorite_cuisines.join(', ')}`)
  if (data.favorite_dishes?.length)
    lines.push(`Favorite dishes: ${data.favorite_dishes.join(', ')}`)
  if (data.vibe_notes) lines.push(`Vibe: ${sanitizeForPrompt(data.vibe_notes)}`)
  if (data.what_they_care_about)
    lines.push(`Cares about: ${sanitizeForPrompt(data.what_they_care_about)}`)
  if (data.payment_behavior)
    lines.push(`Payment behavior: ${sanitizeForPrompt(data.payment_behavior)}`)
  if (data.tipping_pattern) lines.push(`Tipping: ${sanitizeForPrompt(data.tipping_pattern)}`)
  if (data.kitchen_size) lines.push(`Kitchen: ${data.kitchen_size}`)
  if (data.kitchen_constraints)
    lines.push(`Kitchen constraints: ${sanitizeForPrompt(data.kitchen_constraints)}`)
  if (data.total_events_count) lines.push(`Total events: ${data.total_events_count}`)
  if (data.loyalty_tier) lines.push(`Loyalty tier: ${data.loyalty_tier}`)
  if (typeof data.loyalty_points === 'number') lines.push(`Loyalty points: ${data.loyalty_points}`)
  if (data.lifetime_value_cents)
    lines.push(`Lifetime value: $${(data.lifetime_value_cents / 100).toFixed(2)}`)
  if (data.average_spend_cents)
    lines.push(`Avg spend: $${(data.average_spend_cents / 100).toFixed(2)}`)

  // Event history
  const events = eventsResult.data ?? []
  if (events.length > 0) {
    const completed = events.filter(
      (e: any) => (e as Record<string, unknown>).status === 'completed'
    ).length
    const upcoming = events.filter((e: any) => {
      const s = (e as Record<string, unknown>).status as string
      return s !== 'completed' && s !== 'cancelled'
    }).length
    lines.push(
      `\nEVENT HISTORY (${events.length} total, ${completed} completed, ${upcoming} active):`
    )
    for (const ev of events as Array<Record<string, unknown>>) {
      const occasion = (ev.occasion as string) ?? 'Event'
      const date = (ev.event_date as string) ?? 'no date'
      const status = ev.status as string
      const guests = ev.guest_count ? `${ev.guest_count} guests` : ''
      const price = ev.quoted_price_cents
        ? `$${((ev.quoted_price_cents as number) / 100).toFixed(2)}`
        : ''
      const payment = ev.payment_status
        ? `[${(ev.payment_status as string).replace(/_/g, ' ')}]`
        : ''
      const details = [guests, price, payment].filter(Boolean).join(', ')
      lines.push(`- ${occasion} (${date}) - ${status}${details ? ` | ${details}` : ''}`)
    }
  }

  // Payment reliability score - deterministic from event payment history
  if (events.length >= 2) {
    const typedEvts = events as Array<Record<string, unknown>>
    const withPayment = typedEvts.filter(
      (e) =>
        e.payment_status && (e.status as string) !== 'draft' && (e.status as string) !== 'cancelled'
    )
    if (withPayment.length >= 2) {
      const paid = withPayment.filter(
        (e) =>
          (e.payment_status as string) === 'paid' || (e.payment_status as string) === 'deposit_paid'
      ).length
      const unpaid = withPayment.filter((e) => (e.payment_status as string) === 'unpaid').length
      const reliability = Math.round((paid / withPayment.length) * 100)
      if (reliability < 70) {
        lines.push(
          `\n[ALERT] PAYMENT RELIABILITY: ${reliability}% (${paid}/${withPayment.length} events paid on time, ${unpaid} unpaid) - consider requiring deposits or upfront payment for this client.`
        )
      } else if (reliability >= 90) {
        lines.push(
          `\nPAYMENT RELIABILITY: ${reliability}% - excellent payer. Low risk for flexible payment terms.`
        )
      }
    }
  }

  // Client notes
  const notes = notesResult.data ?? []
  if (notes.length > 0) {
    lines.push(`\nNOTES (${notes.length}):`)
    for (const n of notes as Array<Record<string, unknown>>) {
      const cat = n.category ? `[${(n.category as string).replace(/_/g, ' ')}] ` : ''
      const date = n.created_at ? new Date(n.created_at as string).toLocaleDateString() : ''
      const note = sanitizeForPrompt((n.note as string) ?? '')
      const truncated = note.length > 150 ? note.slice(0, 150) + '...' : note
      lines.push(`- ${cat}${date}: ${truncated}`)
    }
  }

  // Client reviews
  const reviews = reviewsResult.data ?? []
  if (reviews.length > 0) {
    lines.push(`\nREVIEWS (${reviews.length}):`)
    for (const r of reviews as Array<Record<string, unknown>>) {
      const rating = r.rating ? `${r.rating}/5` : ''
      const text = sanitizeForPrompt((r.review_text as string) ?? '')
      const truncated = text.length > 150 ? text.slice(0, 150) + '...' : text
      lines.push(`- ${rating}${rating && truncated ? ': ' : ''}${truncated}`)
    }
  }

  // Last communication with this client
  const lastMsg = (lastMessageResult.data ?? [])[0] as Record<string, unknown> | undefined
  if (lastMsg) {
    const direction = lastMsg.direction === 'inbound' ? 'FROM client' : 'TO client'
    const date = new Date(lastMsg.created_at as string)
    const daysAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
    const snippet = ((lastMsg.body as string) ?? '').slice(0, 100).replace(/\n/g, ' ')
    lines.push(
      `\nLAST COMMUNICATION (${direction}, ${timeLabel}): "${snippet}${snippet.length >= 100 ? '...' : ''}"`
    )
  }

  // Client lifetime value tier (deterministic - based on LTV and event count)
  const ltvCents = (data.lifetime_value_cents as number) ?? 0
  const totalEvents = (data.total_events_count as number) ?? 0
  if (ltvCents > 0) {
    let ltvTier = 'Standard'
    if (ltvCents >= 2000000) ltvTier = 'VIP ($20K+ lifetime value)'
    else if (ltvCents >= 1000000) ltvTier = 'High-value ($10K+ lifetime value)'
    else if (ltvCents >= 500000) ltvTier = 'Growing ($5K+ lifetime value)'
    lines.push(
      `\nCLIENT VALUE: ${ltvTier} - $${(ltvCents / 100).toFixed(0)} lifetime, ${totalEvents} events`
    )
    if (ltvCents >= 1000000) {
      lines.push(
        `[IMPORTANT] This is a high-value client - prioritize their requests and nurture the relationship.`
      )
    }
  }

  // Smart follow-up suggestions - deterministic "next best action" based on client state
  const suggestions: string[] = []
  const now = Date.now()

  if (events.length > 0) {
    const typedEvents = events as Array<Record<string, unknown>>
    const lastEvent = typedEvents[0]
    const lastStatus = lastEvent.status as string
    const lastDate = lastEvent.event_date ? new Date(lastEvent.event_date as string) : null
    const daysSinceLastEvent = lastDate
      ? Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Recently completed event → suggest thank-you or follow-up
    if (lastStatus === 'completed' && daysSinceLastEvent !== null && daysSinceLastEvent <= 7) {
      suggestions.push('Send a thank-you message - event completed this week')
    } else if (
      lastStatus === 'completed' &&
      daysSinceLastEvent !== null &&
      daysSinceLastEvent <= 14
    ) {
      suggestions.push('Follow up for feedback - event was 1-2 weeks ago')
    }

    // Upcoming event with pending payment
    const unpaidUpcoming = typedEvents.find(
      (e) =>
        e.payment_status === 'unpaid' &&
        e.status !== 'completed' &&
        e.status !== 'cancelled' &&
        e.event_date &&
        new Date(e.event_date as string).getTime() > now
    )
    if (unpaidUpcoming) {
      suggestions.push(
        `Send payment reminder - ${(unpaidUpcoming.occasion as string) ?? 'upcoming event'} is unpaid`
      )
    }

    // Long gap since last event → re-engagement
    if (daysSinceLastEvent !== null && daysSinceLastEvent > 60 && lastStatus === 'completed') {
      suggestions.push(
        `Re-engage - last event was ${daysSinceLastEvent} days ago. Consider a seasonal menu offer`
      )
    }
  } else {
    suggestions.push('New client - schedule an intro call or send a welcome message')
  }

  // No communication in a while
  if (lastMsg) {
    const msgDate = new Date(lastMsg.created_at as string)
    const daysSinceMsg = Math.floor((now - msgDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceMsg > 30 && lastMsg.direction === 'inbound') {
      suggestions.push(`Client messaged ${daysSinceMsg} days ago and you haven't replied since`)
    }
  }

  if (suggestions.length > 0) {
    lines.push(`\nSUGGESTED NEXT ACTIONS:`)
    for (const s of suggestions) {
      lines.push(`- ${s}`)
    }
  }

  // Intelligence context (non-blocking)
  const clientIntel = await withContextFallback(
    tenantId,
    'load_client_intelligence',
    null,
    () => getClientIntelligenceContext(clientId),
    { clientId }
  )

  if (clientIntel) {
    lines.push(`\nRELATIONSHIP INTELLIGENCE:`)
    lines.push(
      `Churn risk: ${clientIntel.churnRisk.level} (score: ${clientIntel.churnRisk.score}/100)`
    )
    if (clientIntel.churnRisk.factors.length > 0) {
      lines.push(`Risk factors: ${clientIntel.churnRisk.factors.join(', ')}`)
    }
    if (clientIntel.rebookingPrediction.predictedNextBookingDays !== null) {
      lines.push(
        `Predicted next booking: ~${clientIntel.rebookingPrediction.predictedNextBookingDays} days`
      )
    }
    if (clientIntel.rebookingPrediction.seasonalPattern) {
      lines.push(`Seasonal pattern: ${clientIntel.rebookingPrediction.seasonalPattern}`)
    }
    if (clientIntel.rebookingPrediction.preferredOccasion) {
      lines.push(`Preferred event type: ${clientIntel.rebookingPrediction.preferredOccasion}`)
    }
    lines.push(`Revenue trend: ${clientIntel.revenueTrajectory.trend}`)
    if (clientIntel.insights.length > 0) {
      lines.push(`Insights: ${clientIntel.insights.join('. ')}`)
    }
  }

  return { type: 'client', summary: lines.join('\n') }
}

async function loadRecipeEntity(
  db: any,
  tenantId: string,
  recipeId: string
): Promise<PageEntityContext | undefined> {
  const [recipeResult, ingredientsResult] = await Promise.all([
    db
      .from('recipes')
      .select(
        `id, name, category, description, method, yield_description,
         prep_time_minutes, cook_time_minutes, total_time_minutes,
         dietary_tags, notes, adaptations, times_cooked, last_cooked_at`
      )
      .eq('id', recipeId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('recipe_ingredients')
      .select('quantity, unit, preparation_notes, ingredient:ingredients(name, allergen_flags)')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true })
      .limit(30),
  ])

  await reportContextQueryErrors(tenantId, {
    load_recipe_entity: recipeResult,
    load_recipe_entity_ingredients: ingredientsResult,
  })

  const data = recipeResult.data
  if (!data) return undefined

  const lines: string[] = []
  lines.push(`RECIPE: ${data.name}`)
  if (data.category) lines.push(`Category: ${data.category}`)
  if (data.description) lines.push(`Description: ${data.description}`)
  if (data.yield_description) lines.push(`Yield: ${data.yield_description}`)
  const times: string[] = []
  if (data.prep_time_minutes) times.push(`prep ${data.prep_time_minutes}m`)
  if (data.cook_time_minutes) times.push(`cook ${data.cook_time_minutes}m`)
  if (data.total_time_minutes) times.push(`total ${data.total_time_minutes}m`)
  if (times.length) lines.push(`Time: ${times.join(', ')}`)
  if (data.dietary_tags?.length) lines.push(`Dietary: ${data.dietary_tags.join(', ')}`)
  if (data.times_cooked) lines.push(`Cooked ${data.times_cooked} times`)
  if (data.notes) lines.push(`Notes: ${sanitizeForPrompt(data.notes)}`)
  if (data.adaptations) lines.push(`Adaptations: ${sanitizeForPrompt(data.adaptations)}`)

  const ingredients = ingredientsResult.data ?? []
  if (ingredients.length > 0) {
    lines.push(`\nINGREDIENTS (${ingredients.length}):`)
    for (const ing of ingredients) {
      const ingData = ing.ingredient as Record<string, unknown> | null
      const name = (ingData?.name as string) ?? 'Unknown'
      const qty = ing.quantity ? `${ing.quantity}` : ''
      const unit = ing.unit ?? ''
      const prep = ing.preparation_notes ? ` (${ing.preparation_notes})` : ''
      lines.push(`- ${qty} ${unit} ${name}${prep}`.trim())
    }
  }

  // Recipe intelligence - allergen awareness and usage frequency
  const allergens = new Set<string>()
  for (const ing of ingredients) {
    const ingData = ing.ingredient as Record<string, unknown> | null
    const flags = ingData?.allergen_flags as string[] | null
    if (flags) {
      for (const f of flags) allergens.add(f.toLowerCase())
    }
  }
  if (allergens.size > 0) {
    lines.push(
      `\n[SAFETY] ALLERGENS IN THIS RECIPE: ${Array.from(allergens).join(', ').toUpperCase()}. Always flag when planning this for clients with allergies.`
    )
  }

  // Cooking frequency insight
  if (data.times_cooked && data.last_cooked_at) {
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(data.last_cooked_at as string).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLast > 90 && data.times_cooked >= 3) {
      lines.push(
        `\nThis recipe hasn't been cooked in ${daysSinceLast} days despite being a ${data.times_cooked}-time favorite - consider featuring it in an upcoming event.`
      )
    }
  }

  return { type: 'recipe', summary: lines.join('\n') }
}

async function loadInquiryEntity(
  db: any,
  tenantId: string,
  inquiryId: string
): Promise<PageEntityContext | undefined> {
  const [inquiryResult, messagesResult] = await Promise.all([
    db
      .from('inquiries')
      .select(
        `id, channel, status, source_message,
         confirmed_date, confirmed_guest_count, confirmed_location,
         confirmed_occasion, confirmed_budget_cents, confirmed_dietary_restrictions,
         unknown_fields, next_action_required, next_action_by,
         follow_up_due_at, first_contact_at,
         client:clients(full_name, email, phone)`
      )
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single(),
    // Message thread for this inquiry
    db
      .from('inquiry_messages' as any)
      .select('channel, direction, status, subject, body, sent_at, created_at')
      .eq('inquiry_id', inquiryId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(15),
  ])

  await reportContextQueryErrors(tenantId, {
    load_inquiry_entity: inquiryResult,
    load_inquiry_entity_messages: messagesResult,
  })

  const data = inquiryResult.data
  if (!data) return undefined

  const client = data.client as Record<string, unknown> | null
  const lines: string[] = []
  lines.push(`INQUIRY: ${data.confirmed_occasion ?? 'New inquiry'}`)
  lines.push(`Status: ${data.status}`)
  if (data.channel) lines.push(`Channel: ${data.channel}`)
  if (client?.full_name) lines.push(`Client: ${client.full_name}`)
  if (client?.email) lines.push(`Email: ${client.email}`)
  if (client?.phone) lines.push(`Phone: ${client.phone}`)
  if (data.confirmed_date) lines.push(`Date: ${data.confirmed_date}`)
  if (data.confirmed_guest_count) lines.push(`Guests: ${data.confirmed_guest_count}`)
  if (data.confirmed_location) lines.push(`Location: ${data.confirmed_location}`)
  if (data.confirmed_budget_cents)
    lines.push(`Budget: $${(data.confirmed_budget_cents / 100).toFixed(2)}`)
  if (data.confirmed_dietary_restrictions?.length)
    lines.push(`Dietary: ${data.confirmed_dietary_restrictions.join(', ')}`)
  if (data.source_message) {
    const msg =
      data.source_message.length > 300
        ? data.source_message.slice(0, 300) + '...'
        : data.source_message
    lines.push(`Original message: ${msg}`)
  }
  if (data.unknown_fields && Array.isArray(data.unknown_fields) && data.unknown_fields.length > 0)
    lines.push(`Unanswered questions: ${(data.unknown_fields as string[]).join('; ')}`)
  if (data.next_action_required)
    lines.push(`Next action: ${data.next_action_required} (by ${data.next_action_by ?? '?'})`)
  if (data.follow_up_due_at) lines.push(`Follow-up due: ${data.follow_up_due_at}`)

  // GOLDMINE lead score + response coaching (from unknown_fields JSONB)
  const uf = data.unknown_fields as Record<string, unknown> | null
  if (uf && typeof uf === 'object' && !Array.isArray(uf) && uf.lead_score != null) {
    const score = uf.lead_score as number
    const tier = ((uf.lead_tier as string) || 'unknown').toUpperCase()
    const factors = Array.isArray(uf.lead_score_factors) ? (uf.lead_score_factors as string[]) : []
    lines.push(`\nLEAD INTELLIGENCE:`)
    lines.push(`Lead Score: ${score}/100 (${tier})`)
    if (factors.length > 0) lines.push(`Score Factors: ${factors.join(', ')}`)
    // Response coaching based on tier
    if (tier === 'HOT') {
      lines.push(
        `Response Coaching: This is a HOT lead - prioritize. Respond within 4-24 hours for best conversion.`
      )
    } else if (tier === 'WARM') {
      lines.push(
        `Response Coaching: WARM lead - respond within 24 hours. Good potential, needs timely follow-up.`
      )
    } else if (tier === 'COLD') {
      lines.push(
        `Response Coaching: COLD lead - respond within 72 hours. Lower priority, but still worth a reply.`
      )
    }
  }

  // Message thread
  const messages = messagesResult.data ?? []
  if (messages.length > 0) {
    const inbound = messages.filter(
      (m: any) => (m as Record<string, unknown>).direction === 'inbound'
    ).length
    const outbound = messages.filter(
      (m: any) => (m as Record<string, unknown>).direction === 'outbound'
    ).length
    lines.push(
      `\nMESSAGE THREAD (${messages.length} messages - ${inbound} from client, ${outbound} from chef):`
    )
    for (const msg of messages as Array<Record<string, unknown>>) {
      const dir = msg.direction === 'inbound' ? '← Client' : '→ Chef'
      const ch = msg.channel ? ` [${msg.channel}]` : ''
      const date = msg.sent_at
        ? new Date(msg.sent_at as string).toLocaleDateString()
        : msg.created_at
          ? new Date(msg.created_at as string).toLocaleDateString()
          : ''
      const subj = msg.subject ? ` "${msg.subject}"` : ''
      const body = msg.body
        ? (msg.body as string).length > 200
          ? ` ${(msg.body as string).slice(0, 200)}...`
          : ` ${msg.body}`
        : ''
      const status = msg.status === 'draft' ? ' (DRAFT)' : ''
      lines.push(`- ${dir}${ch} ${date}${subj}${status}:${body}`)
    }
  }

  // Intelligence context (non-blocking)
  const inquiryIntel = await withContextFallback(
    tenantId,
    'load_inquiry_conversion_intelligence',
    null,
    () =>
      getInquiryConversionContext({
        inquiryId,
        guestCount: (data.confirmed_guest_count as number) ?? null,
        occasion: (data.confirmed_occasion as string) ?? null,
        budgetCents: (data.confirmed_budget_cents as number) ?? null,
        channel: (data.channel as string) ?? 'unknown',
        createdAt: (data.first_contact_at as string) ?? new Date().toISOString(),
      }),
    { inquiryId }
  )

  if (inquiryIntel) {
    lines.push(`\nCONVERSION INTELLIGENCE:`)
    lines.push(
      `Conversion likelihood: ${inquiryIntel.conversionLikelihood}% (${inquiryIntel.conversionLabel})`
    )
    lines.push(
      `Based on ${inquiryIntel.similarConvertedCount}/${inquiryIntel.similarInquiriesCount} similar inquiries that converted`
    )
    if (inquiryIntel.avgDaysToConvert) {
      lines.push(`Avg time to convert: ${inquiryIntel.avgDaysToConvert} days`)
    }
    if (inquiryIntel.pricingBenchmark) {
      lines.push(
        `Pricing benchmark: $${Math.round(inquiryIntel.pricingBenchmark.medianPerGuestCents / 100)}/guest (range $${Math.round(inquiryIntel.pricingBenchmark.rangeLowCents / 100)}-$${Math.round(inquiryIntel.pricingBenchmark.rangeHighCents / 100)})`
      )
    }
    lines.push(
      `Pipeline position: #${inquiryIntel.pipelinePosition.thisRank} of ${inquiryIntel.pipelinePosition.totalOpen} open`
    )
    if (inquiryIntel.factors.length > 0) {
      lines.push(`Factors: ${inquiryIntel.factors.join(', ')}`)
    }
  }

  // Smart follow-up suggestions for inquiries
  const inquirySuggestions: string[] = []
  const inqStatus = data.status as string
  const followUpDue = data.follow_up_due_at ? new Date(data.follow_up_due_at as string) : null
  const inqNow = Date.now()

  if (inqStatus === 'new') {
    inquirySuggestions.push('Send first response - this inquiry has not been replied to yet')
  } else if (inqStatus === 'awaiting_chef') {
    inquirySuggestions.push('The ball is in your court - the client is waiting for your response')
  } else if (inqStatus === 'awaiting_client') {
    if (followUpDue && followUpDue.getTime() < inqNow) {
      inquirySuggestions.push('Follow-up is overdue - send a gentle nudge')
    } else if (followUpDue && followUpDue.getTime() - inqNow < 24 * 60 * 60 * 1000) {
      inquirySuggestions.push('Follow-up due within 24 hours')
    }
  }

  // Budget comparison against historical data
  if (data.confirmed_budget_cents && data.confirmed_guest_count) {
    const budgetPerGuest = Math.round(
      (data.confirmed_budget_cents as number) / (data.confirmed_guest_count as number)
    )
    inquirySuggestions.push(
      `Budget: $${budgetPerGuest}/guest - ${budgetPerGuest >= 150 ? 'premium range' : budgetPerGuest >= 75 ? 'standard range' : 'budget-conscious - consider a simpler menu'}`
    )
  }

  // Missing info nudge
  const missingFields: string[] = []
  if (!data.confirmed_date) missingFields.push('event date')
  if (!data.confirmed_guest_count) missingFields.push('guest count')
  if (!data.confirmed_location) missingFields.push('location')
  if (!data.confirmed_budget_cents) missingFields.push('budget')
  if (missingFields.length > 0 && inqStatus !== 'converted' && inqStatus !== 'closed') {
    inquirySuggestions.push(`Missing info: ${missingFields.join(', ')} - ask in your next response`)
  }

  if (inquirySuggestions.length > 0) {
    lines.push(`\nSUGGESTED NEXT ACTIONS:`)
    for (const s of inquirySuggestions) {
      lines.push(`- ${s}`)
    }
  }

  return { type: 'inquiry', summary: lines.join('\n') }
}

async function loadMenuEntity(
  db: any,
  tenantId: string,
  menuId: string
): Promise<PageEntityContext | undefined> {
  const [menuResult, dishesResult] = await Promise.all([
    db
      .from('menus')
      .select(
        `id, name, description, status, cuisine_type, service_style,
         target_guest_count, is_template, notes`
      )
      .eq('id', menuId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('dishes')
      .select(
        `id, course_number, course_name, description, dietary_tags, allergen_flags, chef_notes,
         components(name, category, recipe:recipes(name))`
      )
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })
      .limit(20),
  ])

  await reportContextQueryErrors(tenantId, {
    load_menu_entity: menuResult,
    load_menu_entity_dishes: dishesResult,
  })

  const data = menuResult.data
  if (!data) return undefined

  const lines: string[] = []
  lines.push(`MENU: ${data.name}`)
  lines.push(`Status: ${data.status}`)
  if (data.cuisine_type) lines.push(`Cuisine: ${data.cuisine_type}`)
  if (data.service_style) lines.push(`Style: ${data.service_style.replace(/_/g, ' ')}`)
  if (data.target_guest_count) lines.push(`Target guests: ${data.target_guest_count}`)
  if (data.is_template) lines.push(`(Template - reusable)`)
  if (data.description) lines.push(`Description: ${data.description}`)
  if (data.notes) lines.push(`Notes: ${data.notes}`)

  const dishes = (dishesResult.data ?? []) as Array<Record<string, unknown>>
  if (dishes.length > 0) {
    lines.push(`\nCOURSES (${dishes.length}):`)
    for (const dish of dishes) {
      const courseName = (dish.course_name as string) ?? `Course ${dish.course_number}`
      const desc = dish.description ? `: ${dish.description}` : ''
      lines.push(`\n${courseName}${desc}`)
      if ((dish.dietary_tags as string[] | null)?.length)
        lines.push(`  Dietary: ${(dish.dietary_tags as string[]).join(', ')}`)
      if ((dish.allergen_flags as string[] | null)?.length)
        lines.push(`  Allergens: ${(dish.allergen_flags as string[]).join(', ')}`)
      const components = (dish.components ?? []) as Array<Record<string, unknown>>
      for (const comp of components) {
        const recipe = comp.recipe as Record<string, unknown> | null
        const recipeName = recipe?.name ? ` (recipe: ${recipe.name})` : ''
        lines.push(`  - ${comp.name}${recipeName}`)
      }
    }
  }

  // Menu intelligence - allergen consolidation and dietary coverage
  if (dishes.length > 0) {
    const menuAllergens = new Set<string>()
    const menuDietaryTags = new Set<string>()
    for (const dish of dishes) {
      const flags = dish.allergen_flags as string[] | null
      const tags = dish.dietary_tags as string[] | null
      if (flags) for (const f of flags) menuAllergens.add(f.toLowerCase())
      if (tags) for (const t of tags) menuDietaryTags.add(t.toLowerCase())
    }
    if (menuAllergens.size > 0) {
      lines.push(
        `\n[SAFETY] ALLERGENS IN THIS MENU: ${Array.from(menuAllergens).join(', ').toUpperCase()}. Cross-reference with client allergies before sending for approval.`
      )
    }
    if (menuDietaryTags.size > 0) {
      lines.push(
        `\nDietary coverage: ${Array.from(menuDietaryTags).join(', ')}. Check if all client dietary needs are met.`
      )
    }
  }

  return { type: 'menu', summary: lines.join('\n') }
}

// ─── Tier 4: Message-Aware Entity Resolution ────────────────────────────────
// Scans the user's message for client names, event occasions, and recipe names.
// If a match is found in the DB, loads the full entity so Remy can answer
// questions about any entity mentioned by name - regardless of what page
// the chef is on.

export async function resolveMessageEntities(message: string): Promise<PageEntityContext[]> {
  if (!message || message.length < 3) return []

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Normalize message for matching
  const msgLower = message.toLowerCase()

  // Run all searches in parallel - each is cheap (indexed ilike, limit 3)
  const [clientHits, eventHits, recipeHits, inquiryHits] = await Promise.all([
    findMentionedClients(db, tenantId, msgLower),
    findMentionedEvents(db, tenantId, msgLower),
    findMentionedRecipes(db, tenantId, msgLower),
    findMentionedInquiries(db, tenantId, msgLower),
  ])

  const results: PageEntityContext[] = []

  // Load full details for matched entities (limit to 3 total to keep prompt lean)
  for (const client of clientHits.slice(0, 2)) {
    const ctx = await loadClientEntity(db, tenantId, client.id)
    if (ctx) results.push(ctx)
  }
  for (const event of eventHits.slice(0, 2)) {
    const ctx = await loadEventEntity(db, tenantId, event.id)
    if (ctx) results.push(ctx)
  }
  for (const recipe of recipeHits.slice(0, 1)) {
    const ctx = await loadRecipeEntity(db, tenantId, recipe.id)
    if (ctx) results.push(ctx)
  }
  for (const inquiry of inquiryHits.slice(0, 1)) {
    const ctx = await loadInquiryEntity(db, tenantId, inquiry.id)
    if (ctx) results.push(ctx)
  }

  return results.slice(0, 3) // Hard cap: 3 entities max
}

async function findMentionedClients(
  db: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string; full_name: string }>> {
  // Get all client names for this tenant (cached in Tier 2, so this is usually fast)
  const { data } = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .limit(200)

  if (!data) return []

  // Match: check if any client's first name, last name, or full name appears in the message
  // Includes fuzzy matching: "the Johnsons", "Mrs. Henderson", pluralized last names
  return data.filter((c: any) => {
    if (!c.full_name) return false
    const fullLower = c.full_name.toLowerCase()
    // Full name match
    if (msgLower.includes(fullLower)) return true
    const parts = fullLower.split(/\s+/)
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      const firstName = parts[0]
      // Only match names 3+ chars to avoid matching "Mr" or "Li" etc.
      if (lastName.length >= 3) {
        // Exact last name
        if (msgLower.includes(lastName)) return true
        // Pluralized last name: "the Johnsons" → "johnson"
        if (msgLower.includes(lastName + 's')) return true
        // "the [lastName] family"
        if (msgLower.includes(`the ${lastName}`)) return true
        // "Mrs./Mr./Ms. [lastName]"
        const honorifics = ['mr', 'mrs', 'ms', 'miss', 'dr', 'chef']
        for (const h of honorifics) {
          if (msgLower.includes(`${h}. ${lastName}`) || msgLower.includes(`${h} ${lastName}`))
            return true
        }
      }
      // First name match (only if 4+ chars to avoid false positives)
      if (firstName.length >= 4 && msgLower.includes(firstName)) return true
    } else if (parts.length === 1 && parts[0].length >= 4) {
      // Single-name clients - match if 4+ chars
      if (msgLower.includes(parts[0])) return true
    }
    return false
  })
}

async function findMentionedEvents(
  db: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  // Get recent events with their occasion and client name
  const { data } = await db
    .from('events')
    .select('id, occasion, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: false })
    .limit(50)

  if (!data) return []

  return data.filter((e: any) => {
    // Match by occasion name
    if (e.occasion && msgLower.includes(e.occasion.toLowerCase())) return true
    // Match by client name + event-related keywords
    const client = e.client as Record<string, unknown> | null
    if (client?.full_name) {
      const clientLower = (client.full_name as string).toLowerCase()
      const eventKeywords = [
        'event',
        'dinner',
        'party',
        'booking',
        'gig',
        'service',
        'cook',
        'paid',
        'payment',
        'owe',
        'owed',
        'invoice',
        'quote',
        'expense',
        'staff',
        'temp',
        'temperature',
        'menu',
        'grocery',
        'groceries',
        'prep',
        'timeline',
        'schedule',
      ]
      if (msgLower.includes(clientLower) && eventKeywords.some((k) => msgLower.includes(k))) {
        return true
      }
    }
    return false
  })
}

async function findMentionedRecipes(
  db: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  const { data } = await db
    .from('recipes')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .limit(200)

  if (!data) return []

  return data.filter((r: any) => {
    if (!r.name) return false
    return msgLower.includes(r.name.toLowerCase())
  })
}

async function findMentionedInquiries(
  db: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  // Only search if inquiry-related keywords are in the message
  const inquiryKeywords = ['inquiry', 'enquiry', 'lead', 'prospect', 'follow up', 'follow-up']
  if (!inquiryKeywords.some((k) => msgLower.includes(k))) return []

  const { data } = await db
    .from('inquiries')
    .select('id, confirmed_occasion, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'closed')
    .order('created_at', { ascending: false })
    .limit(30)

  if (!data) return []

  return data.filter((inq: any) => {
    // Match by occasion
    if (inq.confirmed_occasion && msgLower.includes(inq.confirmed_occasion.toLowerCase()))
      return true
    // Match by client name + inquiry keyword
    const client = inq.client as Record<string, unknown> | null
    if (client?.full_name) {
      const clientLower = (client.full_name as string).toLowerCase()
      if (msgLower.includes(clientLower)) return true
    }
    return false
  })
}
