'use server'

// Remy — Main Server Action
// PRIVACY: Processes chef messages with full business context — must stay local via Ollama.
// Output is DRAFT ONLY — chef reviews all suggestions and approves all actions.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { loadRemyContext } from '@/lib/ai/remy-context'
import { classifyIntent } from '@/lib/ai/remy-classifier'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import {
  REMY_PERSONALITY,
  REMY_FEW_SHOT_EXAMPLES,
  REMY_DRAFT_INSTRUCTIONS,
  REMY_PRIVACY_NOTE,
  REMY_TOPIC_GUARDRAILS,
  REMY_ANTI_INJECTION,
} from '@/lib/ai/remy-personality'
import {
  validateRemyInput,
  validateMemoryContent,
  checkRemyRateLimit,
} from '@/lib/ai/remy-guardrails'
import { isFocusModeEnabled } from '@/lib/billing/focus-mode-actions'
import { logRemyAbuse, isRemyBlocked, isRemyAdmin } from '@/lib/ai/remy-abuse-actions'
import {
  loadRelevantMemories,
  listRemyMemories,
  deleteRemyMemory,
  addRemyMemoryManual,
} from '@/lib/ai/remy-memory-actions'
import type { RemyMessage, RemyResponse, RemyTaskResult, RemyMemoryItem } from '@/lib/ai/remy-types'
import type { RemyMemory, MemoryCategory } from '@/lib/ai/remy-memory-types'

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

// Scoped route map for Focus Mode — only core workflows
const NAV_ROUTE_MAP_FOCUS = `
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
/settings - Account settings
/goals - Business goals
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
  memories: RemyMemory[] = [],
  focusMode: boolean = false
): string {
  const parts: string[] = []

  // Full personality guide
  parts.push(REMY_PERSONALITY)
  // Few-shot examples — show Remy how to respond, not just what to be
  parts.push(REMY_FEW_SHOT_EXAMPLES)
  parts.push(REMY_DRAFT_INSTRUCTIONS)
  parts.push(REMY_PRIVACY_NOTE)
  parts.push(REMY_TOPIC_GUARDRAILS)
  parts.push(REMY_ANTI_INJECTION)

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

  // Email digest — proactive communication awareness
  if (context.emailDigest && context.emailDigest.totalSinceYesterday > 0) {
    const d = context.emailDigest
    const emailLines: string[] = [
      `\nEMAIL INBOX (last 24 hours):`,
      `- ${d.totalSinceYesterday} emails received${d.inquiryCount > 0 ? `, ${d.inquiryCount} new inquir${d.inquiryCount === 1 ? 'y' : 'ies'}` : ''}${d.threadReplyCount > 0 ? `, ${d.threadReplyCount} client repl${d.threadReplyCount === 1 ? 'y' : 'ies'}` : ''}`,
    ]
    if (d.recentEmails.length > 0) {
      emailLines.push('Recent:')
      for (const e of d.recentEmails) {
        const cls =
          e.classification === 'inquiry'
            ? ' [NEW INQUIRY]'
            : e.classification === 'existing_thread'
              ? ' [CLIENT REPLY]'
              : ''
        emailLines.push(`- From: ${e.from} — "${e.subject}"${cls}`)
      }
    }
    emailLines.push(
      'You can search, read, or summarize emails. Draft replies are always drafts — never auto-sent.'
    )
    parts.push(emailLines.join('\n'))
  }

  // ─── Context enrichment sections (2026-02-28) ───────────────────────────

  // Recipe library stats
  if (context.recipeStats && context.recipeStats.totalRecipes > 0) {
    parts.push(
      `\nRECIPE LIBRARY: ${context.recipeStats.totalRecipes} recipes across ${context.recipeStats.categories.join(', ')}`
    )
  }

  // Client vibe notes
  if (context.clientVibeNotes && context.clientVibeNotes.length > 0) {
    parts.push(`\nCLIENT VIBE NOTES (personality & communication style):
${context.clientVibeNotes.map((c) => `- ${c.name}: ${c.vibeNotes}`).join('\n')}`)
  }

  // Recent AAR insights
  if (context.recentAARInsights && context.recentAARInsights.length > 0) {
    const aars = context.recentAARInsights.filter(
      (a) => a.lessonsLearned || a.wentWell || a.toImprove
    )
    if (aars.length > 0) {
      parts.push(`\nRECENT LESSONS LEARNED:
