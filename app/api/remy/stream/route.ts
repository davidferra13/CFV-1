// Remy — Streaming Chat API Route
// PRIVACY: Processes chef messages with full business context — must stay local via Ollama.
// Uses Server-Sent Events (SSE) to stream token-by-token responses.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Ollama } from 'ollama'
import { requireChef } from '@/lib/auth/get-user'
import { loadRemyContext } from '@/lib/ai/remy-context'
import { classifyIntent } from '@/lib/ai/remy-classifier'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import { isOllamaEnabled, getOllamaConfig, getOllamaModel } from '@/lib/ai/providers'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import {
  REMY_PERSONALITY,
  REMY_DRAFT_INSTRUCTIONS,
  REMY_PRIVACY_NOTE,
  REMY_TOPIC_GUARDRAILS,
  REMY_ANTI_INJECTION,
} from '@/lib/ai/remy-personality'
import { getCulinaryProfileForPrompt } from '@/lib/ai/chef-profile-actions'
import { getFavoriteChefs } from '@/lib/favorite-chefs/actions'
import { validateRemyInput, checkRemyRateLimit } from '@/lib/ai/remy-guardrails'
import { isRemyBlocked, isRemyAdmin, logRemyAbuse } from '@/lib/ai/remy-abuse-actions'
import {
  loadRelevantMemories,
  listRemyMemories,
  addRemyMemoryManual,
} from '@/lib/ai/remy-memory-actions'
import type { RemyMessage, RemyTaskResult, RemyMemoryItem } from '@/lib/ai/remy-types'
import type { RemyMemory, MemoryCategory } from '@/lib/ai/remy-memory-types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreamEvent {
  type: 'token' | 'tasks' | 'nav' | 'memories' | 'done' | 'error' | 'intent'
  data: unknown
}

// ─── Navigation Route Map ─────────────────────────────────────────────────────

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
/settings/culinary-profile - Culinary profile (food identity for Remy)
/settings/favorite-chefs - Favorite chefs (culinary heroes)
/aar - After-action reviews
/reviews - Client reviews
/analytics - Analytics & reports
/proposals - Proposal templates
/loyalty - Loyalty program
/goals - Business goals
/remy - Remy history (everything Remy has saved)
`.trim()

// ─── System Prompt Builder ────────────────────────────────────────────────────

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
  culinaryProfile?: string,
  favoriteChefs?: string
): string {
  const parts: string[] = []

  parts.push(REMY_PERSONALITY)
  parts.push(REMY_DRAFT_INSTRUCTIONS)
  parts.push(REMY_PRIVACY_NOTE)
  parts.push(REMY_TOPIC_GUARDRAILS)
  parts.push(REMY_ANTI_INJECTION)

  // Inject culinary profile if available
  if (culinaryProfile) {
    parts.push(
      `\nCHEF'S CULINARY IDENTITY:\n${culinaryProfile}\nUse this to personalize responses — reference their style, cuisines, and philosophy when relevant.`
    )
  }

  // Inject favorite chefs if available
  if (favoriteChefs) {
    parts.push(
      `\nCHEF'S CULINARY HEROES:\n${favoriteChefs}\nReference these when discussing inspiration, technique, or style — the chef admires these people.`
    )
  }

  parts.push(`\nBUSINESS CONTEXT:
- Business: ${context.businessName ?? 'Your business'}${context.tagline ? ` — "${context.tagline}"` : ''}
- Clients: ${context.clientCount} total
- Upcoming events: ${context.upcomingEventCount}
- Open inquiries: ${context.openInquiryCount}${context.pendingQuoteCount ? `\n- Pending quotes: ${context.pendingQuoteCount}` : ''}${context.monthRevenueCents !== undefined ? `\n- Month revenue: $${(context.monthRevenueCents / 100).toFixed(2)}` : ''}`)

  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    parts.push(`\nUPCOMING EVENTS:
${context.upcomingEvents.map((e) => `- ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status})`).join('\n')}`)
  }

  if (context.recentClients && context.recentClients.length > 0) {
    parts.push(`\nRECENT CLIENTS: ${context.recentClients.map((c) => c.name).join(', ')}`)
  }

  if (context.currentPage) {
    parts.push(
      `\nThe chef is currently on the ${context.currentPage} page. Consider this when making suggestions.`
    )
  }

  const memoryBlock = formatMemoriesForPrompt(memories)
  if (memoryBlock) {
    parts.push(memoryBlock)
  }

  parts.push(`\n${NAV_ROUTE_MAP}`)

  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference clients, events, inquiries, and facts that appear in the BUSINESS CONTEXT, UPCOMING EVENTS, RECENT CLIENTS, or WHAT YOU REMEMBER sections above.
