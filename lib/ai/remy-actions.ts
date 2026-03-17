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
import { tryInstantAnswer } from '@/app/api/remy/stream/route-instant-answers'
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

// ─── Seasonal & Holiday Intelligence (deterministic — pure date math) ───────

function getSeasonalContext(month: number, day: number, season: string): string {
  const hints: string[] = []

  // Upcoming holidays & busy periods (within ~2 weeks)
  const holidays: Array<{ month: number; dayStart: number; dayEnd: number; label: string }> = [
    { month: 0, dayStart: 1, dayEnd: 2, label: "New Year's — post-holiday detox menus popular" },
    {
      month: 1,
      dayStart: 7,
      dayEnd: 14,
      label: "Valentine's Day approaching — romantic dinners peak",
    },
    {
      month: 1,
      dayStart: 14,
      dayEnd: 15,
      label: "Valentine's Day — busiest date-night booking day",
    },
    { month: 2, dayStart: 10, dayEnd: 17, label: "St. Patrick's Day coming — Irish-themed events" },
    {
      month: 3,
      dayStart: 1,
      dayEnd: 21,
      label: 'Easter/Passover season — family gatherings spike',
    },
    {
      month: 4,
      dayStart: 1,
      dayEnd: 15,
      label: "Mother's Day approaching — brunch bookings surge",
    },
    { month: 4, dayStart: 20, dayEnd: 31, label: 'Memorial Day weekend — outdoor events ramp up' },
    { month: 5, dayStart: 10, dayEnd: 21, label: "Father's Day approaching — BBQ/grill events" },
    { month: 6, dayStart: 1, dayEnd: 4, label: 'July 4th — outdoor entertaining peak' },
    { month: 8, dayStart: 1, dayEnd: 7, label: 'Labor Day — end-of-summer parties' },
    { month: 9, dayStart: 20, dayEnd: 31, label: 'Halloween approaching — themed events' },
    {
      month: 10,
      dayStart: 15,
      dayEnd: 28,
      label: 'Thanksgiving approaching — biggest cooking holiday',
    },
    { month: 10, dayStart: 28, dayEnd: 30, label: 'Thanksgiving — peak family dining' },
    {
      month: 11,
      dayStart: 1,
      dayEnd: 25,
      label: 'Holiday season — corporate parties & family gatherings peak',
    },
    { month: 11, dayStart: 26, dayEnd: 31, label: "New Year's Eve prep — party bookings surge" },
  ]

  for (const h of holidays) {
    if (month === h.month && day >= h.dayStart && day <= h.dayEnd) {
      hints.push(h.label)
    }
  }

  // Seasonal produce awareness
  const produceMap: Record<string, string> = {
    spring: 'In season: asparagus, peas, ramps, strawberries, artichokes, fava beans, morels',
    summer: 'In season: tomatoes, stone fruits, corn, zucchini, berries, basil, eggplant',
    fall: 'In season: squash, apples, pears, root vegetables, mushrooms, Brussels sprouts, cranberries',
    winter: 'In season: citrus, pomegranates, kale, parsnips, turnips, winter squash, chestnuts',
  }
  hints.push(produceMap[season] ?? '')

  // Busy/slow period awareness
  if (month >= 10 || month === 0) {
    hints.push('Peak booking season — holiday parties, corporate events, family gatherings')
  } else if (month >= 5 && month <= 7) {
    hints.push('Wedding & outdoor event season — high demand period')
  } else if (month >= 1 && month <= 2) {
    hints.push('Traditionally slower booking period — good time for menu development & marketing')
  }

  return hints.filter(Boolean).join('. ')
}

// ─── Sentiment Detection (deterministic — regex, no LLM) ────────────────────
// Detects chef mood from message patterns to adjust Remy's tone.

type ChefSentiment = 'neutral' | 'stressed' | 'frustrated' | 'excited' | 'grateful'

