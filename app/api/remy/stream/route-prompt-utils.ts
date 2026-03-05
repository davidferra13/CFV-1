import { loadRemyContext } from '@/lib/ai/remy-context'
import {
  REMY_PERSONALITY,
  REMY_FEW_SHOT_EXAMPLES,
  REMY_DRAFT_INSTRUCTIONS,
  REMY_PRIVACY_NOTE,
  REMY_TOPIC_GUARDRAILS,
  REMY_ANTI_INJECTION,
} from '@/lib/ai/remy-personality'
import { getArchetype } from '@/lib/ai/remy-archetypes'
import type { SurveyState } from '@/lib/ai/remy-survey-constants'
import type { RemyMessage } from '@/lib/ai/remy-types'
import type { RemyMemory } from '@/lib/ai/remy-memory-types'

//  Navigation Route Map

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

//  System Prompt Builder

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
    "\nUse these memories naturally - reference them when relevant, but don't recite them mechanically."
  )

  return sections.join('\n')
}

export function buildRemySystemPrompt(
  context: Awaited<ReturnType<typeof loadRemyContext>>,
  memories: RemyMemory[] = [],
  culinaryProfile?: string,
  favoriteChefs?: string,
  archetypeId?: string | null,
  recentPages?: Array<{ path: string; label: string; at: string }>,
  recentActions?: Array<{ action: string; entity: string; at: string }>,
  recentErrors?: Array<{ message: string; context: string; at: string }>,
  sessionMinutes?: number,
  activeForm?: string,
  surveyPromptSection?: string | null,
  otherChannelDigest?: string | null
): string {
  const parts: string[] = []

  parts.push(REMY_PERSONALITY)

  // Inject personality archetype modifier (chef-selected or default)
  const archetype = getArchetype(archetypeId)
  parts.push(`\n${archetype.promptModifier}`)

  // Few-shot examples - show Remy how to respond, not just what to be
  parts.push(REMY_FEW_SHOT_EXAMPLES)

  parts.push(REMY_DRAFT_INSTRUCTIONS)
  parts.push(REMY_PRIVACY_NOTE)
  parts.push(REMY_TOPIC_GUARDRAILS)
  parts.push(REMY_ANTI_INJECTION)

  // Inject culinary profile if available
  if (culinaryProfile) {
    parts.push(
      `\nCHEF'S CULINARY IDENTITY:\n${culinaryProfile}\nUse this to personalize responses - reference their style, cuisines, and philosophy when relevant.`
    )
  }

  // Inject favorite chefs if available
  if (favoriteChefs) {
    parts.push(
      `\nCHEF'S CULINARY HEROES:\n${favoriteChefs}\nReference these when discussing inspiration, technique, or style - the chef admires these people.`
    )
  }

  // Current timestamp - so Remy knows the time, day, and date
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
- Business: ${context.businessName ?? 'Your business'}${context.tagline ? ` - "${context.tagline}"` : ''}
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

  // Daily plan - what's on the chef's plate today
  if (context.dailyPlan && context.dailyPlan.totalItems > 0) {
    const dp = context.dailyPlan
    parts.push(`\nTODAY'S DAILY PLAN (${dp.totalItems} items, ~${dp.estimatedMinutes} min):
- Quick Admin: ${dp.adminItems} items
- Event Prep: ${dp.prepItems} items
- Creative Time: ${dp.creativeItems} items
- Relationship: ${dp.relationshipItems} items
The chef can see the full structured view at /daily.`)
  }

  // Email digest - proactive communication awareness
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
        emailLines.push(`- From: ${e.from} - "${e.subject}"${cls}`)
      }
    }
    emailLines.push(
      'You can search, read, or summarize emails. Draft replies are always drafts - never auto-sent.'
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
        `Calendar entries: ${cal.calendarEntries.map((c) => `${c.title} ${c.startDate}-${c.endDate} [${c.type.replace(/_/g, ' ')}]${c.blocksBookings ? ' BLOCKS BOOKINGS' : ''}`).join('; ')}`
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
${context.upcomingCalls.map((c) => `- ${c.clientName} at ${new Date(c.scheduledAt).toLocaleString()}${c.purpose ? ` - ${c.purpose}` : ''}`).join('\n')}`)
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

  //  Context enrichment sections (2026-02-28)

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
      parts.push(`\n[ALERT] CLIENT DIETARY & ALLERGY DATA (SAFETY-CRITICAL - always flag prominently):
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
      if (safetySentences.length > 0) lines.push(`  [ALERT] ${safetySentences.join('. ')}`)
    }
    return lines.join('\n')
  })
  .join('\n')}