${aars
  .map((a) => {
    const p: string[] = []
    if (a.wentWell) p.push(`✅ ${a.wentWell}`)
    if (a.toImprove) p.push(`⚠️ ${a.toImprove}`)
    if (a.lessonsLearned) p.push(`💡 ${a.lessonsLearned}`)
    return p.join(' | ')
  })
  .join('\n')}`)
    }
  }

  // Pending menu approvals
  if (context.pendingMenuApprovals && context.pendingMenuApprovals.length > 0) {
    parts.push(
      `\n📋 PENDING MENU APPROVALS (${context.pendingMenuApprovals.length}): ${context.pendingMenuApprovals.map((m) => m.clientName).join(', ')}`
    )
  }

  // Unread inquiry messages
  if (context.unreadInquiryMessages && context.unreadInquiryMessages.length > 0) {
    const unique = [...new Set(context.unreadInquiryMessages.map((m) => m.leadName))]
    parts.push(
      `\n📬 UNREAD INQUIRY MESSAGES (${context.unreadInquiryMessages.length}): from ${unique.join(', ')}`
    )
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

  // Navigation routes (scoped by Focus Mode)
  parts.push(`\n${focusMode ? NAV_ROUTE_MAP_FOCUS : NAV_ROUTE_MAP}`)

  // Grounding rule — critical for preventing hallucinations
  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference clients, events, inquiries, and facts that appear in the BUSINESS CONTEXT, UPCOMING EVENTS, RECENT CLIENTS, or WHAT YOU REMEMBER sections above.
If a section says "0" or is empty, that means there are NONE — do not invent any.
If you have no data to work with, be honest: "Looks like you're just getting started" or "I don't see any events yet."
NEVER fabricate names, dates, or details to sound helpful.`)

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

// ─── Memory Intent Detection (regex — no LLM needed) ───────────────────────

const MEMORY_LIST_PATTERNS = [
  /\b(what|show|list|see|view|display)\b.*(you\s+)?remember/i,
  /\b(your|my)\s+memor(y|ies)/i,
  /\bmemory\s+(list|log|bank|store)/i,
  /\bshow\s+.*memor(y|ies)/i,
  /\blist\s+.*memor(y|ies)/i,
  /\bwhat\s+(have\s+you|do\s+you)\s+(learned|know|remember)/i,
  /\bmemories\b/i,
]

const MEMORY_DELETE_PATTERNS = [
  /\b(forget|delete|remove|erase|drop)\b.*(memory|that|this|about)/i,
  /\bstop\s+remember/i,
  /\bdon'?t\s+remember/i,
]

const MEMORY_ADD_PATTERNS = [
  /\bremember\s+that\b/i,
  /\bremember\s*:/i,
  /\bkeep\s+in\s+mind\b/i,
  /\bdon'?t\s+forget\b/i,
  /\bnote\s+that\b/i,
  /\badd\s+(a\s+)?memory\b/i,
  /\bsave\s+that\b/i,
]

type MemoryIntent = 'list' | 'delete' | 'add' | null

function detectMemoryIntent(message: string): MemoryIntent {
  // Check delete first (more specific)
  for (const p of MEMORY_DELETE_PATTERNS) {
    if (p.test(message)) return 'delete'
  }
  // Check add
  for (const p of MEMORY_ADD_PATTERNS) {
    if (p.test(message)) return 'add'
  }
  // Check list
  for (const p of MEMORY_LIST_PATTERNS) {
    if (p.test(message)) return 'list'
  }
  return null
}

function formatCategoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

async function handleMemoryList(): Promise<RemyResponse> {
  const memories = await listRemyMemories({ limit: 200 })

  if (memories.length === 0) {
    return {
      text: 'I don\'t have any memories saved yet. As we chat, I\'ll pick up on your preferences, client details, and business rules — or you can tell me directly. Try saying "remember that I prefer organic produce" to add one.',
      intent: 'memory',
      memoryItems: [],
    }
  }

  // Group by category
  const grouped = new Map<string, typeof memories>()
  for (const mem of memories) {
    const cat = mem.category
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(mem)
  }

  const lines: string[] = [
    `Here's everything I remember (${memories.length} memories). You can delete any of these — just tap the X next to it.\n`,
  ]

  for (const [category, items] of grouped) {
    lines.push(`**${formatCategoryLabel(category)}**`)
    for (const item of items) {
      const stars = item.importance >= 8 ? ' ⚠️' : ''
      lines.push(`• ${item.content}${stars}`)
    }
    lines.push('')
  }

  lines.push(
    '_To add a memory, say "remember that..." followed by the fact. To delete, tap the X next to any memory above._'
  )

  const memoryItems: RemyMemoryItem[] = memories.map((m) => ({
    id: m.id,
    category: m.category,
    content: m.content,
    importance: m.importance,
    accessCount: m.accessCount,
    relatedClientId: m.relatedClientId,
    createdAt: m.createdAt,
  }))

  return {
    text: lines.join('\n'),
    intent: 'memory',
    memoryItems,
  }
}