const STRESSED_PATTERNS = [
  /\b(overwhelm|swamp|drown|bury|buried|crazy busy|so much|too much|can't keep up|behind on|falling behind|stressed|panic|freaking out)\b/i,
  /\b(help me|i need help|sos|urgent|asap|emergency)\b/i,
  /!\s*!+/, // Multiple exclamation marks with stressed context
]

const FRUSTRATED_PATTERNS = [
  /\b(frustrated|annoyed|angry|pissed|ugh|wtf|damn|crap|ridiculous|sick of|tired of|fed up|hate)\b/i,
  /\b(broken|not working|keeps failing|won't work|doesn't work|messed up)\b/i,
  /\b(why (is|does|won't|can't|doesn't)|what the hell|come on)\b/i,
]

const EXCITED_PATTERNS = [
  /\b(amazing|awesome|incredible|fantastic|love it|perfect|brilliant|great news|so excited|can't wait|thrilled|pumped)\b/i,
  /!\s*$/, // Ends with exclamation (positive context)
]

const GRATEFUL_PATTERNS = [
  /\b(thank you|thanks|appreciate|grateful|you're the best|lifesaver|godsend|couldn't do .* without)\b/i,
]

function detectSentiment(message: string): ChefSentiment {
  // Check most specific first
  for (const p of FRUSTRATED_PATTERNS) if (p.test(message)) return 'frustrated'
  for (const p of STRESSED_PATTERNS) if (p.test(message)) return 'stressed'
  for (const p of GRATEFUL_PATTERNS) if (p.test(message)) return 'grateful'
  for (const p of EXCITED_PATTERNS) if (p.test(message)) return 'excited'
  return 'neutral'
}

function getSentimentInstruction(sentiment: ChefSentiment): string {
  switch (sentiment) {
    case 'stressed':
      return '\nTONE ADJUSTMENT: The chef sounds stressed. Be extra calm, reassuring, and efficient. Lead with the most helpful action, minimize chatter. "I got you, chef — here\'s what we do..."'
    case 'frustrated':
      return '\nTONE ADJUSTMENT: The chef sounds frustrated. Acknowledge it briefly, skip the pleasantries, get straight to solving the problem. Be direct and action-oriented. No "I understand" speeches — just fix it.'
    case 'excited':
      return '\nTONE ADJUSTMENT: The chef is excited! Match their energy — be enthusiastic and celebrate with them. Build on the momentum.'
    case 'grateful':
      return '\nTONE ADJUSTMENT: The chef is expressing gratitude. Be warm but brief — a quick "always, chef" and then keep moving. Don\'t over-acknowledge.'
    default:
      return ''
  }
}

// ─── Daily Briefing Builder (deterministic — pure context analysis) ──────────
// Generates a "Good morning, chef" daily briefing from available context data.
// Only triggers on first message of day (detected by empty conversation history).

function buildDailyBriefing(context: Awaited<ReturnType<typeof loadRemyContext>>): string {
  const items: string[] = []

  // Today's events
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const todayEvents = context.upcomingEvents.filter((e) => e.date === today)
    if (todayEvents.length > 0) {
      items.push(
        `📅 ${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} TODAY: ${todayEvents.map((e) => `${e.occasion ?? 'Event'} for ${e.clientName} (${e.guestCount ?? '?'} guests)`).join(', ')}`
      )
    }

    // Tomorrow's events
    const tmrw = new Date()
    tmrw.setDate(tmrw.getDate() + 1)
    const tmrwStr = tmrw.toISOString().split('T')[0]
    const tomorrowEvents = context.upcomingEvents.filter((e) => e.date === tmrwStr)
    if (tomorrowEvents.length > 0) {
      items.push(
        `📅 ${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''} TOMORROW: ${tomorrowEvents.map((e) => `${e.occasion ?? 'Event'} for ${e.clientName}`).join(', ')}`
      )
    }
  }

  // Pending todos due today/overdue
  if (context.activeTodos && context.activeTodos.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const overdue = context.activeTodos.filter((t) => t.dueDate && t.dueDate < today)
    const dueToday = context.activeTodos.filter((t) => t.dueDate === today)
    if (overdue.length > 0)
      items.push(`⚠️ ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`)
    if (dueToday.length > 0)
      items.push(`✅ ${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`)
  }

  // Scheduled calls today
  if (context.upcomingCalls && context.upcomingCalls.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const todayCalls = context.upcomingCalls.filter((c) => c.scheduledAt.startsWith(today))
    if (todayCalls.length > 0) {
      items.push(
        `📞 ${todayCalls.length} call${todayCalls.length > 1 ? 's' : ''} today: ${todayCalls.map((c) => `${c.clientName} (${c.purpose ?? 'call'})`).join(', ')}`
      )
    }
  }

  // Open inquiries needing attention
  if (context.openInquiryCount > 0) {
    items.push(
      `📬 ${context.openInquiryCount} open inquir${context.openInquiryCount === 1 ? 'y' : 'ies'}`
    )
  }

  if (items.length === 0) return ''

  return `\nDAILY BRIEFING (include this naturally in your first response if the chef hasn't asked something specific — use it as a "Good [time], chef" opener):
${items.join('\n')}
Keep it breezy — don't list everything robotically. Lead with the most urgent item and mention 1-2 others.`
}

// ─── Workload Awareness (deterministic — event density analysis) ─────────────
// Detects when the chef has a heavy week and adjusts advice accordingly.

function getWorkloadContext(context: Awaited<ReturnType<typeof loadRemyContext>>): string {
  if (!context.upcomingEvents || context.upcomingEvents.length === 0) return ''

  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  const thisWeekEvents = context.upcomingEvents.filter(
    (e) => e.date && e.date >= todayStr && e.date <= weekEndStr
  )

  if (thisWeekEvents.length >= 5) {
    return '\nWORKLOAD ALERT: The chef has 5+ events this week — they are PACKED. Be extra efficient in responses. Discourage taking on new bookings unless asked. Prioritize prep tips and time management.'
  }
  if (thisWeekEvents.length >= 3) {
    return '\nWORKLOAD NOTE: Busy week ahead (3+ events). Be mindful of time pressure when making suggestions. Focus on efficiency.'
  }
  return ''
}

// ─── Repeat Question Detection (deterministic — word overlap) ────────────────
// Detects when the chef is asking something similar to a previous message in
// this conversation. If so, instructs Remy to give a different/better answer.

function detectRepeatQuestion(currentMessage: string, history: RemyMessage[]): string | null {
  const currentWords = new Set(
    currentMessage
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )
  if (currentWords.size < 3) return null // Too short to meaningfully compare

  const previousUserMessages = history.filter((m) => m.role === 'user').map((m) => m.content)

  for (const prev of previousUserMessages) {
    const prevWords = new Set(
      prev
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    )
    if (prevWords.size < 3) continue

    // Calculate word overlap ratio
    let overlap = 0
    for (const word of currentWords) {
      if (prevWords.has(word)) overlap++
    }
    const overlapRatio = overlap / Math.min(currentWords.size, prevWords.size)

    if (overlapRatio >= 0.7) {
      return "\nREPEAT QUESTION DETECTED: The chef is asking something very similar to an earlier message in this conversation. They probably weren't satisfied with your previous answer. Give a DIFFERENT, MORE DETAILED response this time. Don't repeat the same answer — add new information, try a different angle, or ask what specifically they're looking for."
    }
  }

  return null
}

function buildRemySystemPrompt(
  context: Awaited<ReturnType<typeof loadRemyContext>>,
  memories: RemyMemory[] = [],
  focusMode: boolean = false,
  userMessage?: string,
  isFirstMessage: boolean = false,
  conversationHistory: RemyMessage[] = []
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

  // Time awareness — Remy knows when it is
  const now = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const hour = now.getHours()
  const timeOfDay =
    hour < 6
      ? 'late night'
      : hour < 12
        ? 'morning'
        : hour < 17
          ? 'afternoon'
          : hour < 21
            ? 'evening'
            : 'night'

  // Seasonal & holiday awareness (deterministic — pure date math)
  const month = now.getMonth() // 0-11
  const day = now.getDate()
  const season =
    month >= 2 && month <= 4
      ? 'spring'
      : month >= 5 && month <= 7
        ? 'summer'
        : month >= 8 && month <= 10
          ? 'fall'
          : 'winter'

  const seasonalContext = getSeasonalContext(month, day, season)

  parts.push(`\nCURRENT TIME: ${dayNames[now.getDay()]}, ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (${timeOfDay})
Season: ${season}${seasonalContext ? ` — ${seasonalContext}` : ''}
Be aware of the time — if it's early morning or late at night, acknowledge it naturally. If an event is tomorrow, convey urgency. Match energy to the moment.
Use seasonal awareness naturally — mention what's in season, upcoming holidays that affect bookings, or busy/slow periods when relevant to the conversation.`)

  // Workload awareness
  const workload = getWorkloadContext(context)
  if (workload) parts.push(workload)

  // Daily briefing (only on first message of a new conversation)
  if (isFirstMessage) {
    const briefing = buildDailyBriefing(context)
    if (briefing) parts.push(briefing)
  }

  // Business context
  parts.push(`\nBUSINESS CONTEXT:
- Business: ${context.businessName ?? 'Your business'}${context.tagline ? ` — "${context.tagline}"` : ''}
- Clients: ${context.clientCount} total
- Upcoming events: ${context.upcomingEventCount}
- Open inquiries: ${context.openInquiryCount}${context.pendingQuoteCount ? `\n- Pending quotes: ${context.pendingQuoteCount}` : ''}${context.monthRevenueCents !== undefined ? `\n- Month revenue: $${(context.monthRevenueCents / 100).toFixed(2)}` : ''}`)

  // Service configuration (what this chef offers and doesn't offer)
  if (context.serviceConfigPrompt) {
    parts.push(`\n${context.serviceConfigPrompt}`)
  }

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

  // Business intelligence summary (cross-engine synthesis)
  if (context.businessIntelligence) {
    parts.push(`\nBUSINESS INTELLIGENCE (from 25 analytics engines — use when discussing business health, pricing, growth, or client retention):
${context.businessIntelligence}
Reference these insights when the chef asks about their business, pricing strategy, client health, capacity, or growth.`)
  }

  // Revenue pattern awareness
  if (context.revenuePattern) {
    const rp = context.revenuePattern
    parts.push(
      `\nREVENUE PATTERN: Busiest month: ${rp.busiestMonth}, Slowest month: ${rp.slowestMonth}, Monthly avg: $${(rp.monthlyAvgCents / 100).toFixed(0)}. Use this when discussing bookings, pricing, or business strategy — suggest filling slow months with promotions or raising rates during peak months.`
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

  // Proactive nudge instructions — surface urgent items once per conversation
  const nudgeItems: string[] = []
  if (context.staleInquiries && context.staleInquiries.length > 0) {
    const urgentOnes = context.staleInquiries.filter((i) => i.leadScore >= 60)
    const regularOnes = context.staleInquiries.filter((i) => i.leadScore < 60)
    if (urgentOnes.length > 0) {
      nudgeItems.push(
        `🔴 HIGH-VALUE LEADS GOING COLD: ${urgentOnes.map((i) => `${i.leadName} (score: ${i.leadScore}, ${i.daysSinceContact} days stale — respond ASAP)`).join('; ')}`
      )
    }
    if (regularOnes.length > 0) {
      nudgeItems.push(
        `${regularOnes.length} stale inquir${regularOnes.length === 1 ? 'y' : 'ies'} (>3 days without response): ${regularOnes.map((i) => `${i.leadName} (${i.daysSinceContact}d)`).join(', ')}`
      )
    }
  }
  if (context.overduePayments && context.overduePayments.length > 0) {
    nudgeItems.push(
      `${context.overduePayments.length} overdue payment${context.overduePayments.length === 1 ? '' : 's'}: ${context.overduePayments.map((p) => `${p.clientName} ($${(p.amountCents / 100).toFixed(0)})`).join(', ')}`
    )
  }
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    const imminent = context.upcomingEvents.filter((e) => {
      if (!e.date) return false
      const eventDate = new Date(e.date)
      const hoursUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60)
      return hoursUntil > 0 && hoursUntil < 48
    })
    if (imminent.length > 0) {
      nudgeItems.push(
        `${imminent.length} event${imminent.length === 1 ? '' : 's'} in the next 48 hours: ${imminent.map((e) => `${e.occasion ?? 'Event'} for ${e.clientName}`).join(', ')}`
      )
    }
  }
  if (context.clientReengagement && context.clientReengagement.length > 0) {
    nudgeItems.push(
      `${context.clientReengagement.length} client${context.clientReengagement.length === 1 ? '' : 's'} overdue for a booking: ${context.clientReengagement.map((c) => `${c.clientName} (usually every ~${c.avgIntervalDays} days, last booked ${c.daysSinceLastBooking} days ago)`).join('; ')}`
    )
  }
  if (nudgeItems.length > 0) {
    parts.push(`\nPROACTIVE AWARENESS (mention these ONCE if relevant, don't repeat every message):
${nudgeItems.map((n) => `- ${n}`).join('\n')}
If the chef's question relates to one of these, weave it in naturally. Otherwise, mention at the end of your FIRST response only — "By the way..." or "Quick heads up..." — then drop it.`)
  }

  // Navigation routes (scoped by Focus Mode)
  parts.push(`\n${focusMode ? NAV_ROUTE_MAP_FOCUS : NAV_ROUTE_MAP}`)

  // Sentiment-adaptive tone (deterministic detection from user message)
  if (userMessage) {
    const sentiment = detectSentiment(userMessage)
    const sentimentInstruction = getSentimentInstruction(sentiment)
    if (sentimentInstruction) parts.push(sentimentInstruction)
  }

  // Grounding rule — critical for preventing hallucinations
  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference clients, events, inquiries, and facts that appear in the BUSINESS CONTEXT, UPCOMING EVENTS, RECENT CLIENTS, or WHAT YOU REMEMBER sections above.
If a section says "0" or is empty, that means there are NONE — do not invent any.
If you have no data to work with, be honest: "Looks like you're just getting started" or "I don't see any events yet."
NEVER fabricate names, dates, or details to sound helpful.`)

  // Repeat question detection (deterministic — word overlap analysis)
  if (userMessage && conversationHistory.length > 0) {
    const repeatInstruction = detectRepeatQuestion(userMessage, conversationHistory)
    if (repeatInstruction) parts.push(repeatInstruction)
  }

  // Response instructions
  parts.push(`\nRESPONSE FORMAT:
Return JSON: { "response": "your text reply", "navSuggestions": [{ "label": "Page Name", "href": "/route", "description": "optional" }] }
Only include navSuggestions when genuinely helpful — don't spam links on every response.
Present all suggestions as drafts. Never claim to have taken autonomous actions.`)

  return parts.join('\n')
}

// ─── Conversation History Formatter ─────────────────────────────────────────

function summarizeDroppedMessages(dropped: RemyMessage[]): string {
  if (dropped.length === 0) return ''

  // Extract key topics from dropped messages to preserve context
  const chefMessages = dropped.filter((m) => m.role === 'user').map((m) => m.content)
  const remyActions = dropped
    .filter((m) => m.role === 'remy' && m.tasks && m.tasks.length > 0)
    .flatMap((m) => m.tasks!.map((t) => t.name || t.taskType))

  const topics: string[] = []
  if (chefMessages.length > 0) {
    // Take first 80 chars of each chef message as topic hints
    const snippets = chefMessages.map((msg) => msg.slice(0, 80).replace(/\n/g, ' '))
    topics.push(`Chef discussed: ${snippets.join('; ')}`)
  }
  if (remyActions.length > 0) {
    topics.push(`Actions taken: ${[...new Set(remyActions)].join(', ')}`)
  }

  return `[Earlier in this conversation (${dropped.length} messages summarized): ${topics.join('. ')}]\n\n`
}

function formatConversationHistory(history: RemyMessage[]): string {
  if (history.length === 0) return ''

  const MAX_RECENT = 10

  // If history fits, no summarization needed
  if (history.length <= MAX_RECENT) {
    const formatted = history
      .map((m) => `${m.role === 'user' ? 'Chef' : 'Remy'}: ${m.content}`)
      .join('\n')
    return `Previous conversation:\n${formatted}\n\n`
  }

  // Summarize older messages, keep recent ones verbatim
  const dropped = history.slice(0, -MAX_RECENT)
  const recent = history.slice(-MAX_RECENT)

  const summary = summarizeDroppedMessages(dropped)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Chef' : 'Remy'}: ${m.content}`)
    .join('\n')

  return `${summary}Previous conversation:\n${formatted}\n\n`
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
    relatedClientName: m.relatedClientName,
    createdAt: m.createdAt,
    source: m.source,
    editable: m.editable,
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

  // Enhanced category detection from the fact (synced with streaming path)
  let category: MemoryCategory = 'chef_preference'
  const lower = fact.toLowerCase()
  // Client-related: names, pronouns, dietary info, relationship details
  if (
    /\b(client|customer|they|their|he|she|his|her|allergic|allergy|vegetarian|vegan|gluten|lactose|nut|shellfish|celiac|kosher|halal|family|couple|husband|wife|daughter|son|likes|prefers|hates|loves|favorite|anniversary|birthday)\b/i.test(
      lower
    )
  ) {
    category = 'client_insight'
    // Pricing: rates, costs, margins, financial patterns
  } else if (
    /\b(price|charge|cost|rate|per\s+person|per\s+head|margin|quote|minimum|deposit|flat\s+fee|hourly|tip|gratuity|markup|food\s+cost|overhead)\b/i.test(
      lower
    )
  ) {
    category = 'pricing_pattern'
    // Scheduling: days, times, availability, booking patterns
  } else if (
    /\b(schedule|book|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|evening|afternoon|night|day\s+before|day\s+of|lead\s+time|advance|last\s+minute|buffer|travel\s+time|off\s+day|vacation|blackout)\b/i.test(
      lower
    )
  ) {
    category = 'scheduling_pattern'
    // Communication: how they write, email style, preferences
  } else if (
    /\b(email|draft|message|write|tone|formal|casual|text|call|phone|respond|reply|follow\s+up|signature|sign\s+off|greeting|close)\b/i.test(
      lower
    )
  ) {
    category = 'communication_style'
    // Business rules: hard constraints, policies, never/always rules
  } else if (
    /\b(never|always|rule|policy|require|must|won'?t|don'?t|refuse|only|no\s+exceptions|non-?negotiable|standard|guarantee|insurance|liability|contract)\b/i.test(
      lower
    )
  ) {
    category = 'business_rule'
    // Culinary: food preferences, techniques, ingredients, kitchen
  } else if (
    /\b(recipe|cook|dish|ingredient|organic|sauce|braise|sear|menu|plating|garnish|seasoning|spice|herb|wine|pairing|ferment|smoke|cure|sous\s+vide|grill|bake|roast|fry|local|farm|seasonal|forage|butcher|fishmonger|purveyor|vendor|supplier)\b/i.test(
      lower
    )
  ) {
    category = 'culinary_note'
    // Workflow: operational patterns, processes, routines
  } else if (
    /\b(workflow|prep|shop|process|order|system|routine|checklist|setup|breakdown|cleanup|station|equipment|kit|cooler|transport|pack|label|store|freeze|thaw|batch|mise\s+en\s+place)\b/i.test(
      lower
    )
  ) {
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
          const systemPrompt = buildRemySystemPrompt(
            context,
            memories,
            focusMode,
            questionInput,
            conversationHistory.length === 0,
            conversationHistory
          )
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

    // ─── INSTANT ANSWER path (Formula > AI — skip Ollama for simple facts) ──
    if (classification.intent === 'question') {
      const instant = tryInstantAnswer(userMessage, context)
      if (instant) {
        return {
          text: instant.text,
          intent: 'question',
          navSuggestions: instant.navSuggestions ?? undefined,
        }
      }
    }

    // ─── QUESTION path (default) ──────────────────────────────────────
    const systemPrompt = buildRemySystemPrompt(
      context,
      memories,
      focusMode,
      userMessage,
      conversationHistory.length === 0,
      conversationHistory
    )
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