If a section says "0" or is empty, that means there are NONE — do not invent any.
If you have no data to work with, be honest: "Looks like you're just getting started" or "I don't see any events yet."
NEVER fabricate names, dates, or details to sound helpful.`)

  // Streaming mode: plain text with nav suggestions as JSON at the end
  parts.push(`\nRESPONSE FORMAT:
Write your reply in natural language with markdown formatting (bold, bullets, etc.).
If you want to suggest page navigation links, end your response with a line containing only:
NAV_SUGGESTIONS: [{"label":"Page Name","href":"/route"}]
Only include nav suggestions when genuinely helpful.
Present all suggestions as drafts. Never claim to have taken autonomous actions.`)

  return parts.join('\n')
}

// ─── Conversation History Formatter ───────────────────────────────────────────

function formatConversationHistory(history: RemyMessage[]): string {
  if (history.length === 0) return ''
  const recent = history.slice(-10)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Chef' : 'Remy'}: ${m.content}`)
    .join('\n')
  return `Previous conversation:\n${formatted}\n\n`
}

// ─── Memory Intent Detection ──────────────────────────────────────────────────

const MEMORY_LIST_PATTERNS = [
  /\b(what|show|list|see|view|display)\b.*(you\s+)?remember/i,
  /\b(your|my)\s+memor(y|ies)/i,
  /\bmemory\s+(list|log|bank|store)/i,
  /\bshow\s+.*memor(y|ies)/i,
  /\blist\s+.*memor(y|ies)/i,
  /\bwhat\s+(have\s+you|do\s+you)\s+(learned|know|remember)/i,
  /\bmemories\b/i,
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

type MemoryIntent = 'list' | 'add' | null

function detectMemoryIntent(message: string): MemoryIntent {
  for (const p of MEMORY_ADD_PATTERNS) {
    if (p.test(message)) return 'add'
  }
  for (const p of MEMORY_LIST_PATTERNS) {
    if (p.test(message)) return 'list'
  }
  return null
}

function formatCategoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Task Result Summarizer ───────────────────────────────────────────────────

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
    } else if (task.taskType === 'web.search' && task.data) {
      const d = task.data as {
        query: string
        results: Array<{ title: string; snippet: string; url: string }>
      }
      if (d.results.length === 0) summaries.push(`No web results found for "${d.query}".`)
      else
        summaries.push(
          `Here's what I found online for "${d.query}":\n${d.results.map((r) => `• **${r.title}**\n  ${r.snippet}\n  [${r.url}](${r.url})`).join('\n')}`
        )
    } else if (task.taskType === 'web.read' && task.data) {
      const d = task.data as { url: string; title: string; summary: string }
      summaries.push(`**${d.title}**\n${d.summary}`)
    } else if (task.taskType === 'dietary.check' && task.data) {
      const d = task.data as {
        clientName: string
        restrictions: string[]
        flags: Array<{ severity: string; item: string; restriction: string; message: string }>
        safeItems: string[]
        summary: string
      }
      const lines = [d.summary]
      if (d.flags.length > 0) {
        lines.push('')
        for (const f of d.flags) {
          const icon = f.severity === 'danger' ? 'DANGER' : 'Warning'
          lines.push(`- **${icon}**: ${f.message}`)
        }
      }
      if (d.safeItems.length > 0 && d.flags.length > 0) {
        lines.push(`\nSafe items: ${d.safeItems.join(', ')}`)
      }
      summaries.push(lines.join('\n'))
    } else if (task.taskType === 'chef.favorite_chefs' && task.data) {
      const d = task.data as {
        chefs: Array<{ name: string; reason: string | null; websiteUrl: string | null }>
        count: number
      }
      if (d.count === 0) {
        summaries.push(
          'No favorite chefs saved yet. Head to Settings > Favorite Chefs to add your culinary heroes!'
        )
      } else {
        const lines = [`Your ${d.count} culinary heroes:`]
        for (const c of d.chefs) {
          lines.push(`- **${c.name}**${c.reason ? ` — ${c.reason}` : ''}`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'chef.culinary_profile' && task.data) {
      const d = task.data as {
        answers: Array<{ question: string; answer: string }>
        answeredCount: number
        totalCount: number
      }
      if (d.answeredCount === 0) {
        summaries.push(
          'Your culinary profile is empty. Head to Settings > Culinary Profile to tell me about your food identity!'
        )
      } else {
        const lines = [`Your culinary profile (${d.answeredCount}/${d.totalCount} answered):`]
        for (const a of d.answers) {
          lines.push(`- **${a.question}**: ${a.answer}`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'prep.timeline' && task.data) {
      const d = task.data as {
        eventName: string
        steps: Array<{
          time: string
          task: string
          duration: string
          category: string
          notes?: string
        }>
        totalPrepHours: number
        summary: string
      }
      if (d.steps.length === 0) {
        summaries.push(d.summary)
      } else {
        const lines = [`**Prep Timeline for ${d.eventName}** (~${d.totalPrepHours}h total)\n`]
        for (const step of d.steps) {
          lines.push(
            `- **${step.time}** ${step.task} _(${step.duration})_${step.notes ? ` — ${step.notes}` : ''}`
          )
        }
        lines.push(`\n${d.summary}`)
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'nudge.list' && task.data) {
      const d = task.data as {
        nudges: Array<{
          type: string
          title: string
          message: string
          priority: string
          actionLabel?: string
          actionHref?: string
        }>
        count: number
      }
      if (d.count === 0) {
        summaries.push("Nothing urgent right now — you're all caught up!")
      } else {
        const lines = [`Here's what needs your attention (${d.count} items):\n`]
        for (const n of d.nudges) {
          const icon = n.priority === 'high' ? '**!!**' : n.priority === 'medium' ? '**!**' : ''
          lines.push(`- ${icon} **${n.title}**: ${n.message}`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'grocery.quick_add' && task.data) {
      const d = task.data as {
        items: Array<{ name: string; quantity: string; unit: string; category: string }>
        summary: string
      }
      if (d.items.length === 0) {
        summaries.push(d.summary)
      } else {
        const lines = [`${d.summary}\n`]
        for (const item of d.items) {
          lines.push(`- ${item.quantity} ${item.unit} ${item.name} _(${item.category})_`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'document.search' && task.data) {
      const d = task.data as {
        documents: Array<{ title: string; type: string | null }>
        count: number
      }
      if (d.count === 0) summaries.push('No documents found.')
      else
        summaries.push(
          `Found ${d.count} document${d.count !== 1 ? 's' : ''}:\n${d.documents.map((doc) => `- ${doc.title}${doc.type ? ` (${doc.type})` : ''}`).join('\n')}`
        )
    } else if (task.taskType === 'document.list_folders' && task.data) {
      const d = task.data as { folders: Array<{ name: string }>; count: number }
      if (d.count === 0) summaries.push('No folders yet. Want me to create one?')
      else
        summaries.push(
          `Your ${d.count} folder${d.count !== 1 ? 's' : ''}:\n${d.folders.map((f) => `- ${f.name}`).join('\n')}`
        )
    } else if (task.taskType === 'email.generic' && task.data) {
      const d = task.data as { subject?: string; draftText: string }
      summaries.push(`Here's a draft for your review:\n\n${d.draftText}`)
    } else if (task.taskType.startsWith('draft.') && task.data) {
      const d = task.data as { subject?: string; draftText: string; clientName?: string }
      const label = d.clientName ? ` for ${d.clientName}` : ''
      summaries.push(
        `Here's your ${name.toLowerCase()}${label} — review and edit before sending:\n\n${d.draftText}`
      )
    } else {
      summaries.push(`"${name}" completed successfully.`)
    }
  }

  return summaries.join('\n\n')
}

// ─── SSE Encoder ──────────────────────────────────────────────────────────────

function encodeSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireChef()
    const body = await req.json()
    const { message, history, currentPage } = body as {
      message: string
      history: RemyMessage[]
      currentPage?: string
    }

    // ─── GUARDRAILS ──────────────────────────────────────────────
    const admin = await isRemyAdmin()

    if (!admin) {
      const blockStatus = await isRemyBlocked()
      if (blockStatus.blocked) {
        return new Response(
          encodeSSE({
            type: 'error',
            data: 'Your access to Remy has been temporarily suspended due to repeated policy violations.',
          }),
          { headers: sseHeaders() }
        )
      }

      const rateCheck = checkRemyRateLimit(user.tenantId!)
      if (!rateCheck.allowed) {
        return new Response(encodeSSE({ type: 'error', data: rateCheck.refusal }), {
          headers: sseHeaders(),
        })
      }

      const inputCheck = validateRemyInput(message)
      if (!inputCheck.allowed) {
        if (inputCheck.severity) {
          logRemyAbuse({
            severity: inputCheck.severity,
            category: inputCheck.category ?? 'unknown',
            blockedMessage: message,
            guardrailMatched: inputCheck.matchedPattern,
          }).catch((err) => console.error('[non-blocking] Abuse logging failed', err))
        }
        return new Response(encodeSSE({ type: 'error', data: inputCheck.refusal }), {
          headers: sseHeaders(),
        })
      }
    }

    // ─── MEMORY PATH (no streaming needed) ───────────────────────
    const memoryIntent = detectMemoryIntent(message)
    if (memoryIntent === 'list') {
      const memories = await listRemyMemories({ limit: 200 })
      const memoryItems: RemyMemoryItem[] = memories.map((m) => ({
        id: m.id,
        category: m.category,
        content: m.content,
        importance: m.importance,
        accessCount: m.accessCount,
        relatedClientId: m.relatedClientId,
        createdAt: m.createdAt,
      }))

      let text: string
      if (memories.length === 0) {
        text =
          'I don\'t have any memories saved yet. As we chat, I\'ll pick up on your preferences, client details, and business rules — or you can tell me directly. Try saying "remember that I prefer organic produce" to add one.'
      } else {
        const grouped = new Map<string, typeof memories>()
        for (const mem of memories) {
          if (!grouped.has(mem.category)) grouped.set(mem.category, [])
          grouped.get(mem.category)!.push(mem)
        }
        const lines: string[] = [
          `Here's everything I remember (${memories.length} memories). You can delete any of these — just tap the X next to it.\n`,
        ]
        for (const [category, items] of grouped) {
          lines.push(`**${formatCategoryLabel(category)}**`)
          for (const item of items) {
            lines.push(`• ${item.content}${item.importance >= 8 ? ' ⚠️' : ''}`)
          }
          lines.push('')
        }
        lines.push('_To add a memory, say "remember that..." followed by the fact._')
        text = lines.join('\n')
      }

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'memory' })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'memories', data: memoryItems })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          controller.close()
        },
      })
      return new Response(stream, { headers: sseHeaders() })
    }

    if (memoryIntent === 'add') {
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
      for (const t of triggers) fact = fact.replace(t, '')
      fact = fact.trim()

      if (!fact || fact.length < 3) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'memory' })))
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: 'token',
                  data: 'What should I remember? Try something like "remember that my client is vegetarian" or "remember that I charge $150/person for tasting menus."',
                })
              )
            )
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
            controller.close()
          },
        })
        return new Response(stream, { headers: sseHeaders() })
      }

      let category: MemoryCategory = 'chef_preference'
      const lower = fact.toLowerCase()
      if (
        /\b(client|customer|they|their|he|she|his|her|allergic|allergy|vegetarian|vegan|gluten)\b/i.test(
          lower
        )
      )
        category = 'client_insight'
      else if (/\b(price|charge|cost|rate|per\s+person|margin|quote)\b/i.test(lower))
        category = 'pricing_pattern'
      else if (
        /\b(schedule|book|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|evening|day\s+before)\b/i.test(
          lower
        )
      )
        category = 'scheduling_pattern'
      else if (/\b(email|draft|message|write|tone|formal|casual)\b/i.test(lower))
        category = 'communication_style'
      else if (/\b(never|always|rule|policy|require)\b/i.test(lower)) category = 'business_rule'
      else if (/\b(recipe|cook|dish|ingredient|organic|sauce|braise|sear|menu)\b/i.test(lower))
        category = 'culinary_note'
      else if (/\b(workflow|prep|shop|process|order|system)\b/i.test(lower))
        category = 'workflow_preference'

      await addRemyMemoryManual({ content: fact, category, importance: 5 })

      const text = `Got it — I'll remember that. Saved under **${formatCategoryLabel(category)}**.\n\n• ${fact}\n\nYou can say "show my memories" anytime to review or clean up what I know.`
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'memory' })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          controller.close()
        },
      })
      return new Response(stream, { headers: sseHeaders() })
    }

    // ─── MAIN PATH: classify + load context ─────────────────────
    // Hard timeout: if the entire pre-stream setup takes >45s, bail out.
    // Generous — classifier + context + memories usually takes 5-15s.
    // This only fires if Ollama is truly hung during classification.
    const setupTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Pre-stream setup timed out after 45s')), 45_000)
    )

    let context: Awaited<ReturnType<typeof loadRemyContext>>
    let classification: Awaited<ReturnType<typeof classifyIntent>>
    let memories: Awaited<ReturnType<typeof loadRelevantMemories>>
    let culinaryProfile: string | undefined
    let favoriteChefsList: string | undefined

    try {
      const [ctx, cls, mems, profile, favChefs] = (await Promise.race([
        Promise.all([
          loadRemyContext(currentPage),
          classifyIntent(message),
          loadRelevantMemories(message, undefined, undefined),
          getCulinaryProfileForPrompt(user.tenantId!).catch(() => ''),
          getFavoriteChefs().catch(() => []),
        ]),
        setupTimeout,
      ])) as [
        Awaited<ReturnType<typeof loadRemyContext>>,
        Awaited<ReturnType<typeof classifyIntent>>,
        Awaited<ReturnType<typeof loadRelevantMemories>>,
        string,
        Awaited<ReturnType<typeof getFavoriteChefs>>,
      ]
      context = ctx
      classification = cls
      memories = mems
      culinaryProfile = profile || undefined
      if (favChefs.length > 0) {
        favoriteChefsList = favChefs
          .map((c) => `- ${c.chefName}${c.reason ? `: ${c.reason}` : ''}`)
          .join('\n')
      }
    } catch (setupErr) {
      const msg = setupErr instanceof Error ? setupErr.message : String(setupErr)
      const isOllama =
        msg.includes('Ollama') || msg.includes('timeout') || msg.includes('timed out')
      return new Response(
        encodeSSE({
          type: 'error',
          data: isOllama
            ? 'Ollama is taking too long to respond. It may be stuck — try restarting Ollama and sending your message again.'
            : `Setup failed: ${msg}`,
        }),
        { headers: sseHeaders() }
      )
    }

    // ─── COMMAND path ────────────────────────────────────────────
    if (classification.intent === 'command') {
      const commandRun = await runCommand(message)

      if (commandRun.ollamaOffline) {
        return new Response(
          encodeSSE({
            type: 'error',
            data: "I'm offline right now — Ollama needs to be running for me to help. Start it up and try again!",
          }),
          { headers: sseHeaders() }
        )
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

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'command' })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: text })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'tasks', data: tasks })))
          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          controller.close()
        },
      })
      return new Response(stream, { headers: sseHeaders() })
    }

    // ─── MIXED path ──────────────────────────────────────────────
    if (classification.intent === 'mixed') {
      const commandInput = classification.commandPart ?? message
      const questionInput = classification.questionPart ?? message

      const [commandRun] = await Promise.all([runCommand(commandInput)])

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

      // Stream the conversational part
      if (!isOllamaEnabled()) {
        return new Response(
          encodeSSE({
            type: 'error',
            data: "I'm offline right now — Ollama needs to be running.",
          }),
          { headers: sseHeaders() }
        )
      }

      const config = getOllamaConfig()
      const model = getOllamaModel('standard')
      const ollama = new Ollama({ host: config.baseUrl })
      const systemPrompt = buildRemySystemPrompt(
        context,
        memories,
        culinaryProfile,
        favoriteChefsList
      )
      const historyStr = formatConversationHistory(history)

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          // Hard timeout: kill the Ollama call if it hangs
          const abortCtrl = new AbortController()
          const timeout = setTimeout(() => abortCtrl.abort(), OLLAMA_STREAM_TIMEOUT_MS)

          try {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'mixed' })))

            const response = await ollama.chat({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${historyStr}Chef: ${questionInput}` },
              ],
              stream: true,
              options: { num_predict: OLLAMA_STREAM_MAX_TOKENS },
            })

            let fullResponse = ''
            for await (const chunk of response) {
              if (abortCtrl.signal.aborted) {
                throw new Error('Ollama response timed out — the request took too long.')
              }
              const token = chunk.message?.content ?? ''
              if (token) {
                fullResponse += token
                controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
              }
            }

            // Parse nav suggestions from the end of the response
            const navSuggestions = extractNavSuggestions(fullResponse)

            // Append task summary
            if (taskSummary) {
              controller.enqueue(
                encoder.encode(encodeSSE({ type: 'token', data: `\n\n${taskSummary}` }))
              )
            }

            if (tasks.length > 0) {
              controller.enqueue(encoder.encode(encodeSSE({ type: 'tasks', data: tasks })))
            }
            if (navSuggestions.length > 0) {
              controller.enqueue(encoder.encode(encodeSSE({ type: 'nav', data: navSuggestions })))
            }
            controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            controller.enqueue(
              encoder.encode(
                encodeSSE({ type: 'error', data: `Remy ran into an issue: ${errMsg}` })
              )
            )
          } finally {
            clearTimeout(timeout)
            controller.close()
          }
        },
      })

      return new Response(stream, { headers: sseHeaders() })
    }

    // ─── QUESTION path (default) — STREAMED ──────────────────────
    if (!isOllamaEnabled()) {
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm offline right now — Ollama needs to be running for me to help. Start it up and try again!",
        }),
        { headers: sseHeaders() }
      )
    }

    const config = getOllamaConfig()
    const model = getOllamaModel('standard')
    const ollama = new Ollama({ host: config.baseUrl })
    const systemPrompt = buildRemySystemPrompt(context, memories)
    const historyStr = formatConversationHistory(history)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Hard timeout: kill the Ollama call if it hangs
        const abortCtrl = new AbortController()
        const timeout = setTimeout(() => abortCtrl.abort(), OLLAMA_STREAM_TIMEOUT_MS)

        try {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'question' })))

          const response = await ollama.chat({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `${historyStr}Chef: ${message}` },
            ],
            stream: true,
            options: { num_predict: OLLAMA_STREAM_MAX_TOKENS },
          })

          let fullResponse = ''
          for await (const chunk of response) {
            // Check if we've been aborted by the timeout
            if (abortCtrl.signal.aborted) {
              throw new Error('Ollama response timed out — the request took too long.')
            }
            const token = chunk.message?.content ?? ''
            if (token) {
              fullResponse += token
              controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
            }
          }

          // Parse nav suggestions from end of response
          const navSuggestions = extractNavSuggestions(fullResponse)
          if (navSuggestions.length > 0) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'nav', data: navSuggestions })))
          }

          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          const isOllamaDown =
            errMsg.includes('ECONNREFUSED') ||
            errMsg.includes('unreachable') ||
            errMsg.includes('timeout') ||
            errMsg.includes('timed out') ||
            errMsg.includes('aborted')
          controller.enqueue(
            encoder.encode(
              encodeSSE({
                type: 'error',
                data: isOllamaDown
                  ? "I'm offline right now — Ollama needs to be running for me to help. Start it up and try again!"
                  : `Remy ran into an issue: ${errMsg}`,
              })
            )
          )
        } finally {
          clearTimeout(timeout)
          controller.close()
        }
      },
    })

    return new Response(stream, { headers: sseHeaders() })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return new Response(encodeSSE({ type: 'error', data: `Remy ran into an issue: ${errMsg}` }), {
      headers: sseHeaders(),
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

/**
 * Hard timeout for Ollama streaming calls.
 * 90s is generous — a 30b model streaming 2048 tokens usually finishes in 30-60s.
 * This only fires if Ollama is truly stuck, not just thinking hard.
 */
const OLLAMA_STREAM_TIMEOUT_MS = 90_000

/**
 * Max tokens for streaming conversational responses.
 * Prevents Ollama from generating megabytes of output and ballooning memory.
 * 2048 tokens ≈ ~1500 words — more than enough for a chat reply.
 */
const OLLAMA_STREAM_MAX_TOKENS = 2048

function extractNavSuggestions(
  text: string
): Array<{ label: string; href: string; description?: string }> {
  const navMatch = text.match(/NAV_SUGGESTIONS:\s*(\[[\s\S]*\])/)
  if (!navMatch) return []
  try {
    return JSON.parse(navMatch[1])
  } catch {
    return []
  }
}
