'use server'

// Remy — Context Loader
// PRIVACY: Loads chef business context for Remy's system prompt.
// Contains client names, event details, and financial data — must stay local.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { RemyContext, PageEntityContext } from '@/lib/ai/remy-types'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'
import { loadEmailDigest } from '@/lib/ai/remy-email-actions'
import { sanitizeForPrompt } from '@/lib/ai/remy-input-validation'

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
    | 'pageEntity'
    | 'mentionedEntities'
    | 'dailyPlan'
    | 'emailDigest'
  >
  expiresAt: number
}

const contextCache = new Map<string, CachedContext>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Public Loader ──────────────────────────────────────────────────────────

export async function loadRemyContext(currentPage?: string): Promise<RemyContext> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Tier 1: Always fresh (cheap count queries + chef profile + daily plan)
  const [chefProfile, counts, dailyPlan] = await Promise.all([
    loadChefProfile(supabase, tenantId),
    loadQuickCounts(supabase, tenantId),
    getDailyPlanStats().catch(() => null),
  ])

  // Tier 2: Cached for 5 minutes
  const cached = contextCache.get(tenantId)
  let detailed: CachedContext['data']

  if (cached && cached.expiresAt > Date.now()) {
    detailed = cached.data
  } else {
    detailed = await loadDetailedContext(supabase, tenantId)
    contextCache.set(tenantId, {
      data: detailed,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
  }

  // Tier 2b: Email digest (non-blocking, cached alongside detailed context)
  const emailDigest = await loadEmailDigest(tenantId).catch((err) => {
    console.error('[non-blocking] Email digest failed:', err)
    return undefined
  })

  // Tier 3: Page-specific entity context (non-blocking)
  const pageEntity = await loadPageEntityContext(supabase, tenantId, currentPage).catch((err) => {
    console.error('[non-blocking] Page entity context failed:', err)
    return undefined
  })

  return {
    chefName: chefProfile.businessName,
    businessName: chefProfile.businessName,
    tagline: chefProfile.tagline,
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
  }
}

// ─── Tier 1: Chef Profile ───────────────────────────────────────────────────

async function loadChefProfile(supabase: any, tenantId: string) {
  const { data } = await supabase
    .from('chefs')
    .select('business_name, tagline')
    .eq('id', tenantId)
    .single()

  return {
    businessName: data?.business_name ?? null,
    tagline: data?.tagline ?? null,
  }
}

// ─── Tier 1: Quick Counts ───────────────────────────────────────────────────

async function loadQuickCounts(supabase: any, tenantId: string) {
  const [clientsResult, eventsResult, inquiriesResult] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', new Date().toISOString().split('T')[0]),
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef', 'awaiting_client']),
  ])

  return {
    clients: clientsResult.count ?? 0,
    upcomingEvents: eventsResult.count ?? 0,
    openInquiries: inquiriesResult.count ?? 0,
  }
}

// ─── Tier 2: Detailed Context (cached 5 min) ────────────────────────────────

