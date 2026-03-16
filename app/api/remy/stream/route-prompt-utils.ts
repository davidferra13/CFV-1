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
import type { RemyMessage, RemyContext } from '@/lib/ai/remy-types'
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

// ─── Response Length Calibration (deterministic - word count analysis) ────────
// Matches response length to the chef's message complexity. Short questions get
// short answers. Detailed messages get detailed responses. No LLM needed.

function calibrateResponseLength(message: string): string {
  if (!message) return ''

  const words = message.trim().split(/\s+/).length
  const hasQuestionMark = message.includes('?')
  const isYesNo = /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\b/i.test(
    message.trim()
  )

  // Very short messages (1-5 words) - likely a quick question or command
  if (words <= 5) {
    return '\nRESPONSE LENGTH: Very short question - keep your answer to 1-2 sentences max. Be crisp.'
  }

  // Short messages (6-15 words) - standard question
  if (words <= 15) {
    if (isYesNo && hasQuestionMark) {
      return '\nRESPONSE LENGTH: Yes/no question - lead with the answer, then add 1 sentence of context if needed.'
    }
    return '\nRESPONSE LENGTH: Brief question - respond in 2-4 sentences. No padding.'
  }

  // Medium messages (16-40 words) - moderate detail expected
  if (words <= 40) {
    return '' // Default length - no calibration needed
  }

  // Long messages (41-80 words) - chef is being detailed, match their energy
  if (words <= 80) {
    return '\nRESPONSE LENGTH: The chef wrote a detailed message - give a thorough response with specifics. Use bullet points if listing multiple items.'
  }

  // Very long messages (80+ words) - chef is explaining something complex
  return '\nRESPONSE LENGTH: The chef wrote a long, detailed message - they want a comprehensive response. Be thorough, use structure (bullets, sections), and address all their points.'
}

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
  otherChannelDigest?: string | null,
  previousSessionTopics?: { title: string; topics: string[]; lastActiveAt: string } | null,
  userMessage?: string
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
  const hour = now.getHours()
  let timeOfDayNote = ''
  if (hour >= 22 || hour < 5) {
    timeOfDayNote = ' (late night - the chef is working late. Be concise, they may be tired.)'
  } else if (hour >= 5 && hour < 8) {
    timeOfDayNote =
      ' (early morning - the chef is starting their day. Good time for a brief daily overview.)'
  } else if (hour >= 12 && hour < 14) {
    timeOfDayNote = ' (lunch break - keep responses efficient.)'
  }
  parts.push(`\nCURRENT TIME: ${timeStr} on ${dayNames[now.getDay()]}, ${dateStr}${timeOfDayNote}`)

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
    // Prep readiness - flag missing prep items for imminent events
    let prepSuffix = ''
    if (e.date) {
      const hoursUntil = (new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursUntil > 0 && hoursUntil < 72) {
        const missing: string[] = []
        if (!e.prepReady) missing.push('prep list')
        if (!e.groceryReady) missing.push('grocery list')
        if (!e.timelineReady) missing.push('timeline')
        if (missing.length > 0) {
          prepSuffix = ` [ALERT: missing ${missing.join(', ')}]`
        }
      }
    }
    return `- ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status}${loyaltySuffix})${prepSuffix}`
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

  // Staff roster with utilization
  if (context.staffRoster && context.staffRoster.length > 0) {
    parts.push(`\nSTAFF ROSTER (${context.staffRoster.length}):
${context.staffRoster
  .map((s) => {
    const assignmentNote =
      s.activeAssignments > 0
        ? ` [${s.activeAssignments} upcoming event${s.activeAssignments !== 1 ? 's' : ''}]`
        : ' [available]'
    return `- ${s.name} (${s.role.replace(/_/g, ' ')})${s.phone ? ` ${s.phone}` : ''}${assignmentNote}`
  })
  .join('\n')}`)
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

  // Proactive nudges - deadline warnings, stale inquiries, overdue payments, re-engagement
  const nudgeLines: string[] = []

  // Upcoming payment deadlines (due within 7 days)
  if (context.upcomingPaymentDeadlines && context.upcomingPaymentDeadlines.length > 0) {
    for (const d of context.upcomingPaymentDeadlines) {
      const urgency = d.daysUntilDue <= 2 ? '[URGENT]' : ''
      nudgeLines.push(
        `${urgency} Payment of $${(d.amountCents / 100).toFixed(2)} due in ${d.daysUntilDue} day${d.daysUntilDue !== 1 ? 's' : ''} - ${d.clientName} (${d.occasion})`
      )
    }
  }

  // Expiring quotes (valid_until within 7 days)
  if (context.expiringQuotes && context.expiringQuotes.length > 0) {
    for (const q of context.expiringQuotes) {
      const urgency = q.daysUntilExpiry <= 2 ? '[URGENT]' : ''
      nudgeLines.push(
        `${urgency} Quote of $${(q.totalCents / 100).toFixed(2)} expires in ${q.daysUntilExpiry} day${q.daysUntilExpiry !== 1 ? 's' : ''} - ${q.clientName} (${q.occasion})`
      )
    }
  }

  // Stale inquiries (no response in >3 days)
  if (context.staleInquiries && context.staleInquiries.length > 0) {
    for (const s of context.staleInquiries) {
      nudgeLines.push(
        `Inquiry from ${s.leadName} - no response in ${s.daysSinceContact} days (lead score: ${s.leadScore})`
      )
    }
  }

  // Overdue payments
  if (context.overduePayments && context.overduePayments.length > 0) {
    for (const p of context.overduePayments) {
      nudgeLines.push(
        `[OVERDUE] $${(p.amountCents / 100).toFixed(2)} from ${p.clientName} - ${p.daysOverdue} day${p.daysOverdue !== 1 ? 's' : ''} past due`
      )
    }
  }

  // Client re-engagement (overdue for a booking based on cadence)
  if (context.clientReengagement && context.clientReengagement.length > 0) {
    for (const c of context.clientReengagement) {
      nudgeLines.push(
        `${c.clientName} usually books every ~${c.avgIntervalDays} days - last booking was ${c.daysSinceLastBooking} days ago (${c.eventCount} events total)`
      )
    }
  }

  if (nudgeLines.length > 0) {
    parts.push(`\n[ACTION NEEDED] PROACTIVE ALERTS (${nudgeLines.length}):
${nudgeLines.map((l) => `- ${l}`).join('\n')}
Mention the most urgent items naturally when relevant - especially if the chef asks "what should I focus on?" or during a morning briefing. Don't dump all at once unless asked.`)
  }

  // Revenue pattern + seasonal awareness - busy/slow months with time-of-year context
  if (context.revenuePattern) {
    const rp = context.revenuePattern
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' })
    const isBusyMonth = currentMonth.toLowerCase() === rp.busiestMonth.toLowerCase()
    const isSlowMonth = currentMonth.toLowerCase() === rp.slowestMonth.toLowerCase()
    let seasonalNote = ''
    if (isBusyMonth) {
      seasonalNote = ` RIGHT NOW is your busiest month - maximize bookings, consider raising rates for new inquiries.`
    } else if (isSlowMonth) {
      seasonalNote = ` RIGHT NOW is your slowest month - good time for client outreach, menu development, and re-engagement campaigns.`
    }
    parts.push(
      `\nREVENUE PATTERN: Busiest month is ${rp.busiestMonth}, slowest is ${rp.slowestMonth} (avg $${(rp.monthlyAvgCents / 100).toFixed(0)}/month).${seasonalNote} Use this for seasonal planning and pricing advice.`
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

    // Page-level intelligence: when the chef is on a list/aggregate page (no entity),
    // surface the most relevant context fields prominently so Remy can be page-aware.
    if (!context.pageEntity) {
      const pageIntel = buildPageIntelligence(context)
      if (pageIntel) {
        parts.push(`\nPAGE-SPECIFIC INTELLIGENCE (for ${context.currentPage}):
${pageIntel}
Use these insights to give informed, specific answers about what the chef sees on this page.`)
      }
    }
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

  // Previous session continuity - remind Remy what the chef was working on last time
  if (previousSessionTopics && previousSessionTopics.topics.length > 0) {
    const timeSince = new Date(previousSessionTopics.lastActiveAt)
    const hoursAgo = Math.round((Date.now() - timeSince.getTime()) / (1000 * 60 * 60))
    const timeLabel =
      hoursAgo < 1
        ? 'just now'
        : hoursAgo < 24
          ? `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
          : `${Math.round(hoursAgo / 24)} day${Math.round(hoursAgo / 24) !== 1 ? 's' : ''} ago`
    parts.push(`\nLAST SESSION (${timeLabel} - "${previousSessionTopics.title}"):
The chef previously discussed: ${previousSessionTopics.topics.join('; ')}
If the chef's first message relates to these topics, pick up naturally - "Picking up where we left off..." or weave in the context. If they're asking about something new, don't force a reference to the old session.`)
  }

  parts.push(`\n${NAV_ROUTE_MAP}`)

  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference data that appears in the sections above. You have access to:
ALWAYS AVAILABLE: Current time/date, business context, upcoming events, recent clients, today's daily plan, email inbox digest (24h), session navigation, recent actions, calendar & availability, year-to-date stats, staff roster (with utilization), equipment, goals, todos, calls, documents, artifacts, proactive alerts (deadlines, expiring quotes, stale inquiries, overdue payments, re-engagement), revenue patterns, conversion rate, expense breakdown, day-of-week patterns, service style mix, repeat client ratio, guest count trends, booking lead time, dietary intelligence, menu approval turnaround, referral sources, cash flow projection, profitability stats, quote comparison, pricing intelligence, inquiry velocity, workload capacity, and memories.
PAGE-LEVEL INTELLIGENCE: When the chef is on a specific page, you get enriched context about what's on their screen - including intelligence bar data (capacity, seasonal forecast, pricing, triage, geographic, prep efficiency, untapped markets, ingredient consolidation, rebooking predictions, churn risk). Reference these when the chef asks questions related to what they see.
ON EVENT PAGES: Ledger entries (payments), expenses, staff assignments, temp logs, quotes, status history, menu approval, grocery quotes, and after-action reviews.
ON CLIENT PAGES: Full event history, client notes, and client reviews.
ON INQUIRY PAGES: Full message thread.
Use all available data when answering questions - never say "I don't have that info" if it's in one of these sections.
If a section says "0" or is empty, that means there are NONE - do not invent any.
NEVER fabricate names, dates, amounts, or details to sound helpful.`)

  // Cost-per-guest intelligence (deterministic - pure math from existing context)
  if (
    context.yearlyStats &&
    context.yearlyStats.completedEventsThisYear > 0 &&
    context.upcomingEvents &&
    context.upcomingEvents.length > 0
  ) {
    const eventsWithGuests = context.upcomingEvents.filter((e) => e.guestCount && e.guestCount > 0)
    if (eventsWithGuests.length > 0) {
      const avgGuests = Math.round(
        eventsWithGuests.reduce((sum, e) => sum + (e.guestCount ?? 0), 0) / eventsWithGuests.length
      )
      const avgRevenuePerGuest = Math.round(
        context.yearlyStats.avgEventRevenueCents / Math.max(avgGuests, 1)
      )
      parts.push(
        `\nPRICING INTELLIGENCE: Avg ${avgGuests} guests/event, avg $${(avgRevenuePerGuest / 100).toFixed(0)}/guest revenue. Use this when the chef asks about pricing, quotes, or whether a deal is good.`
      )
    }
  }

  // Inquiry velocity (deterministic - week-over-week trend)
  if (context.inquiryVelocity) {
    const iv = context.inquiryVelocity
    if (iv.thisWeek > iv.lastWeek && iv.lastWeek > 0) {
      const pctUp = Math.round(((iv.thisWeek - iv.lastWeek) / iv.lastWeek) * 100)
      parts.push(
        `\nINQUIRY VELOCITY: ${iv.thisWeek} inquiries this week vs ${iv.lastWeek} last week (+${pctUp}%). Pipeline is heating up - stay on top of responses.`
      )
    } else if (iv.thisWeek < iv.lastWeek && iv.lastWeek > 0) {
      const pctDown = Math.round(((iv.lastWeek - iv.thisWeek) / iv.lastWeek) * 100)
      parts.push(
        `\nINQUIRY VELOCITY: ${iv.thisWeek} inquiries this week vs ${iv.lastWeek} last week (-${pctDown}%). Consider boosting outreach or marketing.`
      )
    } else if (iv.thisWeek > 0 && iv.lastWeek === 0) {
      parts.push(
        `\nINQUIRY VELOCITY: ${iv.thisWeek} new inquiries this week (none last week). Fresh leads coming in!`
      )
    }
  }

  // Weekly revenue pacing (deterministic - compare month revenue to monthly average)
  if (context.monthRevenueCents !== undefined && context.revenuePattern) {
    const dayOfMonth = new Date().getDate()
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const monthProgress = dayOfMonth / daysInMonth
    const expectedRevenue = Math.round(context.revenuePattern.monthlyAvgCents * monthProgress)
    const actualRevenue = context.monthRevenueCents
    const pacePercent =
      expectedRevenue > 0 ? Math.round((actualRevenue / expectedRevenue) * 100) : 0

    if (pacePercent > 120) {
      parts.push(
        `\nREVENUE PACING: ${pacePercent}% of target - ahead of pace! $${(actualRevenue / 100).toFixed(0)} earned vs $${(expectedRevenue / 100).toFixed(0)} expected by day ${dayOfMonth}.`
      )
    } else if (pacePercent < 80 && pacePercent > 0) {
      parts.push(
        `\nREVENUE PACING: ${pacePercent}% of target - behind pace. $${(actualRevenue / 100).toFixed(0)} earned vs $${(expectedRevenue / 100).toFixed(0)} expected by day ${dayOfMonth}. Consider following up on pending quotes or re-engaging past clients.`
      )
    }
  }

  // Workload capacity alerting (deterministic - event density analysis from existing context)
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    const now = Date.now()
    const next7Days = context.upcomingEvents.filter((e) => {
      if (!e.date) return false
      const dt = new Date(e.date).getTime()
      return dt > now && dt < now + 7 * 24 * 60 * 60 * 1000
    })
    const next3Days = next7Days.filter((e) => {
      const dt = new Date(e.date!).getTime()
      return dt < now + 3 * 24 * 60 * 60 * 1000
    })

    if (next3Days.length >= 3) {
      parts.push(
        `\n[ALERT] HEAVY WORKLOAD: ${next3Days.length} events in the next 3 days. The chef is slammed - be efficient, prioritize prep reminders, and don't suggest non-essential tasks.`
      )
    } else if (next7Days.length >= 5) {
      parts.push(
        `\nWORKLOAD: ${next7Days.length} events this week - busy schedule. Prioritize time-sensitive items in your suggestions.`
      )
    } else if (next7Days.length === 0) {
      parts.push(
        `\nWORKLOAD: No events in the next 7 days - lighter schedule. Good time for admin, menu development, client outreach, or creative work.`
      )
    }
  }

  // Profitability intelligence (deterministic - aggregate margins from financial summary view)
  if (context.profitabilityStats) {
    const ps = context.profitabilityStats
    parts.push(`\nPROFITABILITY INTELLIGENCE (from ${ps.eventCount} events with financial data):
- Avg profit margin: ${ps.avgMargin}% | Best: ${ps.bestMargin}% | Worst: ${ps.worstMargin}%
- Avg profit/event: $${(ps.avgProfitCents / 100).toFixed(0)}
When the chef asks about profitability, margins, or "am I charging enough?", use these benchmarks. If a specific event's margin is below the average, flag it.`)
  }

  // Quote comparison intelligence (deterministic - percentile positioning from historical data)
  if (context.quoteDistribution) {
    const qd = context.quoteDistribution
    parts.push(`\nQUOTE COMPARISON INTELLIGENCE (from ${qd.count} historical quotes):
- Range: $${(qd.minCents / 100).toFixed(0)} - $${(qd.maxCents / 100).toFixed(0)}
- Median: $${(qd.medianCents / 100).toFixed(0)} | 25th pctl: $${(qd.p25Cents / 100).toFixed(0)} | 75th pctl: $${(qd.p75Cents / 100).toFixed(0)}
When the chef asks about a quote amount, compare it to this range: below 25th = low end, above 75th = premium, near median = typical. Help them understand if they're undercharging or if it's a premium gig.`)
  }

  // Conversion rate intelligence
  if (context.conversionRate) {
    const cr = context.conversionRate
    let channelNote = ''
    if (cr.byChannel.length > 0) {
      const best = cr.byChannel[0]
      channelNote = ` Best channel: ${best.channel} (${best.rate}% conversion from ${best.total} inquiries).`
    }
    parts.push(
      `\nCONVERSION RATE: ${cr.rate}% of inquiries become events (${cr.converted}/${cr.total} this year).${channelNote} Use this when discussing lead quality or marketing ROI.`
    )
  }

  // Expense breakdown
  if (context.expenseBreakdown && context.expenseBreakdown.length > 0) {
    const totalExpCents = context.expenseBreakdown.reduce((s, e) => s + e.totalCents, 0)
    const top3 = context.expenseBreakdown.slice(0, 3)
    parts.push(
      `\nEXPENSE BREAKDOWN (YTD $${(totalExpCents / 100).toFixed(0)}): ${top3.map((e) => `${e.category.replace(/_/g, ' ')} $${(e.totalCents / 100).toFixed(0)} (${Math.round((e.totalCents / totalExpCents) * 100)}%)`).join(', ')}. Use when chef asks "where is my money going?" or about cost control.`
    )
  }

  // Day-of-week patterns
  if (context.dayOfWeekPattern) {
    const dp = context.dayOfWeekPattern
    parts.push(
      `\nEVENT DAY PATTERNS: Busiest day is ${dp.busiestDay}, slowest is ${dp.slowestDay}. Use for scheduling advice and availability planning.`
    )
  }

  // Service style distribution
  if (context.serviceStyles && context.serviceStyles.length > 0) {
    parts.push(
      `\nSERVICE STYLE MIX: ${context.serviceStyles.map((s) => `${s.style} ${s.pct}%`).join(', ')}. Use when discussing business diversification or niche focus.`
    )
  }

  // Repeat client ratio
  if (context.repeatClientRatio) {
    const rc = context.repeatClientRatio
    const health =
      rc.ratio >= 50
        ? 'strong retention'
        : rc.ratio >= 30
          ? 'moderate retention'
          : 'growth opportunity - focus on client nurturing'
    parts.push(
      `\nCLIENT RETENTION: ${rc.ratio}% repeat clients (${rc.repeatClients}/${rc.totalClients}) - ${health}.`
    )
  }

  // Guest count trend
  if (context.guestCountTrend) {
    const gc = context.guestCountTrend
    if (gc.direction !== 'stable') {
      parts.push(
        `\nGUEST COUNT TREND: ${gc.direction === 'growing' ? 'Growing' : 'Shrinking'} - recent avg ${gc.recentAvg} guests vs previous avg ${gc.previousAvg}. ${gc.direction === 'growing' ? 'Events are getting bigger - consider scaling pricing and staffing.' : 'Events are getting smaller - could mean more intimate bookings or a shift in clientele.'}`
      )
    }
  }

  // Booking lead time
  if (context.avgLeadTime) {
    const lt = context.avgLeadTime
    parts.push(
      `\nBOOKING LEAD TIME: Clients book avg ${lt.avgDays} days ahead (median ${lt.medianDays}, range ${lt.shortestDays}-${lt.longestDays} days). Use for capacity planning and when to start marketing for slow periods.`
    )
  }

  // Dietary profile across events
  if (context.dietaryProfile) {
    const dp = context.dietaryProfile
    const dietLines: string[] = []
    if (dp.topDietary.length > 0) {
      dietLines.push(
        `Common dietary needs: ${dp.topDietary.map((d) => `${d.name} (${d.count}x)`).join(', ')}`
      )
    }
    if (dp.topAllergies.length > 0) {
      dietLines.push(
        `Common allergies: ${dp.topAllergies.map((a) => `${a.name} (${a.count}x)`).join(', ')}`
      )
    }
    if (dietLines.length > 0) {
      parts.push(
        `\nDIETARY INTELLIGENCE: ${dietLines.join('. ')}. Use for menu planning and ingredient prep awareness.`
      )
    }
  }

  // Menu approval turnaround
  if (context.menuApprovalStats) {
    const ma = context.menuApprovalStats
    parts.push(
      `\nMENU APPROVAL TURNAROUND: Clients take avg ${ma.avgDays} days to approve menus (median ${ma.medianDays}, range ${ma.fastestDays}-${ma.slowestDays}). Factor this into timeline planning - send menus early enough to account for approval time.`
    )
  }

  // Referral sources
  if (context.referralSources && context.referralSources.length > 0) {
    parts.push(
      `\nCLIENT ACQUISITION: Top referral sources: ${context.referralSources.map((r) => `${r.source} ${r.pct}% (${r.count})`).join(', ')}. Use when discussing marketing strategy or growth.`
    )
  }

  // Cash flow projection
  if (context.cashFlowProjection) {
    const cf = context.cashFlowProjection
    parts.push(
      `\nCASH FLOW PROJECTION: $${(cf.expectedCents / 100).toFixed(0)} expected from ${cf.eventCount} upcoming events (based on quoted prices). This is pipeline revenue, not yet collected.`
    )
  }

  // Business intelligence summary (cross-engine synthesis from 30 analytics engines)
  if (context.businessIntelligence) {
    parts.push(`\nBUSINESS INTELLIGENCE (synthesized from 30 analytics engines - use when discussing business health, pricing, growth, or client retention):
${context.businessIntelligence}
Reference these insights when the chef asks about their business, pricing strategy, client health, capacity, or growth.`)
  }

  // Response length calibration (deterministic - word count analysis)
  if (userMessage) {
    const lengthInstruction = calibrateResponseLength(userMessage)
    if (lengthInstruction) parts.push(lengthInstruction)
  }

  // Streaming mode: plain text with nav suggestions as JSON at the end
  parts.push(`\nRESPONSE FORMAT:
Write your reply in natural language with markdown formatting (bold, bullets, etc.).
If you want to suggest page navigation links, end your response with a line containing only:
NAV_SUGGESTIONS: [{"label":"Page Name","href":"/route"}]
Only include nav suggestions when genuinely helpful.
Present all suggestions as drafts. Never claim to have taken autonomous actions.`)

  return parts.join('\n')
}