async function handleMemoryAdd(message: string): Promise<RemyResponse> {
  // Extract the fact after trigger phrases
  let fact = message
  const triggers = [
    /remember\s+that\s+/i,
    /remember\s*:\s*/i,
    /keep\s+in\s+mind\s+(that\s+)?/i,
    /don'?t\s+forget\s+(that\s+)?/i,
    /note\s+that\s+/i,
    /add\s+(a\s+)?memory\s*:?\s*/i,
    /save\s+that\s+/i,
  ]
  for (const t of triggers) {
    fact = fact.replace(t, '')
  }
  fact = fact.trim()

  if (!fact || fact.length < 3) {
    return {
      text: 'What should I remember? Try something like "remember that my client is vegetarian" or "remember that I charge $150/person for tasting menus."',
      intent: 'memory',
    }
  }

  // Validate memory content (length, URLs, code, business relevance)
  const memoryCheck = validateMemoryContent(fact)
  if (!memoryCheck.allowed) {
    return {
      text: memoryCheck.refusal!,
      intent: 'memory',
    }
  }

  // Simple category detection from the fact
  let category: MemoryCategory = 'chef_preference'
  const lower = fact.toLowerCase()
  if (
    /\b(client|customer|they|their|he|she|his|her|allergic|allergy|vegetarian|vegan|gluten)\b/i.test(
      lower
    )
  ) {
    category = 'client_insight'
  } else if (/\b(price|charge|cost|rate|per\s+person|margin|quote)\b/i.test(lower)) {
    category = 'pricing_pattern'
  } else if (
    /\b(schedule|book|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|evening|day\s+before)\b/i.test(
      lower
    )
  ) {
    category = 'scheduling_pattern'
  } else if (/\b(email|draft|message|write|tone|formal|casual)\b/i.test(lower)) {
    category = 'communication_style'
  } else if (/\b(never|always|rule|policy|require)\b/i.test(lower)) {
    category = 'business_rule'
  } else if (/\b(recipe|cook|dish|ingredient|organic|sauce|braise|sear|menu)\b/i.test(lower)) {
    category = 'culinary_note'
  } else if (/\b(workflow|prep|shop|process|order|system)\b/i.test(lower)) {
    category = 'workflow_preference'
  }

  const { id } = await addRemyMemoryManual({
    content: fact,
    category,
    importance: 5,
  })

  return {
    text: `Got it — I'll remember that. Saved under **${formatCategoryLabel(category)}**.\n\n• ${fact}\n\nYou can say "show my memories" anytime to review or clean up what I know.`,
    intent: 'memory',
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function sendRemyMessage(
  userMessage: string,
  conversationHistory: RemyMessage[],
  currentPage?: string
): Promise<RemyResponse> {
  const user = await requireChef()
  await requirePro('remy')

  // ─── GUARDRAILS (before any LLM call) ──────────────────────────
  // Admins bypass ALL guardrails — they can do whatever they want
  const admin = await isRemyAdmin()

  if (!admin) {
    // Block check (auto-blocked from prior violations?)
    const blockStatus = await isRemyBlocked()
    if (blockStatus.blocked) {
      return {
        text: 'Your access to Remy has been temporarily suspended due to repeated policy violations. Contact your administrator if you believe this is an error.',
        intent: 'question',
      }
    }

    // Rate limit (12 msgs/min)
    const rateCheck = checkRemyRateLimit(user.tenantId!)
    if (!rateCheck.allowed) {
      return { text: rateCheck.refusal!, intent: 'question' }
    }

    // Input validation (length, dangerous content, abuse, injection)
    const inputCheck = validateRemyInput(userMessage)
    if (!inputCheck.allowed) {
      // Log the violation (non-blocking side effect)
      if (inputCheck.severity) {
        logRemyAbuse({
          severity: inputCheck.severity,
          category: inputCheck.category ?? 'unknown',
          blockedMessage: userMessage,
          guardrailMatched: inputCheck.matchedPattern,
        }).catch((err) => console.error('[non-blocking] Abuse logging failed', err))
      }
      return { text: inputCheck.refusal!, intent: 'question' }
    }
  }
  // ─── END GUARDRAILS ────────────────────────────────────────────

  try {
    // ─── MEMORY path (regex-only, no LLM call needed) ─────────────
    const memoryIntent = detectMemoryIntent(userMessage)
    if (memoryIntent === 'list') {
      return handleMemoryList()
    }
    if (memoryIntent === 'add') {
      return handleMemoryAdd(userMessage)
    }
    // 'delete' intent is handled client-side via deleteRemyMemory() directly
    // (the user taps the X button next to a specific memory)

    // Run context loading, intent classification, memory loading, and focus mode check in parallel
    const [context, classification, memories, focusMode] = await Promise.all([
      loadRemyContext(currentPage),
      classifyIntent(userMessage),
      loadRelevantMemories(userMessage, undefined, undefined),
      isFocusModeEnabled().catch(() => false),
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
          const systemPrompt = buildRemySystemPrompt(context, memories, focusMode)
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
    const systemPrompt = buildRemySystemPrompt(context, memories, focusMode)
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
