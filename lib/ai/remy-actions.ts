'use server'

// Remy — Main Server Action
// PRIVACY: Processes chef messages with full business context — must stay local via Ollama.
// Output is DRAFT ONLY — chef reviews all suggestions and approves all actions.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { loadRemyContext } from '@/lib/ai/remy-context'
import { classifyIntent } from '@/lib/ai/remy-classifier'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import {
  REMY_PERSONALITY,
  REMY_DRAFT_INSTRUCTIONS,
  REMY_PRIVACY_NOTE,
} from '@/lib/ai/remy-personality'
import { loadRelevantMemories } from '@/lib/ai/remy-memory-actions'
import type { RemyMessage, RemyResponse, RemyTaskResult } from '@/lib/ai/remy-types'
import type { RemyMemory } from '@/lib/ai/remy-memory-types'

// ─── Response Schema ────────────────────────────────────────────────────────

const RemyConversationalSchema = z.object({
  response: z.string().describe("Remy's conversational reply"),
  navSuggestions: z
    .array(
      z.object({
        label: z.string().describe('Short label like "Events Page" or "Create Event"'),
        href: z.string().describe('App route like "/events" or "/events/new"'),
        description: z.string().optional().describe('Brief description of what the page shows'),
      })
    )
    .optional()
    .describe('Relevant page links to suggest'),
})

// ─── Navigation Route Map ───────────────────────────────────────────────────

const NAV_ROUTE_MAP = `
AVAILABLE PAGES (suggest these when relevant):
/dashboard - Dashboard overview
/events - All events list
/events/new - Create a new event
/events/upcoming - Upcoming events
/events/board - Event kanban board
/clients - Client directory
/clients/new - Add a new client
/inquiries - Inquiry pipeline
/quotes - Quotes
/schedule - Calendar / availability
/calendar - Calendar views
/recipes - Recipe library
/recipes/new - Create a new recipe
/menus - Menu library
/menus/new - Create a new menu
/financials - Financial hub
/expenses - Expense tracker
/expenses/new - Add an expense
/chat - Client messaging
/staff - Staff management
/settings - Account settings
/settings/my-profile - Edit profile
/settings/integrations - Integrations
/settings/automations - Automation settings
/aar - After-action reviews
/reviews - Client reviews
/analytics - Analytics & reports
/proposals - Proposal templates
/loyalty - Loyalty program
/goals - Business goals
/remy - Remy history (everything Remy has saved)
`.trim()

// ─── System Prompt Builder ──────────────────────────────────────────────────

function formatMemoriesForPrompt(memories: RemyMemory[]): string {
  if (memories.length === 0) return ''

  const grouped = new Map<string, string[]>()
  for (const mem of memories) {
    const cat = mem.category.replace(/_/g, ' ')
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(mem.content)
  }

  const sections: string[] = ['\nWHAT YOU REMEMBER ABOUT THIS CHEF:']
  for (const [category, items] of grouped) {
    sections.push(`${category}:`)
    for (const item of items) {
      sections.push(`- ${item}`)
    }
  }

  sections.push(
    "\nUse these memories naturally — reference them when relevant, but don't recite them mechanically."
  )

  return sections.join('\n')
}

function buildRemySystemPrompt(
  context: Awaited<ReturnType<typeof loadRemyContext>>,
  memories: RemyMemory[] = []
): string {
  const parts: string[] = []

  // Full personality guide
  parts.push(REMY_PERSONALITY)
  parts.push(REMY_DRAFT_INSTRUCTIONS)
  parts.push(REMY_PRIVACY_NOTE)

  // Business context
  parts.push(`\nBUSINESS CONTEXT:
- Business: ${context.businessName ?? 'Your business'}${context.tagline ? ` — "${context.tagline}"` : ''}
- Clients: ${context.clientCount} total
- Upcoming events: ${context.upcomingEventCount}
- Open inquiries: ${context.openInquiryCount}${context.pendingQuoteCount ? `\n- Pending quotes: ${context.pendingQuoteCount}` : ''}${context.monthRevenueCents !== undefined ? `\n- Month revenue: $${(context.monthRevenueCents / 100).toFixed(2)}` : ''}`)

  // Upcoming events detail
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    parts.push(`\nUPCOMING EVENTS:
${context.upcomingEvents.map((e) => `- ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status})`).join('\n')}`)
  }

  // Recent clients
  if (context.recentClients && context.recentClients.length > 0) {
    parts.push(`\nRECENT CLIENTS: ${context.recentClients.map((c) => c.name).join(', ')}`)
  }

  // Current page context
  if (context.currentPage) {
    parts.push(
      `\nThe chef is currently on the ${context.currentPage} page. Consider this when making suggestions.`
    )
  }

  // Persistent memories
  const memoryBlock = formatMemoriesForPrompt(memories)
  if (memoryBlock) {
    parts.push(memoryBlock)
  }

  // Navigation routes
  parts.push(`\n${NAV_ROUTE_MAP}`)

  // Response instructions
  parts.push(`\nRESPONSE FORMAT:
Return JSON: { "response": "your text reply", "navSuggestions": [{ "label": "Page Name", "href": "/route", "description": "optional" }] }
Only include navSuggestions when genuinely helpful — don't spam links on every response.
Present all suggestions as drafts. Never claim to have taken autonomous actions.`)

  return parts.join('\n')
}

// ─── Conversation History Formatter ─────────────────────────────────────────

function formatConversationHistory(history: RemyMessage[]): string {
  if (history.length === 0) return ''

  // Keep last 10 messages to stay within context window
  const recent = history.slice(-10)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Chef' : 'Remy'}: ${m.content}`)
    .join('\n')

  return `Previous conversation:\n${formatted}\n\n`
}

