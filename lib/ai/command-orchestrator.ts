'use server'

// Ask Remy — Orchestrator
// PRIVACY: Chef commands may contain client PII — all processing via local Ollama only.
// DRAFT-FIRST: Tier 2 results are drafts. Nothing is sent or saved until chef approves.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { parseCommandIntent } from '@/lib/ai/command-intent-parser'
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
import type { CommandRun, TaskResult, PlannedTask, ApprovalTier } from '@/lib/ai/command-types'

// ─── Individual Task Executors ────────────────────────────────────────────────

async function executeClientSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
  const clients = await searchClientsByName(query)
  return {
    clients: clients.map((c) => ({
      id: c.id,
      name: c.full_name ?? '',
      email: c.email ?? '',
      status: c.status ?? '',
    })),
  }
}

async function executeCalendarAvailability(inputs: Record<string, unknown>) {
  const date = String(inputs.date ?? '')
  const result = await checkCalendarAvailability(date)
  return { date, ...result }
}

async function executeEventListUpcoming(tenantId: string) {
  const supabase = createServerClient()
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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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

async function executeWebSearch(inputs: Record<string, unknown>) {
  const query = String(inputs.query ?? '')
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

    // Fail-fast: If taskType is not explicitly supported, return error immediately
    const supportedTaskTypes = new Set([
      'client.search',
      'calendar.availability',
      'event.list_upcoming',
      'finance.summary',
      'email.followup',
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

  switch (taskType) {
    case 'email.followup':
    case 'email.generic': {
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
        const supabase = createServerClient()
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