When asked about these clients' dietary needs, ALWAYS prominently flag allergies. This is safety-critical.`)
    }

    parts.push(`\nCLIENT VIBE NOTES (personality & communication style):
${context.clientVibeNotes.map((c) => `- ${c.name}: ${c.vibeNotes}`).join('\n')}
Use these to personalize communication - draft emails and messages that match each client's vibe.`)
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
    if (a.wentWell) parts.push(`[OK] ${a.wentWell}`)
    if (a.toImprove) parts.push(`[ALERT] ${a.toImprove}`)
    if (a.lessonsLearned) parts.push(`[TIP] ${a.lessonsLearned}`)
    return parts.join(' | ')
  })
  .join('\n')}
Reference these when relevant - help the chef avoid past mistakes and repeat successes.`)
    }
  }

  // Pending menu approvals
  if (context.pendingMenuApprovals && context.pendingMenuApprovals.length > 0) {
    parts.push(
      `\n[CHECKLIST] PENDING MENU APPROVALS (${context.pendingMenuApprovals.length}): ${context.pendingMenuApprovals.map((m) => m.clientName).join(', ')} - waiting for client response`
    )
  }

  // Unread inquiry messages
  if (context.unreadInquiryMessages && context.unreadInquiryMessages.length > 0) {
    const unique = [...new Set(context.unreadInquiryMessages.map((m) => m.leadName))]
    parts.push(
      `\n[MAIL] UNREAD INQUIRY MESSAGES (${context.unreadInquiryMessages.length}): from ${unique.join(', ')} - need a response`
    )
  }

  // Navigation trail - what pages the chef visited this session
  if (recentPages && recentPages.length > 0) {
    const trail = recentPages.map((p) => {
      const time = new Date(p.at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `- ${time}: ${p.label} (${p.path})`
    })
    parts.push(`\nSESSION NAVIGATION (where the chef has been this session, oldest->newest):
${trail.join('\n')}
This shows the chef's workflow - what they've been looking at and in what order. Use it to understand their current focus.`)
  }

  // Recent mutations - what the chef just did in the app
  if (recentActions && recentActions.length > 0) {
    const actions = recentActions.map((a) => {
      const time = new Date(a.at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return `- ${time}: ${a.action} - ${a.entity}`
    })
    parts.push(`\nRECENT ACTIONS (what the chef just did in the app):
${actions.join('\n')}
These are real actions the chef just took. Reference them when relevant - e.g. "I see you just created that event, want me to draft a confirmation?"`)
  }

  // Recent errors - help the chef if they hit problems
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
If the chef seems frustrated or asks about something failing, these errors are context. Proactively acknowledge if relevant - "I saw that didn't work earlier - let's figure it out."`)
  }

  // Session duration - how long the chef has been working
  if (sessionMinutes && sessionMinutes > 0) {
    const hours = Math.floor(sessionMinutes / 60)
    const mins = sessionMinutes % 60
    const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`
    parts.push(`\nSESSION DURATION: The chef has been active for ${duration} this session.`)
    if (sessionMinutes > 120) {
      parts.push(
        `That's a long session - they're grinding. Be efficient and sharp, don't waste their time.`
      )
    }
  }

  // Cross-chat awareness - what was discussed in the other chat channel
  if (otherChannelDigest) {
    parts.push(`\nCONTEXT FROM OTHER CHAT CHANNEL:
${otherChannelDigest}
You can reference this context naturally if relevant - don't force it or repeat what was already said.`)
  }

  // Survey mode - conversational survey takes over prompt context
  if (activeForm === 'remy-survey' && surveyPromptSection) {
    parts.push(`\n${surveyPromptSection}`)
  } else if (activeForm) {
    // Active form - what the chef is currently working on
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
Use all available data when answering questions - never say "I don't have that info" if it's in one of these sections.
If a section says "0" or is empty, that means there are NONE - do not invent any.
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

//  Conversation History Formatter

export function formatConversationHistory(history: RemyMessage[]): string {
  if (history.length === 0) return ''
  const recent = history.slice(-10)
  const formatted = recent
    .map((m) => `${m.role === 'user' ? 'Chef' : 'Remy'}: ${m.content}`)
    .join('\n')
  return `Previous conversation:\n${formatted}\n\n`
}