// ─── Task Result Summarizer ─────────────────────────────────────────────────

function summarizeTaskResults(results: RemyTaskResult[]): string {
  if (results.length === 0)
    return "I tried to process your request but couldn't match it to any available actions."

  const summaries: string[] = []

  for (const task of results) {
    const name = task.name || task.taskType

    if (task.status === 'error') {
      summaries.push(`I ran into an issue with "${name}": ${task.error ?? 'unknown error'}`)
      continue
    }

    if (task.status === 'held') {
      summaries.push(`"${name}" needs your input: ${task.holdReason ?? 'Could you clarify?'}`)
      continue
    }

    if (task.status === 'pending') {
      summaries.push(`I've drafted "${name}" for your review — check the card below.`)
      continue
    }

    // Status: done — summarize the data
    if (task.taskType === 'client.search' && task.data) {
      const d = task.data as { clients: Array<{ name: string }> }
      if (d.clients.length === 0) summaries.push('No matching clients found.')
      else
        summaries.push(
          `Found ${d.clients.length} client${d.clients.length > 1 ? 's' : ''}: ${d.clients.map((c) => c.name).join(', ')}`
        )
    } else if (task.taskType === 'calendar.availability' && task.data) {
      const d = task.data as {
        date: string
        available: boolean
        conflicts?: Array<{ occasion: string }>
      }
      if (d.available) summaries.push(`${d.date} is available — no events booked.`)
      else
        summaries.push(
          `${d.date} is not available. You have: ${d.conflicts?.map((c) => c.occasion).join(', ') ?? 'a conflict'}`
        )
    } else if (task.taskType === 'event.list_upcoming' && task.data) {
      const d = task.data as {
        events: Array<{
          occasion: string | null
          date: string | null
          clientName: string
          status: string
        }>
      }
      if (d.events.length === 0) summaries.push('No upcoming events.')
      else
        summaries.push(
          `Here are your upcoming events:\n${d.events.map((e) => `• ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'} for ${e.clientName} (${e.status})`).join('\n')}`
        )
    } else if (task.taskType === 'finance.summary' && task.data) {
      const d = task.data as {
        totalRevenueCents: number
        eventCount: number
        completedCount: number
      }
      summaries.push(
        `Revenue: $${(d.totalRevenueCents / 100).toFixed(2)} across ${d.eventCount} event${d.eventCount !== 1 ? 's' : ''} (${d.completedCount} completed)`
      )
    } else {
      summaries.push(`"${name}" completed successfully.`)
    }
  }

  return summaries.join('\n\n')
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function sendRemyMessage(
  userMessage: string,
  conversationHistory: RemyMessage[],
  currentPage?: string
): Promise<RemyResponse> {
  await requireChef()

  try {
    // Run context loading, intent classification, and memory loading in parallel
    const [context, classification, memories] = await Promise.all([
      loadRemyContext(currentPage),
      classifyIntent(userMessage),
      loadRelevantMemories(userMessage, undefined, undefined),
    ])

    // ─── COMMAND path ─────────────────────────────────────────────────
    if (classification.intent === 'command') {
      const commandRun = await runCommand(userMessage)

      if (commandRun.ollamaOffline) {
        throw new OllamaOfflineError('Ollama is offline', 'unreachable')
      }

      const tasks: RemyTaskResult[] = commandRun.results.map((r) => ({
        taskId: r.taskId,
        taskType: r.taskType,
        tier: r.tier,
        name: r.name ?? getTaskName(r.taskType),
        status: r.status === 'running' ? 'done' : (r.status as RemyTaskResult['status']),
        data: r.data,
        error: r.error,
        holdReason: r.holdReason,
      }))

      const text = summarizeTaskResults(tasks)

      return { text, intent: 'command', tasks }
    }

    // ─── MIXED path ───────────────────────────────────────────────────
    if (classification.intent === 'mixed') {
      // Run both paths in parallel
      const commandInput = classification.commandPart ?? userMessage
      const questionInput = classification.questionPart ?? userMessage

      const [commandRun, conversationalResult] = await Promise.all([
        runCommand(commandInput),
        (async () => {
          const systemPrompt = buildRemySystemPrompt(context, memories)
          const history = formatConversationHistory(conversationHistory)
          return parseWithOllama(
            systemPrompt,
            `${history}Chef: ${questionInput}`,
            RemyConversationalSchema
          )
        })(),
      ])

      const tasks: RemyTaskResult[] = (commandRun.results ?? []).map((r) => ({
        taskId: r.taskId,
        taskType: r.taskType,
        tier: r.tier,
        name: r.name ?? getTaskName(r.taskType),
        status: r.status === 'running' ? 'done' : (r.status as RemyTaskResult['status']),
        data: r.data,
        error: r.error,
        holdReason: r.holdReason,
      }))

      const taskSummary = summarizeTaskResults(tasks)
      const text = `${conversationalResult.response}\n\n${taskSummary}`

      return {
        text,
        intent: 'mixed',
        tasks,
        navSuggestions: conversationalResult.navSuggestions ?? undefined,
      }
    }

    // ─── QUESTION path (default) ──────────────────────────────────────
    const systemPrompt = buildRemySystemPrompt(context, memories)
    const history = formatConversationHistory(conversationHistory)
    const result = await parseWithOllama(
      systemPrompt,
      `${history}Chef: ${userMessage}`,
      RemyConversationalSchema
    )

    return {
      text: result.response,
      intent: 'question',
      navSuggestions: result.navSuggestions ?? undefined,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[remy] Error processing message:', err)
    throw new Error('Remy ran into an issue. Please try again.')
  }
}
