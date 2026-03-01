// Remy — Streaming Chat API Route
// PRIVACY: Processes chef messages with full business context — must stay local via Ollama.
// Uses Server-Sent Events (SSE) to stream token-by-token responses.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Ollama } from 'ollama'
import { requireChef } from '@/lib/auth/get-user'
import { loadRemyContext, resolveMessageEntities } from '@/lib/ai/remy-context'
import { classifyIntent } from '@/lib/ai/remy-classifier'
import { runCommand } from '@/lib/ai/command-orchestrator'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import { computeDynamicContext, getOllamaPiUrl, getModelForEndpoint } from '@/lib/ai/providers'
import { routeForRemy } from '@/lib/ai/llm-router'
import { getEndpointSnapshot } from '@/lib/ai/cross-monitor'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import {
  REMY_PERSONALITY,
  REMY_FEW_SHOT_EXAMPLES,
  REMY_DRAFT_INSTRUCTIONS,
  REMY_PRIVACY_NOTE,
  REMY_TOPIC_GUARDRAILS,
  REMY_ANTI_INJECTION,
} from '@/lib/ai/remy-personality'
import { getArchetype } from '@/lib/ai/remy-archetypes'
import { getRemyArchetype } from '@/lib/ai/privacy-actions'
import { getCulinaryProfileForPrompt } from '@/lib/ai/chef-profile-actions'
import { getFavoriteChefs } from '@/lib/favorite-chefs/actions'
import { validateRemyInput, checkRemyRateLimit } from '@/lib/ai/remy-guardrails'
import {
  validateRemyRequestBody,
  validateHistory,
  sanitizeErrorForClient,
  checkRecipeGenerationBlock,
} from '@/lib/ai/remy-input-validation'
import { isRemyBlocked, isRemyAdmin, logRemyAbuse } from '@/lib/ai/remy-abuse-actions'
import { acquireInteractiveLock, releaseInteractiveLock, isSlotBusy } from '@/lib/ai/queue'
import {
  loadRelevantMemories,
  listRemyMemories,
  addRemyMemoryManual,
} from '@/lib/ai/remy-memory-actions'
import { recordRemyMetric } from '@/lib/ai/remy-metrics'
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
/settings/ai-privacy - Remy settings, personality archetype, privacy & data controls
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
  favoriteChefs?: string,
  archetypeId?: string | null,
  recentPages?: Array<{ path: string; label: string; at: string }>,
  recentActions?: Array<{ action: string; entity: string; at: string }>,
  recentErrors?: Array<{ message: string; context: string; at: string }>,
  sessionMinutes?: number,
  activeForm?: string
): string {
  const parts: string[] = []

  parts.push(REMY_PERSONALITY)

  // Inject personality archetype modifier (chef-selected or default)
  const archetype = getArchetype(archetypeId)
  parts.push(`\n${archetype.promptModifier}`)

  // Few-shot examples — show Remy how to respond, not just what to be
  parts.push(REMY_FEW_SHOT_EXAMPLES)

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

  // Current timestamp — so Remy knows the time, day, and date
  const now = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  parts.push(`\nCURRENT TIME: ${timeStr} on ${dayNames[now.getDay()]}, ${dateStr}`)

  parts.push(`\nBUSINESS CONTEXT:
- Business: ${context.businessName ?? 'Your business'}${context.tagline ? ` — "${context.tagline}"` : ''}
- Clients: ${context.clientCount} total
- Upcoming events: ${context.upcomingEventCount}
- Open inquiries: ${context.openInquiryCount}${context.pendingQuoteCount ? `\n- Pending quotes: ${context.pendingQuoteCount}` : ''}${context.monthRevenueCents !== undefined ? `\n- Month revenue: $${(context.monthRevenueCents / 100).toFixed(2)}` : ''}`)

  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    parts.push(`\nUPCOMING EVENTS:
${context.upcomingEvents
  .map((e) => {
    const loyaltySuffix =
      e.clientLoyaltyTier || typeof e.clientLoyaltyPoints === 'number'
        ? `, loyalty ${e.clientLoyaltyTier ?? 'tier unknown'}${typeof e.clientLoyaltyPoints === 'number' ? ` (${e.clientLoyaltyPoints} pts)` : ''}`
        : ''
    return `- ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status}${loyaltySuffix})`
  })
  .join('\n')}`)
  }

  if (context.recentClients && context.recentClients.length > 0) {
    parts.push(
      `\nRECENT CLIENTS: ${context.recentClients
        .map((c) =>
          c.tier || typeof c.pointsBalance === 'number'
            ? `${c.name} [${c.tier ?? 'tier unknown'}${typeof c.pointsBalance === 'number' ? `, ${c.pointsBalance} pts` : ''}]`
            : c.name
        )
        .join(', ')}`
    )
  }

  // Daily plan — what's on the chef's plate today
  if (context.dailyPlan && context.dailyPlan.totalItems > 0) {
    const dp = context.dailyPlan
    parts.push(`\nTODAY'S DAILY PLAN (${dp.totalItems} items, ~${dp.estimatedMinutes} min):
- Quick Admin: ${dp.adminItems} items
- Event Prep: ${dp.prepItems} items
- Creative Time: ${dp.creativeItems} items
- Relationship: ${dp.relationshipItems} items
The chef can see the full structured view at /daily.`)
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

  // Calendar & Availability
  if (context.calendarSummary) {
    const cal = context.calendarSummary
    const sections: string[] = []
    if (cal.blockedDates.length > 0) {
      sections.push(
        `Blocked dates (next 30 days): ${cal.blockedDates.map((b) => `${b.date} (${b.reason})`).join(', ')}`
      )
    }
    if (cal.calendarEntries.length > 0) {
      sections.push(
        `Calendar entries: ${cal.calendarEntries.map((c) => `${c.title} ${c.startDate}–${c.endDate} [${c.type.replace(/_/g, ' ')}]${c.blocksBookings ? ' BLOCKS BOOKINGS' : ''}`).join('; ')}`
      )
    }
    if (cal.waitlistEntries.length > 0) {
      sections.push(
        `Waitlist: ${cal.waitlistEntries.map((w) => `${w.clientName} wants ${w.date}${w.occasion ? ` for ${w.occasion}` : ''} [${w.status}]`).join('; ')}`
      )
    }
    if (sections.length > 0) {
      parts.push(`\nCALENDAR & AVAILABILITY:\n${sections.join('\n')}`)
    }
  }

  // Yearly stats
  if (context.yearlyStats) {
    const y = context.yearlyStats
    parts.push(`\nYEAR-TO-DATE STATS:
- Revenue: $${(y.yearRevenueCents / 100).toFixed(2)}
- Expenses: $${(y.yearExpenseCents / 100).toFixed(2)}
- Net: $${((y.yearRevenueCents - y.yearExpenseCents) / 100).toFixed(2)}
- Events: ${y.totalEventsThisYear} total, ${y.completedEventsThisYear} completed
- Avg revenue/event: $${(y.avgEventRevenueCents / 100).toFixed(2)}${y.topClients.length > 0 ? `\n- Top clients: ${y.topClients.map((c) => `${c.name} ($${(c.revenueCents / 100).toFixed(2)}, ${c.eventCount} events)`).join('; ')}` : ''}`)
  }

  // Staff roster
  if (context.staffRoster && context.staffRoster.length > 0) {
    parts.push(`\nSTAFF ROSTER (${context.staffRoster.length}):
${context.staffRoster.map((s) => `- ${s.name} (${s.role.replace(/_/g, ' ')})${s.phone ? ` ${s.phone}` : ''}`).join('\n')}`)
  }

  // Equipment
  if (context.equipmentSummary && context.equipmentSummary.totalItems > 0) {
    parts.push(
      `\nEQUIPMENT: ${context.equipmentSummary.totalItems} items across ${context.equipmentSummary.categories.join(', ')}`
    )
  }

  // Goals
  if (context.activeGoals && context.activeGoals.length > 0) {
    parts.push(`\nACTIVE GOALS (${context.activeGoals.length}):
${context.activeGoals.map((g) => `- ${g.title}${g.targetDate ? ` (due ${g.targetDate})` : ''}${g.progress !== null ? ` ${g.progress}%` : ''} [${g.status}]`).join('\n')}`)
  }

  // Todos
  if (context.activeTodos && context.activeTodos.length > 0) {
    parts.push(`\nTODO LIST (${context.activeTodos.length}):
${context.activeTodos.map((t) => `- ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''} [${t.priority}] ${t.status}`).join('\n')}`)
  }

  // Scheduled calls
  if (context.upcomingCalls && context.upcomingCalls.length > 0) {
    parts.push(`\nUPCOMING CALLS (${context.upcomingCalls.length}):
${context.upcomingCalls.map((c) => `- ${c.clientName} at ${new Date(c.scheduledAt).toLocaleString()}${c.purpose ? ` — ${c.purpose}` : ''}`).join('\n')}`)
  }

  // Documents
  if (
    context.documentSummary &&
    (context.documentSummary.totalDocuments > 0 || context.documentSummary.totalFolders > 0)
  ) {
    parts.push(
      `\nDOCUMENTS: ${context.documentSummary.totalDocuments} documents in ${context.documentSummary.totalFolders} folders`
    )
  }

  // Recent Remy artifacts
  if (context.recentArtifacts && context.recentArtifacts.length > 0) {
    parts.push(`\nRECENT REMY WORK (what you recently created):
${context.recentArtifacts.map((a) => `- ${a.type.replace(/_/g, ' ')}: ${a.title} (${new Date(a.createdAt).toLocaleDateString()})`).join('\n')}`)
  }

  // ─── Context enrichment sections (2026-02-28) ───────────────────────────

  // Recipe library stats
  if (context.recipeStats && context.recipeStats.totalRecipes > 0) {
    parts.push(
      `\nRECIPE LIBRARY: ${context.recipeStats.totalRecipes} recipes across ${context.recipeStats.categories.join(', ')}`
    )
  }

  // Client vibe notes + dietary/allergy data (safety-critical info first)
  if (context.clientVibeNotes && context.clientVibeNotes.length > 0) {
    // Separate clients with allergies for prominent display
    const clientsWithAllergies = context.clientVibeNotes.filter(
      (c) => c.allergies.length > 0 || c.dietaryRestrictions.length > 0
    )
    if (clientsWithAllergies.length > 0) {
      parts.push(`\n⚠️ CLIENT DIETARY & ALLERGY DATA (SAFETY-CRITICAL — always flag prominently):
${clientsWithAllergies
  .map((c) => {
    const lines: string[] = [`- ${c.name}:`]
    if (c.allergies.length > 0) lines.push(`  ALLERGIES: ${c.allergies.join(', ').toUpperCase()}`)
    if (c.dietaryRestrictions.length > 0)
      lines.push(`  Dietary: ${c.dietaryRestrictions.join(', ')}`)
    // Extract safety notes from vibe_notes
    const vibeUpper = c.vibeNotes.toUpperCase()
    if (
      vibeUpper.includes('ALLERGY') ||
      vibeUpper.includes('EPIPEN') ||
      vibeUpper.includes('SEVERE')
    ) {
      const sentences = c.vibeNotes.split(/[.!]\s+/)
      const safetySentences = sentences.filter((s: string) => {
        const su = s.toUpperCase()
        return (
          su.includes('ALLERGY') ||
          su.includes('EPIPEN') ||
          su.includes('SEVERE') ||
          su.includes('CROSS-CONTAM')
        )
      })
      if (safetySentences.length > 0) lines.push(`  ⚠️ ${safetySentences.join('. ')}`)
    }
    return lines.join('\n')
  })
  .join('\n')}
When asked about these clients' dietary needs, ALWAYS prominently flag allergies. This is safety-critical.`)
    }

    parts.push(`\nCLIENT VIBE NOTES (personality & communication style):
${context.clientVibeNotes.map((c) => `- ${c.name}: ${c.vibeNotes}`).join('\n')}
Use these to personalize communication — draft emails and messages that match each client's vibe.`)
  }

  // Recent after-action review insights
  if (context.recentAARInsights && context.recentAARInsights.length > 0) {
    const aars = context.recentAARInsights.filter(
      (a) => a.lessonsLearned || a.wentWell || a.toImprove
    )
    if (aars.length > 0) {
      parts.push(`\nRECENT LESSONS LEARNED (from after-action reviews):
${aars
  .map((a) => {
    const parts: string[] = []
    if (a.wentWell) parts.push(`✅ ${a.wentWell}`)
    if (a.toImprove) parts.push(`⚠️ ${a.toImprove}`)
    if (a.lessonsLearned) parts.push(`💡 ${a.lessonsLearned}`)
    return parts.join(' | ')
  })
  .join('\n')}
Reference these when relevant — help the chef avoid past mistakes and repeat successes.`)
    }
  }

  // Pending menu approvals
  if (context.pendingMenuApprovals && context.pendingMenuApprovals.length > 0) {
    parts.push(
      `\n📋 PENDING MENU APPROVALS (${context.pendingMenuApprovals.length}): ${context.pendingMenuApprovals.map((m) => m.clientName).join(', ')} — waiting for client response`
    )
  }

  // Unread inquiry messages
  if (context.unreadInquiryMessages && context.unreadInquiryMessages.length > 0) {
    const unique = [...new Set(context.unreadInquiryMessages.map((m) => m.leadName))]
    parts.push(
      `\n📬 UNREAD INQUIRY MESSAGES (${context.unreadInquiryMessages.length}): from ${unique.join(', ')} — need a response`
    )
  }

  // Navigation trail — what pages the chef visited this session
  if (recentPages && recentPages.length > 0) {
    const trail = recentPages.map((p) => {
      const time = new Date(p.at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `- ${time}: ${p.label} (${p.path})`
    })
    parts.push(`\nSESSION NAVIGATION (where the chef has been this session, oldest→newest):
${trail.join('\n')}
This shows the chef's workflow — what they've been looking at and in what order. Use it to understand their current focus.`)
  }

  // Recent mutations — what the chef just did in the app
  if (recentActions && recentActions.length > 0) {
    const actions = recentActions.map((a) => {
      const time = new Date(a.at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `- ${time}: ${a.action} — ${a.entity}`
    })
    parts.push(`\nRECENT ACTIONS (what the chef just did in the app):
${actions.join('\n')}
These are real actions the chef just took. Reference them when relevant — e.g. "I see you just created that event, want me to draft a confirmation?"`)
  }

  // Recent errors — help the chef if they hit problems
  if (recentErrors && recentErrors.length > 0) {
    const errs = recentErrors.map((e) => {
      const time = new Date(e.at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `- ${time}: "${e.message}" (while: ${e.context})`
    })
    parts.push(`\nRECENT ERRORS (the chef hit these problems):
${errs.join('\n')}
If the chef seems frustrated or asks about something failing, these errors are context. Proactively acknowledge if relevant — "I saw that didn't work earlier — let's figure it out."`)
  }

  // Session duration — how long the chef has been working
  if (sessionMinutes && sessionMinutes > 0) {
    const hours = Math.floor(sessionMinutes / 60)
    const mins = sessionMinutes % 60
    const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`
    parts.push(`\nSESSION DURATION: The chef has been active for ${duration} this session.`)
    if (sessionMinutes > 120) {
      parts.push(
        `That's a long session — they're grinding. Be efficient and sharp, don't waste their time.`
      )
    }
  }

  // Active form — what the chef is currently working on
  if (activeForm) {
    parts.push(
      `\nCURRENTLY WORKING ON: The chef is in the middle of "${activeForm}". If they ask a question, it's probably related to this. Keep answers contextual.`
    )
  }

  if (context.currentPage) {
    parts.push(
      `\nThe chef is currently on the ${context.currentPage} page. Consider this when making suggestions.`
    )
  }

  if (context.pageEntity) {
    parts.push(`\nCURRENTLY VIEWING (${context.pageEntity.type.toUpperCase()} DETAIL PAGE):
${context.pageEntity.summary}
Use this data to give specific, informed answers about what the chef is looking at. You know exactly what's on their screen.`)
  }

  if (context.mentionedEntities && context.mentionedEntities.length > 0) {
    parts.push(`\nMENTIONED IN MESSAGE (auto-resolved from chef's message):
${context.mentionedEntities.map((e) => `--- ${e.type.toUpperCase()} ---\n${e.summary}`).join('\n\n')}
The chef mentioned these by name. Use this data to answer their question accurately.`)
  }

  const memoryBlock = formatMemoriesForPrompt(memories)
  if (memoryBlock) {
    parts.push(memoryBlock)
  }

  parts.push(`\n${NAV_ROUTE_MAP}`)

  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference data that appears in the sections above. You have access to:
ALWAYS AVAILABLE: Current time/date, business context, upcoming events, recent clients, today's daily plan (admin/prep/creative/relationship items), email inbox digest (last 24h), session navigation trail (pages visited this session), recent actions (mutations the chef just performed), calendar & availability (blocked dates, calendar entries, waitlist), year-to-date stats (revenue, expenses, top clients), staff roster, equipment inventory, active goals, todo list, upcoming calls, document counts, recent Remy artifacts, and memories.
ON EVENT PAGES: Ledger entries (payments), expenses, staff assignments, temp logs, quotes, status history, menu approval, grocery quotes, and after-action reviews.
ON CLIENT PAGES: Full event history, client notes, and client reviews.
ON INQUIRY PAGES: Full message thread.
Use all available data when answering questions — never say "I don't have that info" if it's in one of these sections.
If a section says "0" or is empty, that means there are NONE — do not invent any.
NEVER fabricate names, dates, amounts, or details to sound helpful.`)

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

// ─── Pi Test Detection (Admin Only) ──────────────────────────────────────────

const PI_TEST_PATTERNS = [
  /\brun\s+(a\s+)?test\b/i,
  /\btest\s+the\s+pi\b/i,
  /\bping\s+(the\s+)?pi\b/i,
  /\bpi\s+test\b/i,
  /\btest\s+raspberry\b/i,
]

function detectPiTestIntent(message: string): boolean {
  return PI_TEST_PATTERNS.some((p) => p.test(message))
}

async function handlePiTest(): Promise<Response> {
  const encoder = new TextEncoder()
  const piUrl = getOllamaPiUrl()

  if (!piUrl) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'pi-test' })))
        controller.enqueue(
          encoder.encode(
            encodeSSE({
              type: 'token',
              data: '**Pi Test — FAILED**\n\nNo `OLLAMA_PI_URL` configured in environment. Set it in `.env.local` and restart the dev server.',
            })
          )
        )
        controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
        controller.close()
      },
    })
    return new Response(stream, { headers: sseHeaders() })
  }

  const piModel = getModelForEndpoint('pi', 'standard')
  const startTime = Date.now()

  // Step 1: Ping the Pi
  let pingOk = false
  try {
    const res = await fetch(`${piUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    pingOk = res.ok
  } catch {
    // unreachable
  }

  if (!pingOk) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'pi-test' })))
        controller.enqueue(
          encoder.encode(
            encodeSSE({
              type: 'token',
              data: `**Pi Test — UNREACHABLE**\n\nCould not reach the Pi endpoint. Check that Ollama is running on the Pi and the network is connected.`,
            })
          )
        )
        controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
        controller.close()
      },
    })
    return new Response(stream, { headers: sseHeaders() })
  }

  const pingMs = Date.now() - startTime

  // Step 2: Send a simple chat to verify the model responds
  let modelResponse = ''
  let chatMs = 0
  try {
    const chatStart = Date.now()
    const ollama = new Ollama({ host: piUrl })
    const res = await (ollama.chat({
      model: piModel,
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond in one sentence.' },
        { role: 'user', content: 'Say hello and confirm you are running.' },
      ],
      options: { num_predict: 64 },
      keep_alive: '5m',
      think: false,
    } as any) as any)
    modelResponse = res.message?.content ?? '(no response)'
    chatMs = Date.now() - chatStart
  } catch (err) {
    modelResponse = `Error: ${err instanceof Error ? err.message : String(err)}`
  }

  const totalMs = Date.now() - startTime

  const report = [
    '**Pi Test — SUCCESS**\n',
    `| Detail | Value |`,
    `|--------|-------|`,
    `| Endpoint | Pi (configured) |`,
    `| Model | \`${piModel}\` |`,
    `| Ping | ${pingMs}ms |`,
    `| Chat response | ${chatMs}ms |`,
    `| Total | ${totalMs}ms |`,
    '',
    `**Pi says:** ${modelResponse}`,
  ].join('\n')

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'pi-test' })))
      controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: report })))
      controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))
      controller.close()
    },
  })
  return new Response(stream, { headers: sseHeaders() })
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
    } else if (task.taskType === 'ops.portion_calc' && task.data) {
      const d = task.data as {
        recipeName: string
        originalYield: number
        targetGuests: number
        scaleFactor: number
        ingredients: Array<{ name: string; originalQty: string; scaledQty: string; unit: string }>
        summary: string
      }
      if (d.ingredients.length === 0) {
        summaries.push(d.summary)
      } else {
        const lines = [
          `**${d.recipeName}** — scaled from ${d.originalYield} to ${d.targetGuests} servings (${d.scaleFactor}x)\n`,
        ]
        for (const ing of d.ingredients) {
          lines.push(`- ${ing.scaledQty} ${ing.unit} ${ing.name} _(was ${ing.originalQty})_`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'ops.packing_list' && task.data) {
      const d = task.data as {
        eventName: string
        guestCount: number
        categories: Array<{
          name: string
          items: Array<{ item: string; quantity: string; notes?: string }>
        }>
        summary: string
      }
      if (d.categories.length === 0) {
        summaries.push(d.summary)
      } else {
        const lines = [`**Packing List: ${d.eventName}** (${d.guestCount} guests)\n`]
        for (const cat of d.categories) {
          lines.push(`**${cat.name}:**`)
          for (const item of cat.items) {
            lines.push(`- ${item.quantity} × ${item.item}${item.notes ? ` _(${item.notes})_` : ''}`)
          }
          lines.push('')
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'ops.cross_contamination' && task.data) {
      const d = task.data as {
        eventName: string
        clientName: string
        risks: Array<{ severity: string; allergen: string; menuItem: string; message: string }>
        safePractices: string[]
        summary: string
      }
      const lines = [d.summary]
      if (d.risks.length > 0) {
        lines.push('')
        for (const r of d.risks) {
          const icon = r.severity === 'critical' ? 'CRITICAL' : 'Warning'
          lines.push(`- **${icon}**: ${r.message}`)
        }
      }
      if (d.safePractices.length > 0) {
        lines.push('\n**Safe Practices:**')
        for (const p of d.safePractices) lines.push(`- ${p}`)
      }
      summaries.push(lines.join('\n'))
    } else if (task.taskType === 'analytics.break_even' && task.data) {
      const d = task.data as {
        eventName: string
        revenueCents: number
        profitCents: number
        marginPct: number
        breakEvenGuests: number
        guestCount: number
        summary: string
      }
      summaries.push(d.summary)
    } else if (task.taskType === 'analytics.client_ltv' && task.data) {
      const d = task.data as {
        clientName: string
        totalRevenueCents: number
        eventCount: number
        avgEventRevenueCents: number
        tier: string
        tenureDays: number
        summary: string
      }
      summaries.push(d.summary)
    } else if (task.taskType === 'analytics.recipe_cost' && task.data) {
      const d = task.data as {
        recipeName: string
        currentCostCents: number
        suggestions: Array<{
          ingredient: string
          currentCost: string
          suggestion: string
          estimatedSaving: string
        }>
        summary: string
      }
      if (d.suggestions.length === 0) {
        summaries.push(d.summary)
      } else {
        const lines = [`**${d.recipeName}** — $${(d.currentCostCents / 100).toFixed(2)} total\n`]
        for (const s of d.suggestions) {
          lines.push(
            `- **${s.ingredient}** (${s.currentCost}): ${s.suggestion} — save ~${s.estimatedSaving}`
          )
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'client.event_recap' && task.data) {
      const d = task.data as {
        eventName: string
        clientName: string
        date: string | null
        guestCount: number
        status: string
        menuItems: string[]
        financials: { quotedCents: number; paidCents: number; outstandingCents: number }
        summary: string
      }
      summaries.push(d.summary)
    } else if (task.taskType === 'client.menu_explanation' && task.data) {
      const d = task.data as {
        menuName: string
        eventName: string | null
        courses: Array<{ name: string; description: string | null; dietaryTags: string[] }>
        summary: string
      }
      if (d.courses.length === 0) {
        summaries.push(d.summary)
      } else {
        const lines = [`**${d.menuName}**${d.eventName ? ` _(${d.eventName})_` : ''}\n`]
        for (const c of d.courses) {
          lines.push(
            `- **${c.name}**${c.description ? `: ${c.description}` : ''}${c.dietaryTags.length > 0 ? ` [${c.dietaryTags.join(', ')}]` : ''}`
          )
        }
        summaries.push(lines.join('\n'))
      }
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
    const rawBody = await req.json()
    const validated = validateRemyRequestBody(rawBody)
    if (!validated) {
      return new Response(
        encodeSSE({ type: 'error', data: 'Invalid request — please try again.' }),
        { headers: sseHeaders() }
      )
    }
    const {
      message,
      currentPage,
      recentPages,
      recentActions,
      recentErrors,
      sessionMinutes,
      activeForm,
    } = validated
    const history = validateHistory(rawBody.history, 10) as RemyMessage[]

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

    // ─── RECIPE GENERATION BLOCK (hard rule — AI never generates recipes) ───
    const recipeBlock = checkRecipeGenerationBlock(message)
    if (recipeBlock) {
      // Return as a friendly Remy chat response, not an error
      const body =
        encodeSSE({ type: 'token', data: recipeBlock }) + encodeSSE({ type: 'done', data: null })
      return new Response(body, { headers: sseHeaders() })
    }

    // ─── PI TEST (admin only) ──────────────────────────────────────
    if (admin && detectPiTestIntent(message)) {
      return handlePiTest()
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

    // ─── INTERACTIVE LOCK: pause background worker while Remy is streaming ──
    // This prevents the AI queue worker from competing for Ollama while
    // we're streaming a response. Released in the finally block.
    acquireInteractiveLock()

    // ─── MAIN PATH: classify + load context ─────────────────────
    // Hard timeout: if the entire pre-stream setup takes >120s, bail out.
    // Classifier + context + memories usually takes 5-15s, but model swaps
    // on 6GB VRAM (RTX 3050) can add 50-60s when qwen3:4b needs to reload
    // after a 30b model was active. 120s accommodates the worst-case swap.
    const setupTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Pre-stream setup timed out after 120s')), 120_000)
    )

    let context: Awaited<ReturnType<typeof loadRemyContext>>
    let classification: Awaited<ReturnType<typeof classifyIntent>>
    let memories: Awaited<ReturnType<typeof loadRelevantMemories>>
    let culinaryProfile: string | undefined
    let favoriteChefsList: string | undefined
    let archetypeId: string | null = null

    try {
      const [ctx, cls, mems, profile, favChefs, mentioned, archetype] = (await Promise.race([
        Promise.all([
          loadRemyContext(currentPage),
          classifyIntent(message),
          loadRelevantMemories(message, undefined, undefined),
          getCulinaryProfileForPrompt(user.tenantId!).catch(() => ''),
          getFavoriteChefs().catch(() => []),
          resolveMessageEntities(message).catch((err) => {
            console.error('[non-blocking] Entity resolution failed:', err)
            return []
          }),
          getRemyArchetype().catch(() => null),
        ]),
        setupTimeout,
      ])) as [
        Awaited<ReturnType<typeof loadRemyContext>>,
        Awaited<ReturnType<typeof classifyIntent>>,
        Awaited<ReturnType<typeof loadRelevantMemories>>,
        string,
        Awaited<ReturnType<typeof getFavoriteChefs>>,
        Awaited<ReturnType<typeof resolveMessageEntities>>,
        string | null,
      ]
      context = ctx
      if (mentioned.length > 0) context.mentionedEntities = mentioned
      classification = cls
      memories = mems
      culinaryProfile = profile || undefined
      archetypeId = archetype
      if (favChefs.length > 0) {
        favoriteChefsList = favChefs
          .map((c) => `- ${c.chefName}${c.reason ? `: ${c.reason}` : ''}`)
          .join('\n')
      }
    } catch (setupErr) {
      releaseInteractiveLock()
      const msg = setupErr instanceof Error ? setupErr.message : String(setupErr)
      const isOllama =
        msg.includes('Ollama') || msg.includes('timeout') || msg.includes('timed out')
      console.error('[remy] Setup failed:', msg)
      return new Response(
        encodeSSE({
          type: 'error',
          data: isOllama
            ? 'Ollama is loading the AI model — this can take a minute on the first request. Hit retry and I should be ready!'
            : sanitizeErrorForClient(setupErr, 'Setup failed — please try again in a moment.'),
        }),
        { headers: sseHeaders() }
      )
    }

    // ─── COMMAND path ────────────────────────────────────────────
    if (classification.intent === 'command') {
      const commandRun = await runCommand(message)

      if (commandRun.ollamaOffline) {
        releaseInteractiveLock()
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
        preview: r.preview,
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
      releaseInteractiveLock()

      // Record anonymous command metric (non-blocking)
      recordRemyMetric({
        category: 'general',
      } as any).catch(() => {})

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
        preview: r.preview,
      }))

      const taskSummary = summarizeTaskResults(tasks)

      // Stream the conversational part — same load-aware routing as question path
      let mixedPrefer: 'auto' | 'pc' | 'pi' = 'auto'
      const mixedPcBusy = isSlotBusy('pc')
      const mixedPcSnap = getEndpointSnapshot('pc')
      const mixedPiSnap = getEndpointSnapshot('pi')
      if (
        (mixedPcBusy || mixedPcSnap?.activeGeneration) &&
        mixedPiSnap &&
        mixedPiSnap.grade !== 'unhealthy'
      ) {
        mixedPrefer = 'pi'
      }

      const mixedEndpoint = await routeForRemy({ preferEndpoint: mixedPrefer })
      if (!mixedEndpoint) {
        releaseInteractiveLock()
        return new Response(
          encodeSSE({
            type: 'error',
            data: "I'm offline right now — no Ollama endpoints are reachable.",
          }),
          { headers: sseHeaders() }
        )
      }

      const systemPrompt = buildRemySystemPrompt(
        context,
        memories,
        culinaryProfile,
        favoriteChefsList,
        archetypeId,
        recentPages,
        recentActions,
        recentErrors,
        sessionMinutes,
        activeForm
      )
      const historyStr = formatConversationHistory(history)
      const mixedUserMessage = `${historyStr}Chef: ${questionInput}`
      const mixedNumCtx = computeDynamicContext(
        systemPrompt.length + mixedUserMessage.length,
        mixedEndpoint.endpointName,
        'chef'
      )

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          // Hard timeout: kill the Ollama call if it hangs
          const abortCtrl = new AbortController()
          const timeout = setTimeout(() => abortCtrl.abort(), OLLAMA_STREAM_TIMEOUT_MS)
          // Stop streaming when the client disconnects (drawer closed)
          const onDisconnect = () => abortCtrl.abort()
          req.signal.addEventListener('abort', onDisconnect)

          try {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'mixed' })))

            let fullResponse = ''
            let usedMixedEndpoint = mixedEndpoint

            // Try primary endpoint, failover if connection fails before any tokens
            try {
              const mixedOllama = new Ollama({ host: mixedEndpoint.host })
              const response: any = await mixedOllama.chat({
                model: mixedEndpoint.model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: mixedUserMessage },
                ],
                stream: true,
                options: {
                  num_predict: OLLAMA_STREAM_MAX_TOKENS,
                  num_ctx: mixedNumCtx,
                },
                keep_alive: '1m',
                think: false,
              } as any)

              for await (const chunk of response) {
                if (abortCtrl.signal.aborted) break
                const token = chunk.message?.content ?? ''
                if (token) {
                  fullResponse += token
                  controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
                }
              }
            } catch (primaryErr) {
              if (fullResponse.length > 0) throw primaryErr

              const fallbackPref = mixedEndpoint.endpointName === 'pc' ? 'pi' : 'pc'
              const fallback = await routeForRemy({ preferEndpoint: fallbackPref })
              if (!fallback || fallback.endpointName === mixedEndpoint.endpointName)
                throw primaryErr

              console.log(
                `[remy] mixed: ${mixedEndpoint.endpointName} failed — falling back to ${fallback.endpointName}`
              )
              usedMixedEndpoint = fallback
              const fbNumCtx = computeDynamicContext(
                systemPrompt.length + mixedUserMessage.length,
                fallback.endpointName,
                'chef'
              )
              const fallbackOllama = new Ollama({ host: fallback.host })
              const response: any = await fallbackOllama.chat({
                model: fallback.model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: mixedUserMessage },
                ],
                stream: true,
                options: {
                  num_predict: OLLAMA_STREAM_MAX_TOKENS,
                  num_ctx: fbNumCtx,
                },
                keep_alive: '1m',
                think: false,
              } as any)

              for await (const chunk of response) {
                if (abortCtrl.signal.aborted) break
                const token = chunk.message?.content ?? ''
                if (token) {
                  fullResponse += token
                  controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
                }
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
            console.error(
              '[remy] Mixed path streaming error:',
              err instanceof Error ? err.message : err
            )
            controller.enqueue(
              encoder.encode(encodeSSE({ type: 'error', data: sanitizeErrorForClient(err) }))
            )
          } finally {
            clearTimeout(timeout)
            req.signal.removeEventListener('abort', onDisconnect)
            releaseInteractiveLock()
            controller.close()
          }
        },
      })

      return new Response(stream, { headers: sseHeaders() })
    }

    // ─── QUESTION path (default) — STREAMED with load-aware routing + failover ──
    // ─── Smart endpoint selection (load-aware) ──────────────────
    // If the PC is mid-background-task or actively generating, prefer the Pi
    // to avoid GPU contention. Falls back gracefully if Pi is unavailable.
    let preferEndpoint: 'auto' | 'pc' | 'pi' = 'auto'
    const pcBusy = isSlotBusy('pc')
    const pcSnapshot = getEndpointSnapshot('pc')
    const piSnapshot = getEndpointSnapshot('pi')
    if (
      (pcBusy || pcSnapshot?.activeGeneration) &&
      piSnapshot &&
      piSnapshot.grade !== 'unhealthy'
    ) {
      preferEndpoint = 'pi'
    }

    const endpoint = await routeForRemy({ preferEndpoint })
    if (!endpoint) {
      releaseInteractiveLock()
      return new Response(
        encodeSSE({
          type: 'error',
          data: "I'm offline right now — no Ollama endpoints are reachable. Start Ollama and try again!",
        }),
        { headers: sseHeaders() }
      )
    }

    const systemPrompt = buildRemySystemPrompt(
      context,
      memories,
      culinaryProfile,
      favoriteChefsList,
      archetypeId,
      recentPages,
      recentActions,
      recentErrors,
      sessionMinutes,
      activeForm
    )
    const historyStr = formatConversationHistory(history)
    const userMessage = `${historyStr}Chef: ${message}`
    const numCtx = computeDynamicContext(
      systemPrompt.length + userMessage.length,
      endpoint.endpointName,
      'chef'
    )

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Hard timeout: kill the Ollama call if it hangs
        const abortCtrl = new AbortController()
        const timeout = setTimeout(() => abortCtrl.abort(), OLLAMA_STREAM_TIMEOUT_MS)
        // Stop streaming when the client disconnects (drawer closed)
        const onDisconnect = () => abortCtrl.abort()
        req.signal.addEventListener('abort', onDisconnect)

        try {
          controller.enqueue(encoder.encode(encodeSSE({ type: 'intent', data: 'question' })))

          let fullResponse = ''
          let usedEndpoint = endpoint

          // Try primary endpoint, failover to secondary if connection fails
          try {
            const ollama = new Ollama({ host: endpoint.host })
            const response: any = await ollama.chat({
              model: endpoint.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              stream: true,
              options: {
                num_predict: OLLAMA_STREAM_MAX_TOKENS,
                num_ctx: numCtx,
              },
              keep_alive: '1m',
              think: false,
            } as any)

            for await (const chunk of response) {
              if (abortCtrl.signal.aborted) break
              const token = chunk.message?.content ?? ''
              if (token) {
                fullResponse += token
                controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
              }
            }
          } catch (primaryErr) {
            // Only failover if no tokens were sent (connection failure, not mid-stream)
            if (fullResponse.length > 0) throw primaryErr

            const fallbackPref = endpoint.endpointName === 'pc' ? 'pi' : 'pc'
            const fallback = await routeForRemy({ preferEndpoint: fallbackPref })
            if (!fallback || fallback.endpointName === endpoint.endpointName) throw primaryErr

            console.log(
              `[remy] ${endpoint.endpointName} failed — falling back to ${fallback.endpointName}`
            )
            usedEndpoint = fallback
            const fallbackNumCtx = computeDynamicContext(
              systemPrompt.length + userMessage.length,
              fallback.endpointName,
              'chef'
            )
            const fallbackOllama = new Ollama({ host: fallback.host })
            const response: any = await fallbackOllama.chat({
              model: fallback.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              stream: true,
              options: {
                num_predict: OLLAMA_STREAM_MAX_TOKENS,
                num_ctx: fallbackNumCtx,
              },
              keep_alive: '1m',
              think: false,
            } as any)

            for await (const chunk of response) {
              if (abortCtrl.signal.aborted) break
              const token = chunk.message?.content ?? ''
              if (token) {
                fullResponse += token
                controller.enqueue(encoder.encode(encodeSSE({ type: 'token', data: token })))
              }
            }
          }

          // Parse nav suggestions from end of response
          const navSuggestions = extractNavSuggestions(fullResponse)
          if (navSuggestions.length > 0) {
            controller.enqueue(encoder.encode(encodeSSE({ type: 'nav', data: navSuggestions })))
          }

          controller.enqueue(encoder.encode(encodeSSE({ type: 'done', data: null })))

          // Record anonymous usage metric (non-blocking, never fails the response)
          recordRemyMetric({
            category: 'general',
            modelVersion: usedEndpoint.model,
          }).catch((err) => console.error('[non-blocking] Remy metric failed', err))
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          const isOllamaDown =
            errMsg.includes('ECONNREFUSED') ||
            errMsg.includes('unreachable') ||
            errMsg.includes('timeout') ||
            errMsg.includes('timed out') ||
            errMsg.includes('aborted')
          console.error('[remy] Question path streaming error:', errMsg)
          controller.enqueue(
            encoder.encode(
              encodeSSE({
                type: 'error',
                data: isOllamaDown
                  ? "I'm offline right now — Ollama needs to be running for me to help. Start it up and try again!"
                  : sanitizeErrorForClient(err),
              })
            )
          )

          // Record error metric (non-blocking)
          recordRemyMetric({
            category: 'general',
            isError: true,
            modelVersion: endpoint.model,
          }).catch(() => {})
        } finally {
          clearTimeout(timeout)
          req.signal.removeEventListener('abort', onDisconnect)
          releaseInteractiveLock()
          controller.close()
        }
      },
    })

    return new Response(stream, { headers: sseHeaders() })
  } catch (err) {
    // Release lock on any error that prevents streaming from starting
    releaseInteractiveLock()
    console.error('[remy] Outer route error:', err instanceof Error ? err.message : err)
    return new Response(encodeSSE({ type: 'error', data: sanitizeErrorForClient(err) }), {
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
 * 3 minutes — the 30b MoE model with partial GPU offload (9/49 layers)
 * regularly takes 40-74s per response. Under load or with long context,
 * it can exceed 90s. This only fires if Ollama is truly stuck.
 */
const OLLAMA_STREAM_TIMEOUT_MS = 180_000

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