async function loadDetailedContext(supabase: any, tenantId: string) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
  ] = await Promise.all([
    // Upcoming events (next 7 days, limit 10)
    supabase
      .from('events')
      .select(
        'id, occasion, event_date, status, guest_count, client:clients(full_name, loyalty_tier, loyalty_points)'
      )
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(10),

    // Recent clients (limit 5)
    supabase
      .from('clients')
      .select('id, full_name, loyalty_tier, loyalty_points')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Month revenue from ledger
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('entry_type', 'payment')
      .gte('created_at', monthStart),

    // Pending quotes
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'sent']),

    // Availability blocks (next 30 days)
    supabase
      .from('chef_availability_blocks')
      .select('block_date, block_type, reason')
      .eq('chef_id', tenantId)
      .gte('block_date', today)
      .lte('block_date', next30)
      .order('block_date', { ascending: true })
      .limit(20),

    // Calendar entries (next 30 days)
    supabase
      .from('chef_calendar_entries')
      .select('title, start_date, end_date, entry_type, blocks_bookings')
      .eq('chef_id', tenantId)
      .gte('end_date', today)
      .lte('start_date', next30)
      .order('start_date', { ascending: true })
      .limit(15),

    // Waitlist entries (active)
    supabase
      .from('waitlist_entries')
      .select('requested_date, occasion, status, client:clients(full_name)')
      .eq('chef_id', tenantId)
      .in('status', ['waiting', 'contacted'])
      .order('requested_date', { ascending: true })
      .limit(10),

    // Staff roster
    supabase
      .from('staff_members')
      .select('full_name, default_role, phone, status')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .order('full_name', { ascending: true })
      .limit(20),

    // Equipment count by category
    supabase
      .from('equipment_items')
      .select('id, category')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .limit(100),

    // Active goals
    supabase
      .from('chef_goals')
      .select('title, target_date, progress_pct, status')
      .eq('chef_id', tenantId)
      .in('status', ['active', 'in_progress'])
      .order('target_date', { ascending: true })
      .limit(10),

    // Active todos
    supabase
      .from('chef_todos')
      .select('title, due_date, priority, status')
      .eq('chef_id', tenantId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(10),

    // Scheduled calls (upcoming)
    supabase
      .from('scheduled_calls')
      .select('scheduled_at, purpose, status, client:clients(full_name)')
      .eq('chef_id', tenantId)
      .gte('scheduled_at', now.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true })
      .limit(5),

    // Documents count
    supabase
      .from('chef_documents')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId),

    // Folders count
    supabase
      .from('chef_folders')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId),

    // Recent Remy artifacts
    supabase
      .from('remy_artifacts')
      .select('artifact_type, title, created_at')
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Year revenue (ledger payments YTD)
    supabase
      .from('ledger_entries')
      .select('amount_cents, client_id')
      .eq('tenant_id', tenantId)
      .eq('entry_type', 'payment')
      .gte('created_at', yearStart),

    // Year expenses
    supabase
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .gte('expense_date', yearStart.split('T')[0]),

    // Year events
    supabase
      .from('events')
      .select('id, status, quoted_price_cents, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('event_date', yearStart.split('T')[0])
      .not('status', 'eq', 'cancelled'),

    // ─── Context enrichment (2026-02-28) ─────────────────────────────────

    // Recipe library stats
    supabase.from('recipes').select('id, category').eq('tenant_id', tenantId).limit(200),

    // Client vibe notes + dietary/allergy data (safety-critical)
    supabase
      .from('clients')
      .select('full_name, vibe_notes, dietary_restrictions, allergies')
      .eq('tenant_id', tenantId)
      .not('vibe_notes', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10),

    // Recent after-action reviews (lessons learned)
    supabase
      .from('after_action_reviews')
      .select('event_id, overall_rating, went_well, to_improve, lessons_learned, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(3),

    // Pending menu approvals
    supabase
      .from('menu_approval_requests')
      .select('id, status, client:clients(full_name), created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),

    // Unread inbound messages (inquiry_messages table doesn't exist — use messages table)
    supabase
      .from('messages')
      .select('id, inquiry_id, direction, created_at, clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('direction', 'inbound')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

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
    const { data: nameData } = await supabase
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
    staffRoster: (staffResult.data ?? []).map((s: Record<string, unknown>) => ({
      name: (s.full_name as string) ?? 'Unknown',
      role: (s.default_role as string) ?? 'general',
      phone: (s.phone as string) ?? null,
      activeAssignments: 0,
    })),
    equipmentSummary: { totalItems: equipItems.length, categories: equipCategories },
    activeGoals: (goalsResult.data ?? []).map((g: Record<string, unknown>) => ({
      title: (g.title as string) ?? 'Untitled',
      targetDate: (g.target_date as string) ?? null,
      progress: (g.progress_pct as number) ?? null,
      status: (g.status as string) ?? 'active',
    })),
    activeTodos: (todosResult.data ?? []).map((t: Record<string, unknown>) => ({
      title: (t.title as string) ?? 'Untitled',
      dueDate: (t.due_date as string) ?? null,
      priority: (t.priority as string) ?? 'normal',
      status: (t.status as string) ?? 'pending',
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
    clientVibeNotes: (clientVibeNotesResult.data ?? []).map((c: Record<string, unknown>) => ({
      name: (c.full_name as string) ?? 'Unknown',
      vibeNotes: (c.vibe_notes as string) ?? '',
      dietaryRestrictions: (c.dietary_restrictions as string[]) ?? [],
      allergies: (c.allergies as string[]) ?? [],
    })),
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
  }
}

// ─── Tier 3: Page Entity Context ────────────────────────────────────────────
// Detects entity IDs from the current URL and fetches rich detail so Remy
// understands exactly what the chef is looking at.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

async function loadPageEntityContext(
  supabase: any,
  tenantId: string,
  currentPage?: string
): Promise<PageEntityContext | undefined> {
  if (!currentPage) return undefined

  const idMatch = currentPage.match(UUID_RE)
  if (!idMatch) return undefined
  const entityId = idMatch[0]

  if (currentPage.startsWith('/events/')) {
    return loadEventEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/clients/')) {
    return loadClientEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/recipes/')) {
    return loadRecipeEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/inquiries/')) {
    return loadInquiryEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/menus/')) {
    return loadMenuEntity(supabase, tenantId, entityId)
  }

  return undefined
}

async function loadEventEntity(
  supabase: any,
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
    supabase
      .from('events')
      .select(
        `id, occasion, event_date, serve_time, guest_count, status, service_style,
         location_address, location_city, location_state,
         dietary_restrictions, allergies, special_requests,
         quoted_price_cents, payment_status, kitchen_notes,
         prep_list_ready, grocery_list_ready, timeline_ready,
         menu_approval_status, menu_sent_at, menu_approved_at, menu_revision_notes,
         client:clients(full_name, email, phone, dietary_restrictions, allergies, vibe_notes, loyalty_tier, loyalty_points)`
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    // Ledger entries (payments, deposits, refunds)
    supabase
      .from('ledger_entries')
      .select('entry_type, amount_cents, description, payment_method, received_at, is_refund')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(20),
    // Expenses linked to this event
    supabase
      .from('expenses')
      .select('category, amount_cents, vendor_name, description, expense_date')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('expense_date', { ascending: true })
      .limit(20),
    // Staff assignments
    supabase
      .from('event_staff_assignments')
      .select(
        'role_override, scheduled_hours, actual_hours, pay_amount_cents, status, notes, staff_member:staff_members(full_name)'
      )
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .limit(10),
    // Temperature logs
    supabase
      .from('event_temp_logs')
      .select('item_description, temp_fahrenheit, phase, is_safe, logged_at, notes')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .order('logged_at', { ascending: true })
      .limit(20),
    // Quotes for this event
    supabase
      .from('quotes')
      .select(
        'quote_name, status, total_quoted_cents, pricing_model, deposit_amount_cents, sent_at, accepted_at, pricing_notes'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Event transitions (audit trail)
    supabase
      .from('event_transitions' as any)
      .select('from_status, to_status, transitioned_at, reason')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('transitioned_at', { ascending: true })
      .limit(15),
    // Menu approval requests
    supabase
      .from('menu_approval_requests')
      .select('status, sent_at, responded_at, revision_notes')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Grocery price quotes
    supabase
      .from('grocery_price_quotes')
      .select(
        'status, ingredient_count, spoonacular_total_cents, kroger_total_cents, average_total_cents, instacart_link, created_at'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(3),
    // After-action reviews
    supabase
      .from('after_action_reviews')
      .select('overall_rating, went_well, to_improve, lessons_learned, would_repeat, created_at')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

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
      const desc = entry.description ? ` — ${entry.description}` : ''
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
      const desc = exp.description ? ` — ${exp.description}` : ''
      lines.push(`- ${cat}: ${amt}${vendor}${desc}`)
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
        ? ` — $${((s.pay_amount_cents as number) / 100).toFixed(2)}`
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
      const notes = q.pricing_notes ? ` — ${q.pricing_notes}` : ''
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
      const reason = t.reason ? ` — ${t.reason}` : ''
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

  return { type: 'event', summary: lines.join('\n') }
}

async function loadClientEntity(
  supabase: any,
  tenantId: string,
  clientId: string
): Promise<PageEntityContext | undefined> {
  const [clientResult, eventsResult, notesResult, reviewsResult] = await Promise.all([
    supabase
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
    supabase
      .from('events')
      .select(
        'id, occasion, event_date, status, guest_count, quoted_price_cents, payment_status, service_style'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: false })
      .limit(15),
    // Client notes
    supabase
      .from('client_notes')
      .select('note, category, created_at')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
    // Client reviews
    supabase
      .from('client_reviews')
      .select('rating, review_text, event_id, created_at')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

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
      lines.push(`- ${occasion} (${date}) — ${status}${details ? ` | ${details}` : ''}`)
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

  return { type: 'client', summary: lines.join('\n') }
}

async function loadRecipeEntity(
  supabase: any,
  tenantId: string,
  recipeId: string
): Promise<PageEntityContext | undefined> {
  const [recipeResult, ingredientsResult] = await Promise.all([
    supabase
      .from('recipes')
      .select(
        `id, name, category, description, method, yield_description,
         prep_time_minutes, cook_time_minutes, total_time_minutes,
         dietary_tags, notes, adaptations, times_cooked, last_cooked_at`
      )
      .eq('id', recipeId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('recipe_ingredients')
      .select('quantity, unit, preparation_notes, ingredient:ingredients(name, allergen_flags)')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true })
      .limit(30),
  ])

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

  return { type: 'recipe', summary: lines.join('\n') }
}

async function loadInquiryEntity(
  supabase: any,
  tenantId: string,
  inquiryId: string
): Promise<PageEntityContext | undefined> {
  const [inquiryResult, messagesResult] = await Promise.all([
    supabase
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
    supabase
      .from('inquiry_messages' as any)
      .select('channel, direction, status, subject, body, sent_at, created_at')
      .eq('inquiry_id', inquiryId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(15),
  ])

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
        `Response Coaching: This is a HOT lead — prioritize. Respond within 4-24 hours for best conversion.`
      )
    } else if (tier === 'WARM') {
      lines.push(
        `Response Coaching: WARM lead — respond within 24 hours. Good potential, needs timely follow-up.`
      )
    } else if (tier === 'COLD') {
      lines.push(
        `Response Coaching: COLD lead — respond within 72 hours. Lower priority, but still worth a reply.`
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
      `\nMESSAGE THREAD (${messages.length} messages — ${inbound} from client, ${outbound} from chef):`
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

  return { type: 'inquiry', summary: lines.join('\n') }
}

async function loadMenuEntity(
  supabase: any,
  tenantId: string,
  menuId: string
): Promise<PageEntityContext | undefined> {
  const [menuResult, dishesResult] = await Promise.all([
    supabase
      .from('menus')
      .select(
        `id, name, description, status, cuisine_type, service_style,
         target_guest_count, is_template, notes`
      )
      .eq('id', menuId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
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

  const data = menuResult.data
  if (!data) return undefined

  const lines: string[] = []
  lines.push(`MENU: ${data.name}`)
  lines.push(`Status: ${data.status}`)
  if (data.cuisine_type) lines.push(`Cuisine: ${data.cuisine_type}`)
  if (data.service_style) lines.push(`Style: ${data.service_style.replace(/_/g, ' ')}`)
  if (data.target_guest_count) lines.push(`Target guests: ${data.target_guest_count}`)
  if (data.is_template) lines.push(`(Template — reusable)`)
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

  return { type: 'menu', summary: lines.join('\n') }
}

// ─── Tier 4: Message-Aware Entity Resolution ────────────────────────────────
// Scans the user's message for client names, event occasions, and recipe names.
// If a match is found in the DB, loads the full entity so Remy can answer
// questions about any entity mentioned by name — regardless of what page
// the chef is on.

export async function resolveMessageEntities(message: string): Promise<PageEntityContext[]> {
  if (!message || message.length < 3) return []

  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Normalize message for matching
  const msgLower = message.toLowerCase()

  // Run all searches in parallel — each is cheap (indexed ilike, limit 3)
  const [clientHits, eventHits, recipeHits, inquiryHits] = await Promise.all([
    findMentionedClients(supabase, tenantId, msgLower),
    findMentionedEvents(supabase, tenantId, msgLower),
    findMentionedRecipes(supabase, tenantId, msgLower),
    findMentionedInquiries(supabase, tenantId, msgLower),
  ])

  const results: PageEntityContext[] = []

  // Load full details for matched entities (limit to 3 total to keep prompt lean)
  for (const client of clientHits.slice(0, 2)) {
    const ctx = await loadClientEntity(supabase, tenantId, client.id)
    if (ctx) results.push(ctx)
  }
  for (const event of eventHits.slice(0, 2)) {
    const ctx = await loadEventEntity(supabase, tenantId, event.id)
    if (ctx) results.push(ctx)
  }
  for (const recipe of recipeHits.slice(0, 1)) {
    const ctx = await loadRecipeEntity(supabase, tenantId, recipe.id)
    if (ctx) results.push(ctx)
  }
  for (const inquiry of inquiryHits.slice(0, 1)) {
    const ctx = await loadInquiryEntity(supabase, tenantId, inquiry.id)
    if (ctx) results.push(ctx)
  }

  return results.slice(0, 3) // Hard cap: 3 entities max
}

async function findMentionedClients(
  supabase: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string; full_name: string }>> {
  // Get all client names for this tenant (cached in Tier 2, so this is usually fast)
  const { data } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .limit(200)

  if (!data) return []

  // Match: check if any client's first name, last name, or full name appears in the message
  return data.filter((c: any) => {
    if (!c.full_name) return false
    const fullLower = c.full_name.toLowerCase()
    // Full name match
    if (msgLower.includes(fullLower)) return true
    // Last name match (more unique, less likely to false-positive)
    const parts = fullLower.split(/\s+/)
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      // Only match last names 3+ chars to avoid matching "Mr" or "Li" etc.
      if (lastName.length >= 3 && msgLower.includes(lastName)) return true
    }
    return false
  })
}

async function findMentionedEvents(
  supabase: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  // Get recent events with their occasion and client name
  const { data } = await supabase
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
  supabase: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  const { data } = await supabase
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
  supabase: any,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  // Only search if inquiry-related keywords are in the message
  const inquiryKeywords = ['inquiry', 'enquiry', 'lead', 'prospect', 'follow up', 'follow-up']
  if (!inquiryKeywords.some((k) => msgLower.includes(k))) return []

  const { data } = await supabase
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
