'use server'

// Ask Remy - Orchestrator
// PRIVACY: Chef commands may contain client PII - all processing via local Ollama only.
// DRAFT-FIRST: Tier 2 results are drafts. Nothing is sent or saved until chef approves.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { parseCommandIntent } from '@/lib/ai/command-intent-parser'
import { getAgentAction, isAgentAction } from '@/lib/ai/agent-registry'
import { ensureAgentActionsRegistered } from '@/lib/ai/agent-actions'
import { areDocumentDraftsAllowedForTenant } from '@/lib/ai/privacy-internal'
import { isAiDocumentDraftTaskType } from '@/lib/ai/private-runtime-policy'
import { searchClientsByName, getClients, getClientById } from '@/lib/clients/actions'
import { getEvents, getEventById } from '@/lib/events/actions'
import { getInquiries, getInquiryById } from '@/lib/inquiries/actions'
import { getRecipes } from '@/lib/recipes/actions'
import { getMenus } from '@/lib/menus/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { checkCalendarAvailability } from '@/lib/scheduling/calendar-sync'
import { generateFollowUpDraft } from '@/lib/ai/followup-draft'

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}
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
import type {
  CommandRun,
  CommandPlan,
  TaskResult,
  PlannedTask,
  ApprovalTier,
} from '@/lib/ai/command-types'
import { getAvailableActions } from '@/lib/ai/remy-action-filter'
import { startRemyActionAudit, finishRemyActionAudit } from '@/lib/ai/remy-action-audit-actions'
import {
  resolveRemyApprovalDecision,
  type RemyApprovalPolicyMap,
} from '@/lib/ai/remy-approval-policy-core'
import { getTenantRemyApprovalPolicyMap } from '@/lib/ai/remy-approval-policy-actions'
import { validateSignificantApprovalPhrase } from '@/lib/ai/remy-significant-approval'
import { executeRegisteredRemyReadTask } from '@/lib/ai/remy-read-task-registry'
import { normalizeRemyNavigationRoute } from '@/lib/ai/remy-navigation'

// ─── Individual Task Executors ────────────────────────────────────────────────

async function executeClientSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  const clients = await searchClientsByName(query)
  if (clients.length === 0) return { clients: [] }

  // Enrich with dietary/allergy data (safety-critical)
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const clientIds = clients.map((c) => c.id)

  const [{ data: enriched }, { data: eventCounts }] = await Promise.all([
    db
      .from('clients')
      .select('id, dietary_restrictions, allergies, vibe_notes, loyalty_tier, loyalty_points')
      .eq('tenant_id', tenantId)
      .in('id', clientIds),
    // Frequency-based resolution: rank by event count when multiple clients match
    clients.length > 1
      ? db.from('events').select('client_id').eq('tenant_id', tenantId).in('client_id', clientIds)
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
  // the match is genuinely ambiguous - flag it so dependent tasks can hold for clarification
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
        : `Found ${enrichedClients.length} clients matching "${query}". Ranked by event frequency - "${enrichedClients[0].name}" has ${enrichedClients[0].eventCount} events.`,
    }),
  }
}

async function executeCalendarAvailability(inputs: Record<string, unknown>) {
  const date = String(inputs.date ?? '')
  const result = await checkCalendarAvailability(date)
  return { date, ...result }
}