// ─── Page-Level Intelligence Builder ─────────────────────────────────────────
// For non-entity pages (lists, dashboards, aggregate views), extracts the most
// relevant context fields and surfaces them prominently in the prompt.

function buildPageIntelligence(context: RemyContext): string | null {
  const page = context.currentPage ?? ''
  const lines: string[] = []

  if (page.startsWith('/finance') || page.startsWith('/expenses')) {
    if (context.yearlyStats) {
      lines.push(
        `YTD Revenue: $${(context.yearlyStats.yearRevenueCents / 100).toLocaleString()} | Expenses: $${(context.yearlyStats.yearExpenseCents / 100).toLocaleString()} | Events: ${context.yearlyStats.totalEventsThisYear} (${context.yearlyStats.completedEventsThisYear} completed)`
      )
      if (context.yearlyStats.avgEventRevenueCents > 0) {
        lines.push(
          `Avg revenue/event: $${(context.yearlyStats.avgEventRevenueCents / 100).toLocaleString()}`
        )
      }
    }
    if (context.profitabilityStats) {
      lines.push(
        `Margins: avg ${context.profitabilityStats.avgMargin}% | best ${context.profitabilityStats.bestMargin}% | worst ${context.profitabilityStats.worstMargin}% (across ${context.profitabilityStats.eventCount} events)`
      )
    }
    if (context.cashFlowProjection && context.cashFlowProjection.expectedCents > 0) {
      lines.push(
        `Projected incoming: $${(context.cashFlowProjection.expectedCents / 100).toLocaleString()} from ${context.cashFlowProjection.eventCount} upcoming events`
      )
    }
    if (context.expenseBreakdown && context.expenseBreakdown.length > 0) {
      const top3 = context.expenseBreakdown
        .slice(0, 3)
        .map((e) => `${e.category}: $${(e.totalCents / 100).toLocaleString()}`)
        .join(', ')
      lines.push(`Top expense categories: ${top3}`)
    }
    if (context.revenuePattern) {
      lines.push(
        `Busiest month: ${context.revenuePattern.busiestMonth} | Slowest: ${context.revenuePattern.slowestMonth} | Monthly avg: $${(context.revenuePattern.monthlyAvgCents / 100).toLocaleString()}`
      )
    }
    lines.push(
      'The chef can see: Financial Health Bar (cash flow, margins, vendor alerts) + Pricing Intelligence Bar (price headroom, revenue/guest, optimal pricing)'
    )
  }

  if (page.startsWith('/inquiries')) {
    if (context.conversionRate) {
      lines.push(
        `Conversion rate: ${context.conversionRate.rate}% (${context.conversionRate.converted}/${context.conversionRate.total})`
      )
      if (context.conversionRate.byChannel.length > 0) {
        const top = context.conversionRate.byChannel
          .slice(0, 3)
          .map((c) => `${c.channel}: ${c.rate}%`)
          .join(', ')
        lines.push(`By channel: ${top}`)
      }
    }
    if (context.inquiryVelocity) {
      const trend =
        context.inquiryVelocity.thisWeek > context.inquiryVelocity.lastWeek
          ? 'up'
          : context.inquiryVelocity.thisWeek < context.inquiryVelocity.lastWeek
            ? 'down'
            : 'stable'
      lines.push(
        `This week: ${context.inquiryVelocity.thisWeek} inquiries (${trend} from ${context.inquiryVelocity.lastWeek} last week)`
      )
    }
    if (context.staleInquiries && context.staleInquiries.length > 0) {
      lines.push(
        `${context.staleInquiries.length} stale inquiries need follow-up (top: ${context.staleInquiries
          .slice(0, 3)
          .map((i) => `${i.leadName} - ${i.daysSinceContact}d`)
          .join(', ')})`
      )
    }
    if (context.avgLeadTime) {
      lines.push(
        `Avg booking lead time: ${context.avgLeadTime.avgDays}d (median ${context.avgLeadTime.medianDays}d)`
      )
    }
    lines.push(
      'The chef can see: Pipeline Summary Bar (value, conversion, urgent count) + Inquiry Triage Bar (response speed, urgent count, silent clients)'
    )
  }

  if (page.startsWith('/events') && !page.includes('/')) {
    // Events list page (not /events/{id})
    if (context.upcomingEvents && context.upcomingEvents.length > 0) {
      lines.push(`${context.upcomingEvents.length} upcoming events`)
      const notReady = context.upcomingEvents.filter(
        (e) => !e.prepReady || !e.groceryReady || !e.timelineReady
      )
      if (notReady.length > 0) {
        lines.push(
          `${notReady.length} events with incomplete prep (check prep lists, grocery lists, timelines)`
        )
      }
    }
    if (context.dayOfWeekPattern) {
      lines.push(
        `Busiest day: ${context.dayOfWeekPattern.busiestDay} | Slowest: ${context.dayOfWeekPattern.slowestDay}`
      )
    }
    if (context.serviceStyles && context.serviceStyles.length > 0) {
      lines.push(
        `Service mix: ${context.serviceStyles
          .slice(0, 4)
          .map((s) => `${s.style} ${s.pct}%`)
          .join(', ')}`
      )
    }
    if (context.guestCountTrend) {
      lines.push(
        `Guest count trend: ${context.guestCountTrend.direction} (recent avg ${context.guestCountTrend.recentAvg} vs previous ${context.guestCountTrend.previousAvg})`
      )
    }
    lines.push(
      'The chef can see: Financial Summary Bar + Geographic Bar (top areas, travel efficiency) + Prep Efficiency Bar + Untapped Markets Bar (growth opportunities)'
    )
  }

  if (page.startsWith('/clients') && !page.match(/\/clients\/[^/]/)) {
    // Client list page
    if (context.repeatClientRatio) {
      lines.push(
        `Repeat clients: ${context.repeatClientRatio.repeatClients}/${context.repeatClientRatio.totalClients} (${context.repeatClientRatio.ratio}%)`
      )
    }
    if (context.clientReengagement && context.clientReengagement.length > 0) {
      lines.push(`${context.clientReengagement.length} clients overdue for a booking:`)
      for (const c of context.clientReengagement.slice(0, 5)) {
        lines.push(
          `  - ${c.clientName}: usually every ${c.avgIntervalDays}d, last booked ${c.daysSinceLastBooking}d ago`
        )
      }
    }
    if (context.referralSources && context.referralSources.length > 0) {
      lines.push(
        `Top referral sources: ${context.referralSources
          .slice(0, 3)
          .map((r) => `${r.source} (${r.pct}%)`)
          .join(', ')}`
      )
    }
    lines.push(
      'The chef can see: Rebooking Bar (repeat rate, upcoming/overdue rebookers) + churn risk badges in the client table'
    )
  }

  if (page.startsWith('/calendar') || page.startsWith('/schedule')) {
    if (context.calendarSummary) {
      const blocked = context.calendarSummary.blockedDates.length
      const entries = context.calendarSummary.calendarEntries.length
      const waitlist = context.calendarSummary.waitlistEntries.length
      lines.push(
        `Next 30 days: ${entries} calendar entries, ${blocked} blocked dates${waitlist > 0 ? `, ${waitlist} waitlist` : ''}`
      )
    }
    if (context.dayOfWeekPattern) {
      lines.push(
        `Busiest day: ${context.dayOfWeekPattern.busiestDay} | Slowest: ${context.dayOfWeekPattern.slowestDay}`
      )
    }
    if (context.avgLeadTime) {
      lines.push(
        `Booking lead time: avg ${context.avgLeadTime.avgDays}d, median ${context.avgLeadTime.medianDays}d`
      )
    }
    lines.push(
      'The chef can see: Scheduling Insights Bar (alerts, optimal spacing, best day) + Capacity & Seasonal Bar (utilization, headroom, next month forecast)'
    )
  }

  if (page.startsWith('/menus') && !page.match(/\/menus\/[^/]/)) {
    if (context.dietaryProfile) {
      if (context.dietaryProfile.topDietary.length > 0) {
        lines.push(
          `Top dietary restrictions: ${context.dietaryProfile.topDietary
            .slice(0, 5)
            .map((d) => `${d.name} (${d.count})`)
            .join(', ')}`
        )
      }
      if (context.dietaryProfile.topAllergies.length > 0) {
        lines.push(
          `Top allergies: ${context.dietaryProfile.topAllergies
            .slice(0, 5)
            .map((a) => `${a.name} (${a.count})`)
            .join(', ')}`
        )
      }
    }
    if (context.menuApprovalStats) {
      lines.push(
        `Menu approval turnaround: avg ${context.menuApprovalStats.avgDays}d (median ${context.menuApprovalStats.medianDays}d, fastest ${context.menuApprovalStats.fastestDays}d)`
      )
    }
    if (context.pendingMenuApprovals && context.pendingMenuApprovals.length > 0) {
      lines.push(`${context.pendingMenuApprovals.length} menus awaiting client approval`)
    }
    lines.push(
      'The chef can see: Dietary Trends Bar + Ingredient Consolidation Bar (shared ingredients, bulk-buy savings)'
    )
  }

  if (page.startsWith('/quotes')) {
    if (context.quoteDistribution) {
      const q = context.quoteDistribution
      lines.push(
        `Quote range: $${(q.minCents / 100).toLocaleString()} – $${(q.maxCents / 100).toLocaleString()} (median $${(q.medianCents / 100).toLocaleString()}) across ${q.count} quotes`
      )
      lines.push(
        `25th–75th percentile: $${(q.p25Cents / 100).toLocaleString()} – $${(q.p75Cents / 100).toLocaleString()}`
      )
    }
    if (context.expiringQuotes && context.expiringQuotes.length > 0) {
      lines.push(`${context.expiringQuotes.length} quotes expiring soon:`)
      for (const q of context.expiringQuotes.slice(0, 3)) {
        lines.push(
          `  - ${q.clientName}: $${(q.totalCents / 100).toLocaleString()} expires in ${q.daysUntilExpiry}d`
        )
      }
    }
    if (context.conversionRate) {
      lines.push(`Quote-to-event conversion: ${context.conversionRate.rate}%`)
    }
  }

  if (page.startsWith('/recipes') && !page.match(/\/recipes\/[^/]/)) {
    if (context.recipeStats) {
      lines.push(
        `Recipe library: ${context.recipeStats.totalRecipes} recipes across ${context.recipeStats.categories.length} categories`
      )
      if (context.recipeStats.categories.length > 0) {
        lines.push(`Categories: ${context.recipeStats.categories.slice(0, 8).join(', ')}`)
      }
    }
    if (context.dietaryProfile && context.dietaryProfile.topDietary.length > 0) {
      lines.push(
        `Most common client dietary needs: ${context.dietaryProfile.topDietary
          .slice(0, 5)
          .map((d) => d.name)
          .join(', ')}`
      )
    }
  }

  if (page.startsWith('/network')) {
    if (context.referralSources && context.referralSources.length > 0) {
      lines.push(
        `Referral sources: ${context.referralSources.map((r) => `${r.source} (${r.pct}%)`).join(', ')}`
      )
    }
    if (context.repeatClientRatio) {
      lines.push(
        `Repeat client ratio: ${context.repeatClientRatio.ratio}% (${context.repeatClientRatio.repeatClients} of ${context.repeatClientRatio.totalClients})`
      )
    }
  }

  if (page.startsWith('/dashboard')) {
    if (context.overduePayments && context.overduePayments.length > 0) {
      lines.push(`${context.overduePayments.length} overdue payments need attention`)
    }
    if (context.staleInquiries && context.staleInquiries.length > 0) {
      lines.push(`${context.staleInquiries.length} inquiries need follow-up`)
    }
    if (context.clientReengagement && context.clientReengagement.length > 0) {
      lines.push(`${context.clientReengagement.length} clients overdue for rebooking`)
    }
  }

  if (page.startsWith('/staff')) {
    if (context.staffRoster && context.staffRoster.length > 0) {
      lines.push(`${context.staffRoster.length} staff members`)
      const busy = context.staffRoster.filter((s) => s.activeAssignments > 0)
      const available = context.staffRoster.filter((s) => s.activeAssignments === 0)
      if (busy.length > 0) {
        lines.push(
          `Assigned: ${busy.map((s) => `${s.name} (${s.activeAssignments} events)`).join(', ')}`
        )
      }
      if (available.length > 0) {
        lines.push(`Available: ${available.map((s) => s.name).join(', ')}`)
      }
    }
  }

  if (page.startsWith('/loyalty')) {
    if (context.repeatClientRatio) {
      lines.push(
        `Repeat client ratio: ${context.repeatClientRatio.ratio}% (${context.repeatClientRatio.repeatClients} of ${context.repeatClientRatio.totalClients})`
      )
    }
    if (context.yearlyStats && context.yearlyStats.topClients.length > 0) {
      lines.push(
        `Top clients by revenue: ${context.yearlyStats.topClients
          .slice(0, 5)
          .map(
            (c) => `${c.name} ($${(c.revenueCents / 100).toLocaleString()}, ${c.eventCount} events)`
          )
          .join('; ')}`
      )
    }
  }

  if (page.startsWith('/analytics') || page.startsWith('/reports')) {
    if (context.conversionRate) {
      lines.push(
        `Conversion rate: ${context.conversionRate.rate}% (${context.conversionRate.converted}/${context.conversionRate.total})`
      )
    }
    if (context.profitabilityStats) {
      lines.push(
        `Avg margin: ${context.profitabilityStats.avgMargin}% | Best: ${context.profitabilityStats.bestMargin}% | Worst: ${context.profitabilityStats.worstMargin}%`
      )
    }
    if (context.repeatClientRatio) {
      lines.push(`Repeat clients: ${context.repeatClientRatio.ratio}%`)
    }
    if (context.avgLeadTime) {
      lines.push(`Booking lead time: avg ${context.avgLeadTime.avgDays}d`)
    }
    if (context.guestCountTrend) {
      lines.push(
        `Guest count: ${context.guestCountTrend.direction} (avg ${context.guestCountTrend.recentAvg})`
      )
    }
  }

  if (page.startsWith('/goals')) {
    if (context.activeGoals && context.activeGoals.length > 0) {
      for (const g of context.activeGoals) {
        lines.push(
          `${g.title}: ${g.progress !== null ? `${g.progress}%` : 'no progress tracked'} [${g.status}]${g.targetDate ? ` due ${g.targetDate}` : ''}`
        )
      }
    }
    if (context.yearlyStats) {
      lines.push(
        `YTD: $${(context.yearlyStats.yearRevenueCents / 100).toLocaleString()} revenue, ${context.yearlyStats.totalEventsThisYear} events`
      )
    }
  }

  if (page.startsWith('/aar') || page.startsWith('/reviews')) {
    if (context.recentAARInsights && context.recentAARInsights.length > 0) {
      const withRating = context.recentAARInsights.filter((a) => a.rating !== null)
      const avgRating =
        withRating.length > 0
          ? withRating.reduce((s, a) => s + (a.rating ?? 0), 0) / withRating.length
          : 0
      lines.push(
        `${context.recentAARInsights.length} recent after-action reviews${avgRating > 0 ? ` (avg rating: ${avgRating.toFixed(1)}/5)` : ''}`
      )
      const improvements = context.recentAARInsights.filter((a) => a.toImprove).slice(0, 3)
      if (improvements.length > 0) {
        lines.push(`Areas to improve: ${improvements.map((a) => a.toImprove).join('; ')}`)
      }
    }
  }

  return lines.length > 0 ? lines.join('\n') : null
}

//  Context Scope (planned - currently returns 'full' for all requests)

export type ContextScope = 'full' | 'minimal' | 'focused'

export function determineContextScope(_message: string, _intent: string): ContextScope {
  // Future: reduce prompt size for focused queries by scoping context.
  // For now, always return full context.
  return 'full'
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
