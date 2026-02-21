'use server'

// Command Center — Orchestrator
// PRIVACY: Chef commands may contain client PII — all processing via local Ollama only.
// DRAFT-FIRST: Tier 2 results are drafts. Nothing is sent or saved until chef approves.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { parseCommandIntent } from '@/lib/ai/command-intent-parser'
import { searchClientsByName } from '@/lib/clients/actions'
import { checkCalendarAvailability } from '@/lib/scheduling/calendar-sync'
import { generateFollowUpDraft } from '@/lib/ai/followup-draft'
import { parseEventFromText } from '@/lib/events/parse-event-from-text'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
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
 * For email drafts: marks as approved (chef copies and sends manually).
 * For event drafts: could create the event in a future build.
 */
export async function approveTask(
  taskType: string,
  _data: unknown
): Promise<{ success: boolean; message: string }> {
  await requireChef()

  switch (taskType) {
    case 'email.followup':
    case 'email.generic':
      return {
        success: true,
        message: 'Draft approved. Copy and send from your email client.',
      }
    case 'event.create_draft':
      return {
        success: true,
        message: 'Event draft approved. Use it to fill out the event form.',
      }
    default:
      return { success: true, message: 'Approved.' }
  }
}
