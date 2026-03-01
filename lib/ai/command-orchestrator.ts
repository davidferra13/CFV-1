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
} from '@/lib/ai/draft-actions'
import type { CommandRun, TaskResult, PlannedTask, ApprovalTier } from '@/lib/ai/command-types'

// ─── Individual Task Executors ────────────────────────────────────────────────

async function executeClientSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  const clients = await searchClientsByName(query)
  if (clients.length === 0) return { clients: [] }

  // Enrich with dietary/allergy data (safety-critical)
  const user = await requireChef()
  const supabase: any = createServerClient()
  const clientIds = clients.map((c) => c.id)
  const { data: enriched } = await supabase
    .from('clients')
    .select('id, dietary_restrictions, allergies, vibe_notes, loyalty_tier, loyalty_points')
    .eq('tenant_id', user.tenantId!)
    .in('id', clientIds)

  const enrichedMap = new Map(
    ((enriched ?? []) as Array<Record<string, unknown>>).map((e) => [e.id as string, e])
  )

  return {
    clients: clients.map((c) => {
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
      }
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
    | { clients: Array<{ id: string; name: string }> }
    | undefined
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

  const client = await getClientById(matches[0].id)
  if (!client) return { found: false, clientName }

  return {
    found: true,
    client: {
      id: (client as Record<string, unknown>).id,
      name: (client as Record<string, unknown>).full_name ?? 'Unknown',
      email: (client as Record<string, unknown>).email ?? '',
      phone: (client as Record<string, unknown>).phone ?? '',
      status: (client as Record<string, unknown>).status ?? '',
      dietaryRestrictions: (client as Record<string, unknown>).dietary_restrictions ?? '',
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
    inquiries: (inquiries ?? []).slice(0, 10).map((i: Record<string, unknown>) => ({
      id: i.id as string,
      status: i.status as string,
      eventType: i.event_type as string | null,
      eventDate: i.event_date as string | null,
      guestCount: i.guest_count as number | null,
      clientName: ((i.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
    })),
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
  return generateThankYouDraft(clientName)
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

  // Get loyalty data
  const { data: loyalty } = await supabase
    .from('loyalty_accounts')
    .select('tier, points_balance, lifetime_points')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .single()

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

  // Get menu items linked to this event
  const { data: menuLinks } = await supabase
    .from('event_menus')
    .select('menu:menus(id, name, dishes:menu_dishes(name, description, dietary_tags))')
    .eq('event_id', event.id)

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
  tenantId: string
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

      // Restricted actions → always held
      if (agentAction.safety === 'restricted') {
        const { preview } = await agentAction.executor(task.inputs, ctx)
        return {
          taskId: task.id,
          taskType: task.taskType,
          tier: 3,
          name: agentAction.name,
          status: 'held',
          holdReason:
            preview.fields.find((f) => f.label === 'Why')?.value ?? 'This action is restricted.',
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

    // ─── Legacy task types (read-only + existing drafts) ────────────────
    // Fail-fast: If taskType is not explicitly supported, return error immediately
    const supportedTaskTypes = new Set([
      'client.search',
      'calendar.availability',
      'event.list_upcoming',
      'finance.summary',
      'email.followup',
      'email.recent',
      'email.search',
      'email.thread',
      'email.inbox_summary',
      'email.draft_reply',
      'event.create_draft',
      'client.list_recent',
      'client.details',
      'event.details',
      'event.list_by_status',
      'inquiry.list_open',
      'inquiry.details',
      'finance.monthly_snapshot',
      'recipe.search',
      'menu.list',
      'scheduling.next_available',
      'web.search',
      'web.read',
      'dietary.check',
      'chef.favorite_chefs',
      'chef.culinary_profile',
      'prep.timeline',
      'nudge.list',
      'grocery.quick_add',
      'document.search',
      'document.list_folders',
      'document.create_folder',
      'email.generic',
      'draft.thank_you',
      'draft.referral_request',
      'draft.testimonial_request',
      'draft.quote_cover_letter',
      'draft.decline_response',
      'draft.cancellation_response',
      'draft.payment_reminder',
      'draft.re_engagement',
      'draft.milestone_recognition',
      'draft.food_safety_incident',
      'ops.portion_calc',
      'ops.packing_list',
      'ops.cross_contamination',
      'analytics.break_even',
      'analytics.client_ltv',
      'analytics.recipe_cost',
      'client.event_recap',
      'client.menu_explanation',
    ])
    if (!supportedTaskTypes.has(task.taskType)) {
      return {
        taskId: task.id,
        taskType: task.taskType,
        tier: 3,
        name: task.taskType,
        status: 'error',
        error: `Task type "${task.taskType}" is not supported. No further attempts will be made.`,
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

      default:
        return {
          taskId: task.id,
          taskType: task.taskType,
          tier: 3,
          name: task.taskType,
          status: 'held',
          holdReason: `"${task.taskType}" is not yet supported. More capabilities coming soon.`,
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
export async function runCommand(rawInput: string): Promise<CommandRun> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const runId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  try {
    // Safety-critical fast-path: allergy/dietary queries MUST go through dietary.check
    // The LLM classifier sometimes routes these as client.search, missing allergy data.
    const dietaryMatch = rawInput.match(/\b(?:allerg|dietary|restriction|epipen|intoleran)\w*\b/i)
    const nameMatch = rawInput.match(
      /(?:for|about|does|do)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    )
    if (dietaryMatch && nameMatch) {
      const clientName = nameMatch[1].replace(/(?:'s|'s)\s*$/i, '')
      const task: PlannedTask = {
        id: 't1',
        taskType: 'dietary.check',
        tier: 1,
        confidence: 1.0,
        inputs: { clientName },
        dependsOn: [],
      }
      const result = await executeSingleTask(task, {}, tenantId)
      return {
        runId,
        rawInput,
        startedAt,
        results: [result],
        ollamaOffline: false,
      }
    }

    const plan = await parseCommandIntent(rawInput)
    const rounds = buildExecutionRounds(plan.tasks)

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
          return executeSingleTask(task, resolvedDeps, tenantId)
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

/**
 * Called when the chef approves a Tier 2 draft result.
 * For email drafts: copies to clipboard + provides mailto link.
 * For event drafts: creates a draft event in the database.
 */
export async function approveTask(
  taskType: string,
  data: unknown
): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // ─── Agent Action Registry (write actions) ──────────────────────────
  ensureAgentActionsRegistered()
  const agentAction = getAgentAction(taskType)
  if (agentAction) {
    if (agentAction.safety === 'restricted') {
      return {
        success: false,
        message: 'This action is restricted and cannot be performed by Remy.',
      }
    }
    const payload = (data as Record<string, unknown>) ?? {}
    // Check for error payloads (entity not found, etc.)
    if (payload._error || payload._restricted) {
      return { success: false, message: 'Cannot proceed — see the error in the preview.' }
    }
    return agentAction.commitAction(payload, { tenantId, userId: user.id })
  }

  // ─── Legacy task types ────────────────────────────────────────────────
  switch (taskType) {
    case 'email.followup':
    case 'email.generic':
    case 'email.draft_reply': {
      const d = data as { clientId?: string; clientName?: string; draftText?: string } | null
      if (d?.draftText) {
        // The draft text is returned to the client for clipboard copy
        return {
          success: true,
          message: `Draft approved! The email text has been copied to your clipboard. Send it from your email client.`,
        }
      }
      return {
        success: true,
        message: 'Draft approved. Copy and send from your email client.',
      }
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
          return {
            success: true,
            message: 'Event draft created! Redirecting to the event page...',
            redirectUrl: `/events/${event.id}`,
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          return { success: false, message: `Failed to create event: ${msg}` }
        }
      }
      return {
        success: true,
        message: 'Event draft approved. Head to /events/new to fill out the details.',
        redirectUrl: '/events/new',
      }
    }
    default:
      return { success: true, message: 'Approved.' }
  }
}