async function executeEventListUpcoming(tenantId: string) {
  const db: any = createServerClient()
  const { data } = await db
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
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled")')

  const { data: ledger } = await db
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
      `Multiple clients match - ${searchResult.disambiguationNote ?? 'which one did you mean?'}`
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
  const db: any = createServerClient()
  const { data: client } = await db
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
  const db: any = createServerClient()

  // Search events by occasion
  const { data } = await db
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

// FC-G41: Event readiness via deterministic completion contract engine
async function executeEventReadiness(inputs: Record<string, unknown>, tenantId: string) {
  const eventName = String(inputs.eventName ?? '')
  const db: any = createServerClient()

  // Find event by occasion or client name
  const { data } = await db
    .from('events')
    .select('id, occasion, event_date, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .or(`occasion.ilike.%${eventName}%,clients.full_name.ilike.%${eventName}%`)
    .order('event_date', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return { found: false, query: eventName }

  const event = data[0] as Record<string, unknown>
  const eventId = event.id as string

  try {
    const { evaluateCompletion } = await import('@/lib/completion/engine')
    const result = await evaluateCompletion('event', eventId, tenantId, { shallow: false })

    if (!result) {
      return {
        found: true,
        eventName: event.occasion,
        readiness: 'Unable to evaluate',
      }
    }

    return {
      found: true,
      eventName: event.occasion,
      eventDate: event.event_date,
      clientName:
        ((event.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      readiness: {
        score: result.score,
        status: result.status,
        missingItems:
          result.missingRequirements?.map((r) => ({
            label: r.label,
            category: r.category,
            blocking: r.blocking,
          })) ?? [],
        nextAction: result.nextAction,
      },
    }
  } catch (err) {
    console.error('[Remy/event.readiness] Completion eval failed:', err)
    return {
      found: true,
      eventName: event.occasion,
      readiness: 'Evaluation failed; try checking the event page directly.',
    }
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
  const db: any = createServerClient()

  const { data } = await db
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
  const startDateStr = String(inputs.startDate ?? localDateISO(new Date()))
  // Parse YYYY-MM-DD as local date (not UTC) by using year/month/day parts
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const startDate = new Date(sy, (sm || 1) - 1, sd || 1)

  // Check up to 30 days from start
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i
    )
    const dateStr = localDateISO(checkDate)
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
        "Web recipe searches are not allowed - recipes are the chef's creative domain. Use recipe.search to look through your existing recipe book instead.",
    }
  }
  const limit = Number(inputs.limit) || 5
  const results = await searchWeb(query, limit)
  return { query, results }
}

async function executeWebRead(inputs: Record<string, unknown>) {
  const url = String(inputs.url ?? '')
  if (!url.startsWith('http')) {
    throw new Error('Invalid URL - must start with http:// or https://')
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
      // Circular or unresolvable deps - add remaining as held
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
  const route = normalizeRemyNavigationRoute(inputs.route)
  if (!route) {
    throw new Error('I could not find a safe ChefFlow route for that destination.')
  }
  return { route, navigated: true }
}

type CoreTaskContext = {
  tenantId: string
  resolvedDeps: Record<string, unknown>
}

type CoreTaskExecutor = (task: PlannedTask, ctx: CoreTaskContext) => Promise<unknown> | unknown

const CORE_COMMAND_TASK_EXECUTORS: Record<string, CoreTaskExecutor> = {
  'client.search': (task) => executeClientSearch(task.inputs),
  'calendar.availability': (task) => executeCalendarAvailability(task.inputs),
  'event.list_upcoming': (_task, ctx) => executeEventListUpcoming(ctx.tenantId),
  'finance.summary': (_task, ctx) => executeFinanceSummary(ctx.tenantId),
  'email.followup': (task, ctx) => executeEmailFollowup(task.inputs, ctx.resolvedDeps),
  'event.create_draft': (task) => executeEventCreateDraft(task.inputs),
  'client.count': async () => {
    const allForCount = await getClients()
    return { totalClients: (allForCount ?? []).length }
  },
  'client.list_recent': (task) => executeClientListRecent(task.inputs),
  'client.details': (task) => executeClientDetails(task.inputs),
  'event.details': (task, ctx) => executeEventDetails(task.inputs, ctx.tenantId),
  'event.readiness': (task, ctx) => executeEventReadiness(task.inputs, ctx.tenantId),
  'event.list_by_status': (task, ctx) => executeEventListByStatus(task.inputs, ctx.tenantId),
  'inquiry.list_open': () => executeInquiryListOpen(),
  'inquiry.details': (task) => executeInquiryDetails(task.inputs),
  'finance.monthly_snapshot': () => executeFinanceMonthlySnapshot(),
  'recipe.search': (task) => executeRecipeSearch(task.inputs),
  'menu.list': (task) => executeMenuList(task.inputs),
  'scheduling.next_available': (task) => executeSchedulingNextAvailable(task.inputs),
  'web.search': (task) => executeWebSearch(task.inputs),
  'web.read': (task) => executeWebRead(task.inputs),
  'dietary.check': (task) => executeDietaryCheck(task.inputs),
  'client.dietary': (task) => executeDietaryCheck(task.inputs),
  'client.dietary_restrictions': (task) => executeDietaryCheck(task.inputs),
  'chef.favorite_chefs': () => executeFavoriteChefs(),
  'chef.culinary_profile': () => executeCulinaryProfile(),
  'prep.timeline': (task) => executePrepTimeline(task.inputs),
  'nudge.list': () => executeNudgeList(),
  'grocery.quick_add': (task) => executeGroceryQuickAdd(task.inputs),
  'document.search': (task) => executeDocumentSearch(task.inputs),
  'document.list_folders': () => executeListFolders(),
  'document.create_folder': (task) => executeCreateFolder(task.inputs),
  'email.generic': (task) => executeEmailGeneric(task.inputs),
  'email.recent': (task) => executeEmailRecent(task.inputs),
  'email.search': (task) => executeEmailSearch(task.inputs),
  'email.thread': (task) => executeEmailThread(task.inputs),
  'email.inbox_summary': () => executeEmailInboxSummary(),
  'email.status': () => executeEmailInboxSummary(),
  'email.draft_reply': (task) => executeEmailDraftReply(task.inputs),
  'draft.thank_you': (task) => executeDraftThankYou(task.inputs),
  'draft.referral_request': (task) => executeDraftReferralRequest(task.inputs),
  'draft.testimonial_request': (task) => executeDraftTestimonialRequest(task.inputs),
  'draft.quote_cover_letter': (task) => executeDraftQuoteCoverLetter(task.inputs),
  'draft.decline_response': (task) => executeDraftDeclineResponse(task.inputs),
  'draft.cancellation_response': (task) => executeDraftCancellationResponse(task.inputs),
  'draft.payment_reminder': (task) => executeDraftPaymentReminder(task.inputs),
  'draft.re_engagement': (task) => executeDraftReEngagement(task.inputs),
  'draft.milestone_recognition': (task) => executeDraftMilestoneRecognition(task.inputs),
  'draft.food_safety_incident': (task) => executeDraftFoodSafetyIncident(task.inputs),
  'draft.confirmation': (task) => executeDraftConfirmation(task.inputs),
  'ops.portion_calc': (task) => executePortionCalc(task.inputs),
  'ops.packing_list': (task) => executePackingList(task.inputs),
  'ops.cross_contamination': (task) => executeCrossContamination(task.inputs),
  'analytics.break_even': (task) => executeBreakEven(task.inputs),
  'analytics.client_ltv': (task) => executeClientLTV(task.inputs),
  'analytics.recipe_cost': (task) => executeRecipeCost(task.inputs),
  'client.event_recap': (task) => executeEventRecap(task.inputs),
  'client.menu_explanation': (task) => executeMenuExplanation(task.inputs),
  'nav.go': (task) => executeNavGo(task.inputs),
  'navigation.goto': (task) => executeNavGo(task.inputs),
}

async function executeCoreCommandTask(
  task: PlannedTask,
  ctx: CoreTaskContext
): Promise<{ handled: true; data: unknown } | { handled: false }> {
  const executor = CORE_COMMAND_TASK_EXECUTORS[task.taskType]
  if (!executor) return { handled: false }
  return { handled: true, data: await executor(task, ctx) }
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

  if (isAiDocumentDraftTaskType(task.taskType)) {
    const allowed = await areDocumentDraftsAllowedForTenant(tenantId)
    if (!allowed) {
      return {
        taskId: task.id,
        taskType: task.taskType,
        tier: task.tier,
        name,
        status: 'held',
        holdReason: 'Document and email drafts are turned off in AI & Privacy.',
      }
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
    // The task registries below handle supported tasks; unknown types are held.
    // This check blocks explicitly dangerous patterns before they reach execution.
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

    const registeredReadTask = await executeRegisteredRemyReadTask(task, { tenantId })
    if (registeredReadTask.handled) {
      data = registeredReadTask.data
    } else {
      const coreTask = await executeCoreCommandTask(task, {
        tenantId,
        resolvedDeps,
      })
      if (coreTask.handled) {
        data = coreTask.data
      } else {
        return {
          taskId: task.id,
          taskType: task.taskType,
          tier: 3,
          name: task.taskType,
          status: 'held',
          holdReason: `"${task.taskType}" is not currently supported. Try rephrasing your request.`,
        }
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

// ─── Deterministic Command Router ─────────────────────────────────────────────
// Regex -> PlannedTask mapping for the most common commands.
// Bypasses the LLM intent parser entirely, saving 2-5 seconds.
// Returns null when no pattern matches (falls through to LLM parser).

// Helper: extract a proper-noun name from the message
function extractName(text: string): string | null {
  // "for Sarah Johnson", "about the Millers", "client John", "find Sarah"
  const patterns = [
    /(?:for|about|client|find|check|show)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    /^(?:find|check|show|look up|search)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1].replace(/(?:'s|'s)\s*$/i, '')
  }
  return null
}

// Helper: extract a date reference from the message
function extractDateRef(text: string): string | null {
  // ISO dates, "March 15", "next Saturday", "tomorrow", "this weekend"
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch) return isoMatch[1]

  const monthMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  )
  if (monthMatch) return `${monthMatch[1]} ${monthMatch[2]}`

  const relMatch = text.match(
    /\b(today|tomorrow|tonight|this weekend|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week))\b/i
  )
  if (relMatch) return relMatch[1]

  return null
}

function tryDeterministicCommandPlan(input: string): CommandPlan | null {
  const trimmed = input.trim()

  const explainRadarMatch = trimmed.match(
    /^(?:explain|why did you show|why is)\s+(?:the\s+)?(?:radar\s+)?(?:item|alert|match)\s+([a-zA-Z0-9:_-]+)/i
  )
  if (explainRadarMatch?.[1]) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'radar.explain_item',
          tier: 1,
          confidence: 1.0,
          inputs: { itemId: explainRadarMatch[1] },
          dependsOn: [],
        },
      ],
    }
  }

  if (
    /\b(?:culinary radar|latest culinary news|food safety alerts?|recalls?|outbreaks?|wck|world central kitchen|chef opportunities|farmers?\s+markets?|farmer'?s\s+markets?|local\s+markets?|local\s+sourcing|where\s+to\s+source|source\s+local|radar source trust|source health|source freshness|sustainability|sustainable|waste reduction|packaging)\b/i.test(
      trimmed
    )
  ) {
    const taskType = /\b(?:recalls?|outbreaks?|safety)\b/i.test(trimmed)
      ? 'radar.safety'
      : /\b(?:source trust|source health|source freshness|freshness|current|trustworthy)\b/i.test(
            trimmed
          )
        ? 'radar.source_trust'
      : /\b(?:farmers?\s+markets?|farmer'?s\s+markets?|local\s+markets?|local\s+sourcing|where\s+to\s+source|source\s+local)\b/i.test(
            trimmed
          )
        ? 'radar.local_markets'
        : /\b(?:sustainability|sustainable|waste reduction|packaging|compost|food waste)\b/i.test(
              trimmed
            )
          ? 'radar.sustainability'
      : /\b(?:wck|world central kitchen|opportunit|charity|relief|volunteer|career)\b/i.test(
            trimmed
          )
        ? 'radar.opportunities'
        : 'radar.latest'

    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType,
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 1. Event listing: "upcoming events", "my events", "what events do I have"
  if (
    /^(?:upcoming|my|next|show|list)\s+events?\b/i.test(trimmed) ||
    /^what\s+events?\s+(?:do i|have i)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'event.list_upcoming',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 2. Client search: "find Sarah", "look up Johnson", "client details for Sarah"
  if (/^(?:find|look up|search|pull up|get|show|check)\s+(?:client\s+)?/i.test(trimmed)) {
    const name = extractName(trimmed)
    if (name) {
      return {
        rawInput: input,
        overallConfidence: 0.95,
        tasks: [
          {
            id: 't1',
            taskType: 'client.search',
            tier: 1,
            confidence: 0.95,
            inputs: { query: name },
            dependsOn: [],
          },
        ],
      }
    }
  }

  // 3. Availability check: "is March 15 free", "check if Saturday is available", "am I free tomorrow"
  if (
    /\b(?:free|available|open|blocked|booked)\b/i.test(trimmed) ||
    /^(?:check|is)\b.*\b(?:availab|free)\b/i.test(trimmed)
  ) {
    const date = extractDateRef(trimmed)
    if (date) {
      return {
        rawInput: input,
        overallConfidence: 0.95,
        tasks: [
          {
            id: 't1',
            taskType: 'calendar.availability',
            tier: 1,
            confidence: 0.95,
            inputs: { date },
            dependsOn: [],
          },
        ],
      }
    }
  }

  // 4. Financial summary: "revenue", "how much did I make", "financial summary", "my numbers"
  if (
    /^(?:revenue|financial summary|my numbers|how much (?:did i|have i) (?:make|earn))/i.test(
      trimmed
    ) ||
    /^(?:show|get)\s+(?:my\s+)?(?:revenue|financials?|numbers)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'finance.summary',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 5. Recipe search: "search recipes for pasta", "find my risotto recipe"
  if (
    /^(?:search|find|look up)\s+(?:my\s+)?(?:recipes?\s+(?:for|with|about)\s+|)(.+)\s+recipes?\s*$/i.test(
      trimmed
    ) ||
    /^(?:search|find|look up)\s+(?:my\s+)?recipes?\s+(?:for|with|about)\s+(.+)/i.test(trimmed)
  ) {
    const queryMatch = trimmed.match(
      /(?:recipes?\s+(?:for|with|about)\s+|(?:for|with|about)\s+(.+)\s+recipes?)(.+)?/i
    )
    const query =
      queryMatch?.[1]?.trim() ||
      queryMatch?.[2]?.trim() ||
      trimmed.replace(/^(?:search|find|look up)\s+(?:my\s+)?recipes?\s*/i, '').trim()
    if (query) {
      return {
        rawInput: input,
        overallConfidence: 0.95,
        tasks: [
          {
            id: 't1',
            taskType: 'recipe.search',
            tier: 1,
            confidence: 0.95,
            inputs: { query },
            dependsOn: [],
          },
        ],
      }
    }
  }

  // 6. Open inquiries: "pending inquiries", "open leads", "show inquiries"
  if (/^(?:pending|open|new|show|list|my)\s+(?:inquir|leads?)\b/i.test(trimmed)) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'inquiry.list_open',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 7. Draft follow-up: "draft a follow-up for Sarah", "write a thank you for the Henderson dinner"
  if (/^(?:draft|write)\s+(?:a\s+)?(?:follow[- ]?up|thank[- ]?you|thank you)\b/i.test(trimmed)) {
    const name = extractName(trimmed)
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: name ? 'draft.thank_you' : 'email.followup',
          tier: 1,
          confidence: 0.9,
          inputs: name ? { clientName: name } : { text: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 8. Email drafts: "draft an email", "write an email to Sarah"
  if (/^(?:draft|write)\s+(?:a\s+|an\s+)?(?:email|message|note)\b/i.test(trimmed)) {
    const name = extractName(trimmed)
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'email.generic',
          tier: 1,
          confidence: 0.9,
          inputs: { text: trimmed, ...(name ? { clientName: name } : {}) },
          dependsOn: [],
        },
      ],
    }
  }

  // 9. Morning briefing: "brief me", "morning briefing", "what's today look like"
  if (
    /^(?:brief me|morning briefing|debrief me|daily brief)\b/i.test(trimmed) ||
    /^what'?s?\s+(?:today|my day)\s+look\s+like/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'briefing.morning',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 10. Create event: "create an event for Saturday", "make a booking for Sarah"
  if (
    /^(?:create|make|add|set up|book)\s+(?:a\s+|an\s+)?(?:event|booking|dinner|party)\b/i.test(
      trimmed
    )
  ) {
    const name = extractName(trimmed)
    const date = extractDateRef(trimmed)
    return {
      rawInput: input,
      overallConfidence: 0.85,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_event',
          tier: 2,
          confidence: 0.85,
          inputs: {
            text: trimmed,
            ...(name ? { clientName: name } : {}),
            ...(date ? { date } : {}),
          },
          dependsOn: [],
        },
      ],
    }
  }

  // 11. Email inbox: "show my inbox", "recent emails", "email summary"
  if (
    /^(?:show\s+)?(?:my\s+)?(?:inbox|recent emails?|email inbox|email summary)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'email.inbox_summary',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 12. Staff availability: "who's available", "staff availability", "show available staff"
  if (
    /^(?:who'?s?\s+available|staff\s+availab|show\s+(?:available\s+)?staff|available\s+staff)\b/i.test(
      trimmed
    )
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'staff.availability',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 13. Web search: "search the web for...", "google...", "look up online..."
  if (/^(?:search the web|google|look up online|search online)\s+(?:for\s+)?(.+)/i.test(trimmed)) {
    const queryMatch = trimmed.match(
      /^(?:search the web|google|look up online|search online)\s+(?:for\s+)?(.+)/i
    )
    if (queryMatch?.[1]) {
      return {
        rawInput: input,
        overallConfidence: 1.0,
        tasks: [
          {
            id: 't1',
            taskType: 'web.search',
            tier: 1,
            confidence: 1.0,
            inputs: { query: queryMatch[1].trim() },
            dependsOn: [],
          },
        ],
      }
    }
  }

  // 14. P&L / profit and loss: "P&L", "profit and loss", "show my P&L"
  if (/^(?:show\s+)?(?:my\s+)?(?:p\s*&?\s*l|profit\s+(?:and|&)\s+loss)\b/i.test(trimmed)) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        { id: 't1', taskType: 'finance.pnl', tier: 1, confidence: 1.0, inputs: {}, dependsOn: [] },
      ],
    }
  }

  // 15. Packing list: "packing list for Saturday", "what do I need to pack"
  if (/^(?:packing list|what do i need to pack|generate.*packing list)\b/i.test(trimmed)) {
    const name = extractName(trimmed)
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'ops.packing_list',
          tier: 1,
          confidence: 0.9,
          inputs: { text: trimmed, ...(name ? { clientName: name } : {}) },
          dependsOn: [],
        },
      ],
    }
  }

  // 16. Complete todo: "mark the shopping done", "complete the Whole Foods todo"
  if (
    /^(?:mark|complete|finish|done|check off)\b.*\b(?:todo|task|shopping|prep|order)\b/i.test(
      trimmed
    ) ||
    /\b(?:todo|task)\b.*\b(?:done|complete|finished)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.complete_todo',
          tier: 2,
          confidence: 0.9,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 17. Start/stop timer: "start prep", "stop the clock", "start shopping for Henderson"
  if (
    /^(?:start|begin|kick off)\s+(?:the\s+)?(?:timer|clock|prep|shopping|packing|driving|execution|service)\b/i.test(
      trimmed
    )
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.start_timer',
          tier: 2,
          confidence: 0.95,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }
  if (
    /^(?:stop|end|finish)\s+(?:the\s+)?(?:timer|clock|prep|shopping|packing|driving|execution|service)\b/i.test(
      trimmed
    )
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.95,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.stop_timer',
          tier: 2,
          confidence: 0.95,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 18. Food budget: "set food budget at $800", "food cost budget $500 for Henderson"
  if (/\b(?:food\s+(?:cost\s+)?budget|set.*budget.*\$)\b/i.test(trimmed)) {
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.set_food_budget',
          tier: 2,
          confidence: 0.9,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 19. Create goal: "set a goal", "goal to book 10 events"
  if (
    /^(?:set|create|add|make)\s+(?:a\s+)?(?:goal|target|objective)\b/i.test(trimmed) ||
    /\bgoal\s+to\s+/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.create_goal',
          tier: 2,
          confidence: 0.9,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 20. Shopping list: "shopping list for spring menu", "what do I need to buy"
  if (
    /^(?:shopping list|grocery list|what do i need to buy|ingredients? list)\b/i.test(trimmed) ||
    /\b(?:shopping|grocery)\s+list\s+for\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.shopping_list',
          tier: 2,
          confidence: 0.9,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 21. Recipe dietary check: "is my risotto gluten-free", "check risotto for celiac"
  if (
    /\b(?:is|check|can)\b.*\b(?:recipe|dish|risotto|pasta|soup|salad)\b.*\b(?:safe|gluten|celiac|vegan|allerg|dairy|nut|kosher|halal)\b/i.test(
      trimmed
    ) ||
    /\b(?:dietary|allergen)\s+(?:check|analysis)\b.*\b(?:recipe|dish)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.recipe_dietary_check',
          tier: 2,
          confidence: 0.9,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 22. Mark follow-up: "mark Henderson follow-up done", "follow-up sent for Smith"
  if (
    /\b(?:follow[- ]?up)\b.*\b(?:done|sent|complete|mark)\b/i.test(trimmed) ||
    /^mark\b.*\bfollow[- ]?up\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 0.9,
      tasks: [
        {
          id: 't1',
          taskType: 'agent.mark_followup',
          tier: 2,
          confidence: 0.9,
          inputs: { description: trimmed },
          dependsOn: [],
        },
      ],
    }
  }

  // 23. Today's plan / daily ops: "what's on my plate", "what should I do today"
  if (
    /^(?:what(?:'s| is) on my plate|what should i do|daily plan|today's plan|what do i need to)\b/i.test(
      trimmed
    ) ||
    /^(?:brief|brief me|morning briefing|daily briefing)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'briefing.morning',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 24. Goals: "show my goals", "goal progress", "how are my goals"
  if (
    /^(?:show|list|check|how are)\s+(?:my\s+)?goals?\b/i.test(trimmed) ||
    /^goal\s+(?:progress|status|dashboard)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'goals.dashboard',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 25. Tasks/todos: "show my tasks", "what's on my list", "overdue tasks"
  if (
    /^(?:show|list|my)\s+(?:tasks?|todos?)\b/i.test(trimmed) ||
    /^(?:overdue|pending)\s+tasks?\b/i.test(trimmed)
  ) {
    const isOverdue = /overdue/i.test(trimmed)
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: isOverdue ? 'tasks.overdue' : 'tasks.list',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 26. Staff availability: "who's available", "available staff"
  if (/^(?:who(?:'s| is) available|available staff|staff availability)\b/i.test(trimmed)) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'staff.availability',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 27. Nudges/alerts: "what needs attention", "any alerts", "pending actions"
  if (
    /^(?:what needs attention|any alerts|pending actions|what(?:'s| is) urgent)\b/i.test(trimmed) ||
    /^(?:show|list)\s+(?:my\s+)?(?:nudges?|alerts?)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        { id: 't1', taskType: 'nudge.list', tier: 1, confidence: 1.0, inputs: {}, dependsOn: [] },
      ],
    }
  }

  // 28. Inbox: "show my inbox", "any new emails", "email summary"
  if (
    /^(?:show|check)\s+(?:my\s+)?(?:inbox|emails?)\b/i.test(trimmed) ||
    /^(?:any new|recent)\s+emails?\b/i.test(trimmed) ||
    /^email\s+(?:summary|status)\b/i.test(trimmed)
  ) {
    return {
      rawInput: input,
      overallConfidence: 1.0,
      tasks: [
        {
          id: 't1',
          taskType: 'email.inbox_summary',
          tier: 1,
          confidence: 1.0,
          inputs: {},
          dependsOn: [],
        },
      ],
    }
  }

  // 29. Navigation: "go to events", "take me to clients", "open recipes"
  if (/^(?:go to|take me to|open|navigate to)\s+(.+)/i.test(trimmed)) {
    const target = trimmed.match(/^(?:go to|take me to|open|navigate to)\s+(.+)/i)?.[1]?.trim()
    if (target) {
      return {
        rawInput: input,
        overallConfidence: 1.0,
        tasks: [
          {
            id: 't1',
            taskType: 'nav.go',
            tier: 1,
            confidence: 1.0,
            inputs: { route: target },
            dependsOn: [],
          },
        ],
      }
    }
  }

  return null // No match - fall through to LLM parser
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

    // ─── Deterministic Command Router (Formula > AI) ──────────────────────────
    // Bypass the LLM intent parser for common command patterns.
    // Each pattern maps directly to a PlannedTask, saving 2-5s of Ollama latency.
    const fastPlan = tryDeterministicCommandPlan(rawInput)
    if (fastPlan) {
      // Focus Mode enforcement: verify fast-path tasks are allowed
      const fastTaskTypes = fastPlan.tasks.map((t) => t.taskType)
      const allowed = await getAvailableActions(fastTaskTypes)
      if (allowed.length === 0) {
        // All tasks blocked by Focus Mode, fall through to LLM parser
        // (which will also be filtered, giving user feedback)
      } else {
        // Filter to only allowed tasks
        fastPlan.tasks = fastPlan.tasks.filter((t) => allowed.includes(t.taskType))
        const rounds = buildExecutionRounds(fastPlan.tasks)
        const allResults: TaskResult[] = []
        const resultsByType = new Map<string, unknown>()
        for (const round of rounds) {
          const roundResults = await Promise.all(
            round.map((task) => {
              const resolvedDeps: Record<string, unknown> = {}
              for (const depId of task.dependsOn) {
                const depTask = fastPlan.tasks.find((t) => t.id === depId)
                if (depTask && resultsByType.has(depTask.taskType)) {
                  resolvedDeps[depTask.taskType] = resultsByType.get(depTask.taskType)
                }
              }
              return executeSingleTask(task, resolvedDeps, tenantId, approvalPolicyMap)
            })
          )
          for (const result of roundResults) {
            allResults.push(result)
            if (result.data !== undefined) resultsByType.set(result.taskType, result.data)
          }
        }
        return { runId, rawInput, startedAt, results: allResults }
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
          const db: any = createServerClient()
          const draft = d.draft
          try {
            const { data: event, error } = await db
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
