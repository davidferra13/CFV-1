'use server'

// Remy — Context Loader
// PRIVACY: Loads chef business context for Remy's system prompt.
// Contains client names, event details, and financial data — must stay local.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { RemyContext } from '@/lib/ai/remy-types'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'

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
  >
  expiresAt: number
}

const contextCache = new Map<string, CachedContext>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Public Loader ──────────────────────────────────────────────────────────

export async function loadRemyContext(currentPage?: string): Promise<RemyContext> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

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
    dailyPlan: dailyPlan ?? undefined,
  }
}

// ─── Tier 1: Chef Profile ───────────────────────────────────────────────────

async function loadChefProfile(supabase: ReturnType<typeof createServerClient>, tenantId: string) {
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

async function loadQuickCounts(supabase: ReturnType<typeof createServerClient>, tenantId: string) {
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

async function loadDetailedContext(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string
) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [eventsResult, clientsResult, revenueResult, quotesResult] = await Promise.all([
    // Upcoming events (next 7 days, limit 10)
    supabase
      .from('events')
      .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', now.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(10),

    // Recent clients (limit 5)
    supabase
      .from('clients')
      .select('id, full_name')
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
  ])

  const monthRevenueCents = (revenueResult.data ?? []).reduce(
    (sum, entry) => sum + ((entry as { amount_cents: number }).amount_cents ?? 0),
    0
  )

  return {
    upcomingEvents: (eventsResult.data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      occasion: e.occasion as string | null,
      date: e.event_date as string | null,
      status: e.status as string,
      clientName: ((e.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      guestCount: e.guest_count as number | null,
    })),
    recentClients: (clientsResult.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: (c.full_name as string) ?? 'Unknown',
    })),
    monthRevenueCents,
    pendingQuoteCount: quotesResult.count ?? 0,
  }
}
