// Remy - Deterministic Instant Answers (Formula > AI)
//
// For simple factual questions where the answer is already in the loaded context,
// this module returns an instant response WITHOUT calling Ollama at all.
// Saves 30-90 seconds per question. Zero cost, zero latency, always correct.
//
// The loaded RemyContext already has all the data - we just need to recognize
// the question pattern and format the answer in Remy's voice.

import type { RemyContext } from '@/lib/ai/remy-types'
import type { RemyMemory } from '@/lib/ai/remy-memory-types'
import type { ContinuityDigest } from '@/lib/activity/continuity-digest'
import { findMetricDefinitionsByQuery } from '@/lib/analytics/metric-registry'
import { daysUntilChefDate, getChefClock, isSameChefDate } from '@/lib/time/chef-clock'

interface InstantAnswer {
  text: string
  navSuggestions?: Array<{ label: string; href: string }>
}

interface AnswerPattern {
  pattern: RegExp
  answer: (
    ctx: RemyContext,
    match: RegExpMatchArray,
    options: { message: string; memories: RemyMemory[]; continuityDigest?: ContinuityDigest | null }
  ) => InstantAnswer | null
}

const MEMORY_CONTEXT_ALWAYS_INCLUDE = new Set(['client_insight', 'business_rule'])

const MEMORY_CONTEXT_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'what',
  'when',
  'where',
  'which',
  'about',
  'event',
  'events',
  'dinner',
  'service',
  'ready',
  'complete',
  'completion',
  'missing',
  'blocked',
  'next',
  'step',
])

function formatMetricFreshness(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

function formatMetricSourceAnswer(query: string): InstantAnswer | null {
  const matches = findMetricDefinitionsByQuery(query, { surface: 'remy_context', limit: 3 })
  if (matches.length === 0) return null

  return {
    text: matches
      .map(
        (metric) =>
          `**${metric.label}** (${metric.id})\n- What it means: ${metric.description}\n- Source action: \`${metric.sourceAction}\`\n- Tables: ${metric.sourceTables.map((table) => `\`${table}\``).join(', ')}\n- Freshness: ${formatMetricFreshness(metric.freshnessSlaMinutes)} ${metric.rollupCadence}\n- Failure rule: show an error state, never a fake zero`
      )
      .join('\n\n'),
    navSuggestions: [{ label: 'Metric Registry', href: '/insights' }],
  }
}

function findEventCompletionContext(ctx: RemyContext) {
  const candidates = [ctx.pageEntity, ...(ctx.mentionedEntities ?? [])].filter(
    (entity): entity is NonNullable<typeof entity> => Boolean(entity)
  )

  return candidates.find((entity) => entity.type === 'event' && entity.completion)
}

function tokenizeMemoryContext(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !MEMORY_CONTEXT_STOP_WORDS.has(word))
  )
}

function formatMemoryCategory(category: string): string {
  return category
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function appendRelevantMemoryContext(
  lines: string[],
  ctx: RemyContext,
  message: string,
  memories: RemyMemory[]
) {
  if (memories.length === 0) return

  const entityText = [ctx.pageEntity, ...(ctx.mentionedEntities ?? [])]
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity))
    .map((entity) => entity.summary)
    .join(' ')
  const queryWords = tokenizeMemoryContext(`${message} ${entityText}`)

  const scored = memories
    .map((memory) => {
      let score = MEMORY_CONTEXT_ALWAYS_INCLUDE.has(memory.category) ? 1000 : 0
      const memoryWords = tokenizeMemoryContext(
        `${memory.content} ${memory.relatedClientName ?? ''} ${memory.category}`
      )
      for (const word of memoryWords) {
        if (queryWords.has(word)) score += 4
      }
      if (memory.relatedClientName && entityText.includes(memory.relatedClientName)) score += 12
      score += Math.max(0, Math.min(memory.importance ?? 0, 5))
      return { memory, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (scored.length === 0) return

  lines.push('')
  lines.push('Relevant memory context:')
  for (const { memory } of scored) {
    const content =
      memory.content.length > 140 ? `${memory.content.slice(0, 137).trim()}...` : memory.content
    lines.push(`- ${formatMemoryCategory(memory.category)}: ${content}`)
  }
}

function formatEventCompletionAnswer(
  ctx: RemyContext,
  message: string,
  memories: RemyMemory[]
): InstantAnswer | null {
  const entity = findEventCompletionContext(ctx)
  const completion = entity?.completion
  if (!entity || !completion) return null

  const lines: string[] = [
    `Deterministic readiness from the Completion Contract: **${completion.score}/100 (${completion.status})**.`,
  ]

  if (completion.blockingRequirements.length > 0) {
    lines.push('')
    lines.push('Blocking requirements:')
    for (const blocker of completion.blockingRequirements.slice(0, 5)) {
      lines.push(`- ${blocker.label}`)
    }
  } else if (completion.status === 'complete') {
    lines.push('')
    lines.push('No blocking requirements are open.')
  } else if (completion.missingRequirements.length > 0) {
    lines.push('')
    lines.push('No hard blockers are open, but these items are still missing:')
    for (const missing of completion.missingRequirements.slice(0, 5)) {
      lines.push(`- ${missing.label}`)
    }
  }

  if (completion.nextAction) {
    lines.push('')
    lines.push(`Next step: **${completion.nextAction.label}**.`)
  }

  appendRelevantMemoryContext(lines, ctx, message, memories)

  return {
    text: lines.join('\n'),
    navSuggestions: completion.nextAction
      ? [{ label: completion.nextAction.label, href: completion.nextAction.url }]
      : [{ label: 'Event', href: '/events' }],
  }
}

const INSTANT_PATTERNS: AnswerPattern[] = [
  {
    pattern:
      /(?:is|am|are|what|why|how).*(?:event|dinner|booking|service|gig|this).*(?:ready|complete|completion|block|blocked|missing|next)|(?:ready|complete|completion|block|blocked|missing|next).*(?:event|dinner|booking|service|gig|this)/i,
    answer: (ctx, _match, options) =>
      formatEventCompletionAnswer(ctx, options.message, options.memories),
  },
  {
    pattern:
      /(?:where|how|what).*(?:metric|stat|analytics|number|usage|rate).*(?:source|come from|calculated|tracked|defined)|(?:source|calculation).*(?:metric|stat|analytics|usage|rate)/i,
    answer: (_ctx, match) => formatMetricSourceAnswer(match.input ?? match[0]),
  },
  {
    pattern:
      /(?:what|which|show|list).*(?:analytics|metrics|stats|statistics).*(?:track|monitor|available|can you see|do you have)|(?:what|which).*(?:data|numbers).*(?:track|monitor)/i,
    answer: (ctx) => {
      const registry = ctx.metricRegistry
      if (!registry || registry.metrics.length === 0) return null

      const byDomain = registry.metrics.reduce<Record<string, number>>((counts, metric) => {
        counts[metric.domain] = (counts[metric.domain] ?? 0) + 1
        return counts
      }, {})

      const domainLine = Object.entries(byDomain)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([domain, count]) => `${domain}: ${count}`)
        .join(', ')

      const examples = registry.metrics
        .slice(0, 10)
        .map(
          (metric) =>
            `- **${metric.label}** (${metric.id}) from \`${metric.sourceAction}\`, ${formatMetricFreshness(metric.freshnessSlaMinutes)} freshness`
        )
        .join('\n')

      return {
        text: `I have **${registry.total} canonical metrics** in the Metric Truth Registry across **${registry.domains} domains**. Remy currently has these registry-backed metric definitions in context: ${domainLine}.\n\n${examples}\n\nAsk "where does ingredient usage come from?" or "how is quote acceptance tracked?" and I can show the exact source action, tables, freshness SLA, and failure rule.`,
        navSuggestions: [{ label: 'Metric Registry', href: '/insights' }],
      }
    },
  },
  // "How many clients do I have?"
  {
    pattern: /^how\s+many\s+clients?\s+(?:do\s+i\s+have|are\s+there|have\s+i\s+got)/i,
    answer: (ctx) => ({
      text:
        ctx.clientCount === 0
          ? "You don't have any clients yet. Let's fix that - head to Clients → New Client to add your first one. 🔥"
          : `You have **${ctx.clientCount} client${ctx.clientCount !== 1 ? 's' : ''}** in your book.${ctx.repeatClientRatio ? ` ${ctx.repeatClientRatio.ratio}% are repeat clients.` : ''} ${ctx.clientCount < 5 ? 'Still building - every great kitchen started with the first plate. 🍽️' : 'Solid roster, chef! 💪'}`,
      navSuggestions: [{ label: 'Client Directory', href: '/clients' }],
    }),
  },
  // "How many events do I have?" / "How many upcoming events?"
  {
    pattern: /^how\s+many\s+(?:upcoming\s+)?events?\s+(?:do\s+i\s+have|are\s+there|are\s+coming)/i,
    answer: (ctx) => ({
      text:
        ctx.upcomingEventCount === 0
          ? 'No upcoming events on the board right now. Good time to work on outreach or menu development. 📋'
          : `You have **${ctx.upcomingEventCount} upcoming event${ctx.upcomingEventCount !== 1 ? 's' : ''}**.${ctx.upcomingEvents && ctx.upcomingEvents.length > 0 ? `\n\nNext up: ${ctx.upcomingEvents[0].occasion ?? 'Event'} on ${ctx.upcomingEvents[0].date ?? '(TBD)'} for ${ctx.upcomingEvents[0].clientName} (${ctx.upcomingEvents[0].guestCount ?? '?'} guests, ${ctx.upcomingEvents[0].status}).` : ''}`,
      navSuggestions: [{ label: 'Events', href: '/events' }],
    }),
  },
  // "How many inquiries?" / "Any open inquiries?"
  {
    pattern: /^(?:how\s+many|any|do\s+i\s+have\s+(?:any\s+)?(?:open\s+)?)\s*(?:open\s+)?inquir/i,
    answer: (ctx) => ({
      text:
        ctx.openInquiryCount === 0
          ? 'No open inquiries right now. Your pipeline is clear - great time for proactive outreach. 📬'
          : `You have **${ctx.openInquiryCount} open inquir${ctx.openInquiryCount !== 1 ? 'ies' : 'y'}** in the pipeline.${
              ctx.staleInquiries && ctx.staleInquiries.length > 0
                ? ` ⚠️ ${ctx.staleInquiries.length} need follow-up (${ctx.staleInquiries
                    .slice(0, 2)
                    .map((i) => `${i.leadName} - ${i.daysSinceContact}d`)
                    .join(', ')}).`
                : ''
            } ${ctx.inquiryVelocity ? `This week: ${ctx.inquiryVelocity.thisWeek} new vs ${ctx.inquiryVelocity.lastWeek} last week.` : ''}`,
      navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
    }),
  },
  // "What's my revenue?" / "Revenue this month" / "How much have I made?"
  {
    pattern:
      /^(?:what'?s?\s+(?:my\s+)?(?:this\s+month'?s?\s+)?revenue|revenue\s+this\s+month|how\s+much\s+(?:have\s+i\s+made|did\s+i\s+make|revenue))/i,
    answer: (ctx) => {
      if (ctx.monthRevenueCents === undefined) return null
      const monthRev = (ctx.monthRevenueCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      let pacing = ''
      if (ctx.revenuePattern) {
        const dayOfMonth = new Date().getDate()
        const daysInMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0
        ).getDate()
        const progress = dayOfMonth / daysInMonth
        const expected = ctx.revenuePattern.monthlyAvgCents * progress
        const pct = expected > 0 ? Math.round((ctx.monthRevenueCents / expected) * 100) : 0
        if (pct > 120) pacing = ` You're **${pct}% of target** - ahead of pace! 🔥`
        else if (pct < 80 && pct > 0) pacing = ` That's **${pct}% of target** - a bit behind pace.`
      }
      let ytd = ''
      if (ctx.yearlyStats) {
        ytd = `\n\n**YTD:** ${(ctx.yearlyStats.yearRevenueCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} across ${ctx.yearlyStats.totalEventsThisYear} events.`
      }
      return {
        text: `**This month:** ${monthRev}${pacing}${ytd}`,
        navSuggestions: [{ label: 'Finance', href: '/finance' }],
      }
    },
  },
  // "What's my schedule?" / "Am I busy this week?" / "What's on my plate?"
  {
    pattern:
      /^(?:what'?s?\s+(?:my\s+)?(?:schedule|week|plate)|am\s+i\s+busy|what\s+do\s+i\s+have\s+(?:this\s+week|coming\s+up|on\s+my\s+plate))/i,
    answer: (ctx) => {
      if (!ctx.upcomingEvents || ctx.upcomingEvents.length === 0) {
        return {
          text: 'Nothing on the board right now. Light schedule - good time for menu development, client outreach, or recipe work. 🧑‍🍳',
          navSuggestions: [{ label: 'Schedule', href: '/schedule' }],
        }
      }
      const now = Date.now()
      const thisWeek = ctx.upcomingEvents.filter((e) => {
        if (!e.date) return false
        const dt = new Date(e.date).getTime()
        return dt > now && dt < now + 7 * 24 * 60 * 60 * 1000
      })
      const lines: string[] = []
      if (thisWeek.length === 0) {
        lines.push('No events this week - lighter schedule. 📋')
      } else if (thisWeek.length >= 3) {
        lines.push(`**${thisWeek.length} events this week** - full rail, chef! 🔥\n`)
      } else {
        lines.push(`**${thisWeek.length} event${thisWeek.length !== 1 ? 's' : ''} this week:**\n`)
      }
      for (const e of thisWeek.slice(0, 5)) {
        const day = e.date
          ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' })
          : '(TBD)'
        lines.push(
          `- **${day}** - ${e.occasion ?? 'Event'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status})`
        )
      }
      if (ctx.upcomingEvents.length > thisWeek.length) {
        lines.push(`\nPlus ${ctx.upcomingEvents.length - thisWeek.length} more after this week.`)
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [
          { label: 'Schedule', href: '/schedule' },
          { label: 'Events', href: '/events' },
        ],
      }
    },
  },
  // "What's my conversion rate?"
  {
    pattern: /^what'?s?\s+(?:my\s+)?(?:conversion|close)\s+rate/i,
    answer: (ctx) => {
      if (!ctx.conversionRate) return null
      const cr = ctx.conversionRate
      let channelInfo = ''
      if (cr.byChannel.length > 0) {
        channelInfo = `\n\nBy channel: ${cr.byChannel
          .slice(0, 3)
          .map((c) => `${c.channel} ${c.rate}%`)
          .join(', ')}`
      }
      return {
        text: `Your conversion rate is **${cr.rate}%** - ${cr.converted} of ${cr.total} inquiries became events.${channelInfo}${cr.rate >= 40 ? "\n\nThat's strong - above industry average. 🎯" : cr.rate >= 25 ? "\n\nDecent, but there's room to improve. Focus on faster follow-ups." : "\n\nThat's on the lower side - let's look at your follow-up speed and lead quality."}`,
        navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
      }
    },
  },
  // "What's my profit margin?" / "What are my margins?"
  {
    pattern: /^what'?s?\s+(?:my\s+)?(?:profit\s+)?margin|what\s+are\s+my\s+margins/i,
    answer: (ctx) => {
      if (!ctx.profitabilityStats) return null
      const ps = ctx.profitabilityStats
      return {
        text: `**Average margin:** ${ps.avgMargin}% across ${ps.eventCount} events\n- Best: ${ps.bestMargin}%\n- Worst: ${ps.worstMargin}%\n- Avg profit/event: $${(ps.avgProfitCents / 100).toFixed(0)}\n\n${ps.avgMargin >= 55 ? "Strong margins - you're cooking with gas 🎯" : ps.avgMargin >= 40 ? 'Decent margins. Look for cost savings on your lower-margin events.' : "Margins are tight. Let's dig into your expense categories and find some savings."}`,
        navSuggestions: [{ label: 'Finance', href: '/finance' }],
      }
    },
  },
  // "Who are my top clients?"
  {
    pattern: /^who\s+are\s+(?:my\s+)?(?:top|best|biggest)\s+clients/i,
    answer: (ctx) => {
      if (!ctx.yearlyStats || ctx.yearlyStats.topClients.length === 0) {
        return {
          text: "Not enough event data yet to rank your clients. Complete a few events and I'll have this for you. 📊",
        }
      }
      const lines = ['**Your top clients this year:**\n']
      for (const c of ctx.yearlyStats.topClients.slice(0, 5)) {
        lines.push(
          `- **${c.name}** - $${(c.revenueCents / 100).toLocaleString()} across ${c.eventCount} event${c.eventCount !== 1 ? 's' : ''}`
        )
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Clients', href: '/clients' }],
      }
    },
  },
  // "What's the weather?" - plain weather is small talk, but event weather is handled async
  // Note: "weather for my events" / "event weather" bypasses instant answers and hits the
  // async weather path in the stream route. This only catches generic weather questions.
  {
    pattern:
      /^what'?s?\s+the\s+weather(?!\s+(?:for|at|look|like\s+for)\s+(?:my|the|this|next)\s+event)/i,
    answer: () => ({
      text: 'For general weather, check your phone 😄 But I **can** check the forecast for your upcoming events - try asking "weather for my events" and I\'ll pull real forecasts!',
      navSuggestions: [{ label: 'Calendar', href: '/calendar' }],
    }),
  },
  // "What can you do?" / "What are you capable of?" / "Help"
  {
    pattern: /^(?:what\s+can\s+you\s+do|help|what\s+are\s+(?:you|your)\s+capabilit)/i,
    answer: () => ({
      text: `Here's what I can help with, chef 🔪\n\n**Quick answers:** Client counts, revenue, margins, schedules, conversion rates - instant from your data\n**Drafts:** Thank-you notes, follow-ups, payment reminders, cover letters, re-engagement emails\n**Lookups:** Client search, dietary/allergy checks, recipe search, calendar availability\n**Analysis:** Break-even, cost optimization, client LTV, profitability\n**Ops:** Packing lists, prep timelines, portion scaling, cross-contamination checks\n**Memory:** "Remember that..." to teach me your preferences\n\nJust ask naturally - I'll figure out what you need. 🎯`,
    }),
  },
  // "Good morning" / "Hey" / greetings - warm but brief, with proactive context
  {
    pattern:
      /^(?:good\s+morning|good\s+afternoon|good\s+evening|morning|afternoon|evening|hey|hi|hello|yo|sup|what'?s?\s+up)(?:\s+remy)?\s*[!.?]?$/i,
    answer: (ctx) => {
      const clock = getChefClock({ chefTimezone: ctx.chefTimezone })
      const greeting = clock.hour < 12 ? 'Morning' : clock.hour < 17 ? 'Afternoon' : 'Evening'
      const lines: string[] = [`${greeting}, chef! 👨‍🍳`]

      // Proactive context - what's most relevant right now
      const nuggets: string[] = []
      if (ctx.upcomingEvents && ctx.upcomingEvents.length > 0) {
        const today = ctx.upcomingEvents.filter((e) => {
          if (!e.date) return false
          return isSameChefDate(e.date, clock)
        })
        if (today.length > 0) {
          nuggets.push(
            `You've got **${today.length} event${today.length !== 1 ? 's' : ''} today** - game time 🔥`
          )
        } else {
          const next = ctx.upcomingEvents[0]
          if (next.date) {
            const daysUntil = daysUntilChefDate(next.date, clock)
            if (daysUntil !== null && daysUntil <= 3) {
              nuggets.push(
                `Next event in **${daysUntil} day${daysUntil !== 1 ? 's' : ''}**: ${next.occasion ?? 'Event'} for ${next.clientName}`
              )
            }
          }
        }
      }
      if (ctx.overduePayments && ctx.overduePayments.length > 0) {
        nuggets.push(
          `${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''} need attention`
        )
      }
      if (ctx.staleInquiries && ctx.staleInquiries.length > 0) {
        nuggets.push(
          `${ctx.staleInquiries.length} inquir${ctx.staleInquiries.length !== 1 ? 'ies' : 'y'} waiting for a response`
        )
      }

      if (nuggets.length > 0) {
        lines.push('')
        lines.push('Quick snapshot:')
        for (const n of nuggets) lines.push(`- ${n}`)
        lines.push('')
        lines.push("What's on your mind?")
      } else {
        lines.push("What's cooking today?")
      }

      return { text: lines.join('\n') }
    },
  },
  // "Thanks" / "Thank you" / confirmations
  {
    pattern:
      /^(?:thanks|thank\s+you|thx|ty|cheers|appreciate\s+it|perfect|great|awesome|nice|got\s+it|cool)\s*[!.]*$/i,
    answer: () => ({
      text: 'Anytime, chef 🤙 Hit me up whenever you need something.',
    }),
  },
  // "What's my busiest day?" / "When am I busiest?"
  {
    pattern: /^(?:what'?s?\s+my\s+busiest\s+day|when\s+am\s+i\s+busiest)/i,
    answer: (ctx) => {
      if (!ctx.dayOfWeekPattern) return null
      return {
        text: `Your busiest day is **${ctx.dayOfWeekPattern.busiestDay}** and your slowest is **${ctx.dayOfWeekPattern.slowestDay}**.\n\n${ctx.dayOfWeekPattern.distribution ? `Breakdown: ${ctx.dayOfWeekPattern.distribution.map((d) => `${d.day}: ${d.count}`).join(', ')}` : ''}\n\nUse this for scheduling and availability planning. 📅`,
        navSuggestions: [{ label: 'Schedule', href: '/schedule' }],
      }
    },
  },
  // "Where is my money going?" / "Expense breakdown"
  {
    pattern:
      /^(?:where\s+is\s+my\s+money\s+going|expense\s+breakdown|what\s+are\s+my\s+(?:biggest\s+)?expenses)/i,
    answer: (ctx) => {
      if (!ctx.expenseBreakdown || ctx.expenseBreakdown.length === 0) return null
      const total = ctx.expenseBreakdown.reduce((s, e) => s + e.totalCents, 0)
      const lines = [`**YTD Expenses: $${(total / 100).toLocaleString()}**\n`]
      for (const e of ctx.expenseBreakdown.slice(0, 5)) {
        const pct = Math.round((e.totalCents / total) * 100)
        lines.push(
          `- **${e.category.replace(/_/g, ' ')}:** $${(e.totalCents / 100).toLocaleString()} (${pct}%)`
        )
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Expenses', href: '/expenses' }],
      }
    },
  },
  // "How are my clients finding me?" / "Referral sources"
  {
    pattern:
      /^(?:how\s+are\s+(?:my\s+)?clients?\s+finding\s+me|(?:what\s+are\s+)?(?:my\s+)?referral\s+sources|where\s+(?:do|are)\s+(?:my\s+)?clients?\s+come?\s+from)/i,
    answer: (ctx) => {
      if (!ctx.referralSources || ctx.referralSources.length === 0) return null
      const lines = ['**How clients find you:**\n']
      for (const r of ctx.referralSources) {
        lines.push(`- **${r.source}:** ${r.pct}% (${r.count} clients)`)
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Network', href: '/network' }],
      }
    },
  },
  // "What's my average guest count?" / "Guest count trend"
  {
    pattern: /^(?:what'?s?\s+(?:my\s+)?average\s+guest\s+count|guest\s+count\s+trend)/i,
    answer: (ctx) => {
      if (!ctx.guestCountTrend) return null
      const gc = ctx.guestCountTrend
      return {
        text: `Recent average: **${gc.recentAvg} guests/event** (previous: ${gc.previousAvg}).\n\nTrend: **${gc.direction}** ${gc.direction === 'growing' ? '📈 Events are getting bigger - consider scaling your pricing and staffing accordingly.' : gc.direction === 'shrinking' ? '📉 Events are getting smaller - could mean more intimate bookings or a shift in clientele.' : '➡️ Stable guest counts.'}`,
      }
    },
  },
  // "How far ahead do clients book?" / "Booking lead time"
  {
    pattern:
      /^(?:how\s+far\s+ahead|booking\s+lead\s+time|when\s+do\s+clients\s+(?:usually\s+)?book)/i,
    answer: (ctx) => {
      if (!ctx.avgLeadTime) return null
      const lt = ctx.avgLeadTime
      return {
        text: `Clients book an average of **${lt.avgDays} days ahead** (median: ${lt.medianDays}d).\n\nRange: ${lt.shortestDays}–${lt.longestDays} days.\n\nUse this for capacity planning - start marketing for slow periods at least ${lt.avgDays} days out.`,
      }
    },
  },
  // "How many staff do I have?" / "Who's on my team?"
  {
    pattern:
      /^(?:how\s+many\s+staff|who'?s?\s+on\s+my\s+(?:team|staff|crew)|(?:show|list)\s+(?:my\s+)?staff|my\s+team)/i,
    answer: (ctx) => {
      if (!ctx.staffRoster || ctx.staffRoster.length === 0) {
        return {
          text: "No staff members on your roster yet. Head to Staff to add your first team member - even if it's just you. 🧑‍🍳",
          navSuggestions: [{ label: 'Staff', href: '/staff' }],
        }
      }
      const byRole = new Map<string, number>()
      for (const s of ctx.staffRoster) {
        const role = s.role || 'Unassigned'
        byRole.set(role, (byRole.get(role) ?? 0) + 1)
      }
      const roleBreakdown = Array.from(byRole.entries())
        .map(([role, count]) => `${role}: ${count}`)
        .join(', ')
      return {
        text: `You have **${ctx.staffRoster.length} active staff member${ctx.staffRoster.length !== 1 ? 's' : ''}**.\n\nRoles: ${roleBreakdown}\n\nTeam: ${ctx.staffRoster.map((s) => s.name).join(', ')}`,
        navSuggestions: [{ label: 'Staff', href: '/staff' }],
      }
    },
  },
  // "How many recipes do I have?" / "What's in my recipe book?"
  {
    pattern:
      /^(?:how\s+many\s+recipes?|what'?s?\s+in\s+my\s+recipe\s+(?:book|library)|(?:show|list)\s+(?:my\s+)?recipes?|recipe\s+(?:count|stats))/i,
    answer: (ctx) => {
      if (!ctx.recipeStats || ctx.recipeStats.totalRecipes === 0) {
        return {
          text: 'Your recipe library is empty. Head to Recipes → New Recipe to start building your collection. 📖',
          navSuggestions: [
            { label: 'Recipes', href: '/recipes' },
            { label: 'New Recipe', href: '/recipes/new' },
          ],
        }
      }
      return {
        text: `You have **${ctx.recipeStats.totalRecipes} recipe${ctx.recipeStats.totalRecipes !== 1 ? 's' : ''}** in your library${ctx.recipeStats.categories.length > 0 ? ` across ${ctx.recipeStats.categories.length} categor${ctx.recipeStats.categories.length !== 1 ? 'ies' : 'y'}: ${ctx.recipeStats.categories.join(', ')}` : ''}.`,
        navSuggestions: [{ label: 'Recipes', href: '/recipes' }],
      }
    },
  },
  // "What are my goals?" / "How are my goals going?"
  {
    pattern:
      /^(?:what\s+are\s+my\s+goals?|how\s+are\s+my\s+goals?\s+(?:going|doing|progressing)|(?:show|list)\s+(?:my\s+)?goals?|goal\s+(?:progress|status))/i,
    answer: (ctx) => {
      if (!ctx.activeGoals || ctx.activeGoals.length === 0) {
        return {
          text: 'No active goals set. Having clear targets keeps you focused - head to Goals to set your first one. 🎯',
          navSuggestions: [{ label: 'Goals', href: '/goals' }],
        }
      }
      const lines = [
        `**${ctx.activeGoals.length} active goal${ctx.activeGoals.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const g of ctx.activeGoals) {
        const progress = g.progress != null ? ` - ${g.progress}%` : ''
        const deadline = g.targetDate
          ? ` (due ${new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          : ''
        lines.push(`- **${g.title}**${progress}${deadline}`)
      }
      const avgProgress =
        ctx.activeGoals.filter((g) => g.progress != null).length > 0
          ? Math.round(
              ctx.activeGoals.reduce((s, g) => s + (g.progress ?? 0), 0) /
                ctx.activeGoals.filter((g) => g.progress != null).length
            )
          : null
      if (avgProgress !== null) {
        lines.push(
          `\nAverage progress: **${avgProgress}%** ${avgProgress >= 75 ? '🔥' : avgProgress >= 50 ? '💪' : '📈'}`
        )
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Goals', href: '/goals' }],
      }
    },
  },
  // "What's on my todo list?" / "Any tasks due today?"
  {
    pattern:
      /^(?:what'?s?\s+on\s+my\s+(?:todo|to-do|task)\s*(?:list)?|(?:any|what)\s+tasks?\s+(?:due\s+)?(?:today|pending)|(?:show|list)\s+(?:my\s+)?(?:todos?|tasks?)|my\s+todo\s*list)/i,
    answer: (ctx) => {
      if (!ctx.activeTodos || ctx.activeTodos.length === 0) {
        return {
          text: 'Your task list is clear - nothing pending. 🙌 Focus on what matters most today.',
        }
      }
      const _ria = new Date()
      const today = `${_ria.getFullYear()}-${String(_ria.getMonth() + 1).padStart(2, '0')}-${String(_ria.getDate()).padStart(2, '0')}`
      const overdue = ctx.activeTodos.filter((t) => t.dueDate && t.dueDate < today)
      const dueToday = ctx.activeTodos.filter((t) => t.dueDate === today)
      const upcoming = ctx.activeTodos.filter((t) => !t.dueDate || t.dueDate > today)
      const lines: string[] = [
        `**${ctx.activeTodos.length} pending task${ctx.activeTodos.length !== 1 ? 's' : ''}:**\n`,
      ]
      if (overdue.length > 0) {
        lines.push(`⚠️ **Overdue (${overdue.length}):**`)
        for (const t of overdue) lines.push(`- ${t.title} (due ${t.dueDate})`)
      }
      if (dueToday.length > 0) {
        lines.push(`📌 **Due today (${dueToday.length}):**`)
        for (const t of dueToday) lines.push(`- ${t.title}`)
      }
      if (upcoming.length > 0 && lines.length < 10) {
        lines.push(`📋 **Upcoming (${upcoming.length}):**`)
        for (const t of upcoming.slice(0, 3))
          lines.push(`- ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''}`)
        if (upcoming.length > 3) lines.push(`  ...and ${upcoming.length - 3} more`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "Any payments coming due?" / "Payment deadlines"
  {
    pattern:
      /^(?:any\s+payments?\s+(?:coming\s+)?due|payment\s+deadlines?|(?:upcoming|pending)\s+payments?|who\s+(?:needs?\s+to|owes?\s+me)\s+pay)/i,
    answer: (ctx) => {
      const items: string[] = []
      if (ctx.overduePayments && ctx.overduePayments.length > 0) {
        items.push(`⚠️ **${ctx.overduePayments.length} overdue:**`)
        for (const p of ctx.overduePayments) {
          items.push(
            `- ${p.clientName}: $${(p.amountCents / 100).toLocaleString()} (${p.daysOverdue}d overdue)`
          )
        }
      }
      if (ctx.upcomingPaymentDeadlines && ctx.upcomingPaymentDeadlines.length > 0) {
        items.push(`📅 **${ctx.upcomingPaymentDeadlines.length} due this week:**`)
        for (const p of ctx.upcomingPaymentDeadlines) {
          items.push(
            `- ${p.clientName} - ${p.occasion}: $${(p.amountCents / 100).toLocaleString()} (${p.daysUntilDue === 0 ? 'today' : `in ${p.daysUntilDue}d`})`
          )
        }
      }
      if (items.length === 0) {
        return {
          text: 'No payment deadlines coming up - all clear on the money front. 💰',
          navSuggestions: [{ label: 'Finance', href: '/finance' }],
        }
      }
      return {
        text: items.join('\n'),
        navSuggestions: [{ label: 'Finance', href: '/finance' }],
      }
    },
  },
  // "Any quotes expiring?" / "Expiring quotes"
  {
    pattern:
      /^(?:any\s+quotes?\s+expir|expiring\s+quotes?|quotes?\s+(?:about\s+to\s+)?expire|pending\s+quotes?)/i,
    answer: (ctx) => {
      if (!ctx.expiringQuotes || ctx.expiringQuotes.length === 0) {
        const pending = ctx.pendingQuoteCount ?? 0
        return {
          text:
            pending > 0
              ? `No quotes expiring soon. You have **${pending} pending quote${pending !== 1 ? 's' : ''}** out there.`
              : 'No expiring or pending quotes. 📄',
          navSuggestions: [{ label: 'Quotes', href: '/quotes' }],
        }
      }
      const lines = [
        `**${ctx.expiringQuotes.length} quote${ctx.expiringQuotes.length !== 1 ? 's' : ''} expiring soon:**\n`,
      ]
      for (const q of ctx.expiringQuotes) {
        lines.push(
          `- **${q.clientName}** - ${q.occasion}: $${(q.totalCents / 100).toLocaleString()} (expires ${q.daysUntilExpiry === 0 ? 'today ⚠️' : `in ${q.daysUntilExpiry}d`})`
        )
      }
      lines.push('\nFollow up before they expire - a quick nudge can close the deal. 🎯')
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Quotes', href: '/quotes' }],
      }
    },
  },
  // "What equipment do I have?" / "Equipment list"
  {
    pattern:
      /^(?:what\s+equipment|(?:show|list)\s+(?:my\s+)?equipment|equipment\s+(?:list|inventory|summary)|my\s+equipment)/i,
    answer: (ctx) => {
      if (!ctx.equipmentSummary || ctx.equipmentSummary.totalItems === 0) {
        return {
          text: 'No equipment tracked yet. Log your gear on the Equipment page for depreciation tracking and event prep planning. 🔧',
        }
      }
      return {
        text: `**${ctx.equipmentSummary.totalItems} equipment item${ctx.equipmentSummary.totalItems !== 1 ? 's' : ''}** tracked${ctx.equipmentSummary.categories.length > 0 ? ` across ${ctx.equipmentSummary.categories.length} categor${ctx.equipmentSummary.categories.length !== 1 ? 'ies' : 'y'}: ${ctx.equipmentSummary.categories.join(', ')}` : ''}.`,
      }
    },
  },
  // "Any clients I should re-engage?" / "Who haven't I talked to?"
  {
    pattern:
      /^(?:any\s+clients?\s+(?:i\s+should\s+)?(?:re-?engage|reach\s+out\s+to|follow\s+up\s+with)|who\s+(?:haven'?t\s+i|should\s+i)\s+(?:talked?\s+to|contacted?|reached?\s+out)|dormant\s+clients?|inactive\s+clients?)/i,
    answer: (ctx) => {
      if (!ctx.clientReengagement || ctx.clientReengagement.length === 0) {
        return {
          text: "All your clients are within their normal booking patterns - no one's overdue for a touchpoint. 👍",
          navSuggestions: [{ label: 'Clients', href: '/clients' }],
        }
      }
      const lines = [
        `**${ctx.clientReengagement.length} client${ctx.clientReengagement.length !== 1 ? 's' : ''} overdue for a booking:**\n`,
      ]
      for (const c of ctx.clientReengagement.slice(0, 5)) {
        lines.push(
          `- **${c.clientName}** - usually books every ~${c.avgIntervalDays}d, last booked ${c.daysSinceLastBooking}d ago (${c.eventCount} events total)`
        )
      }
      lines.push(
        '\nA quick check-in can reignite the relationship. Try: "Draft a re-engagement for [name]" 📬'
      )
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Clients', href: '/clients' }],
      }
    },
  },
  // "How many documents?" / "Document count"
  {
    pattern:
      /^(?:how\s+many\s+(?:documents?|docs?|files?)|document\s+(?:count|summary|stats)|(?:show|list)\s+(?:my\s+)?(?:documents?|docs?))/i,
    answer: (ctx) => {
      if (!ctx.documentSummary) return null
      const d = ctx.documentSummary
      if (d.totalDocuments === 0) {
        return {
          text: 'No documents uploaded yet. Use the Documents page to store contracts, menus, and important files. 📁',
        }
      }
      return {
        text: `**${d.totalDocuments} document${d.totalDocuments !== 1 ? 's' : ''}** stored${d.totalFolders > 0 ? ` in ${d.totalFolders} folder${d.totalFolders !== 1 ? 's' : ''}` : ''}.`,
      }
    },
  },
  // "What's my dietary profile?" / "Common dietary restrictions"
  {
    pattern:
      /^(?:what'?s?\s+(?:my\s+)?(?:dietary|allergy)\s+(?:profile|breakdown|summary)|common\s+(?:dietary|allergy|restriction)|what\s+(?:dietary|allergies?)\s+(?:do|are)\s+(?:my\s+)?clients?\s+have)/i,
    answer: (ctx) => {
      if (!ctx.dietaryProfile) return null
      const dp = ctx.dietaryProfile
      const lines: string[] = ['**Your client dietary landscape:**\n']
      if (dp.topDietary.length > 0) {
        lines.push('Dietary restrictions:')
        for (const d of dp.topDietary.slice(0, 5)) {
          lines.push(`- **${d.name}**: ${d.count} event${d.count !== 1 ? 's' : ''}`)
        }
      }
      if (dp.topAllergies.length > 0) {
        lines.push('\nAllergies (safety-critical ⚠️):')
        for (const a of dp.topAllergies.slice(0, 5)) {
          lines.push(`- **${a.name}**: ${a.count} event${a.count !== 1 ? 's' : ''}`)
        }
      }
      if (dp.topDietary.length === 0 && dp.topAllergies.length === 0) return null
      lines.push('\nUse this for menu planning and cross-contamination awareness.')
      return { text: lines.join('\n') }
    },
  },
  // "What's my next event?" / "Next event" / "When's my next gig?"
  {
    pattern:
      /^(?:what'?s?\s+(?:my\s+)?next\s+event|next\s+(?:event|gig|booking)|when'?s?\s+(?:my\s+)?next\s+(?:event|gig|booking))/i,
    answer: (ctx) => {
      if (!ctx.upcomingEvents || ctx.upcomingEvents.length === 0) {
        return {
          text: 'No upcoming events on the books. Good time for outreach or menu development. 📋',
          navSuggestions: [{ label: 'Events', href: '/events' }],
        }
      }
      const e = ctx.upcomingEvents[0]
      const lines = [`**Next up:** ${e.occasion ?? 'Event'} for ${e.clientName}`]
      if (e.date) {
        const dt = new Date(e.date)
        const daysUntil = Math.ceil((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        lines[0] += ` on ${dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
        if (daysUntil <= 1) lines[0] += " - **that's tomorrow!** 🔥"
        else if (daysUntil <= 3) lines[0] += ` - **${daysUntil} days away**`
      }
      lines.push(`- Status: ${e.status}`)
      if (e.guestCount) lines.push(`- Guests: ${e.guestCount}`)
      if (e.clientLoyaltyTier) lines.push(`- Client tier: ${e.clientLoyaltyTier}`)
      const readiness: string[] = []
      if (!e.prepReady) readiness.push('prep list')
      if (!e.groceryReady) readiness.push('grocery list')
      if (!e.timelineReady) readiness.push('timeline')
      if (readiness.length > 0) {
        lines.push(`\n⚠️ Still needs: ${readiness.join(', ')}`)
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Events', href: '/events' }],
      }
    },
  },
  // "Any pending quotes?" / "How many quotes?"
  {
    pattern:
      /^(?:(?:how\s+many|any)\s+(?:pending|open|outstanding)\s+quotes?|pending\s+quotes?\s+count|quotes?\s+(?:pending|waiting))/i,
    answer: (ctx) => {
      const count = ctx.pendingQuoteCount ?? 0
      if (count === 0) {
        return {
          text: 'No pending quotes right now. All caught up on the quoting front. 📄',
          navSuggestions: [{ label: 'Quotes', href: '/quotes' }],
        }
      }
      let extra = ''
      if (ctx.quoteDistribution && ctx.quoteDistribution.count > 0) {
        const median = (ctx.quoteDistribution.medianCents / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
        extra = `\n\nYour typical quote: ${median} (median).`
      }
      return {
        text: `You have **${count} pending quote${count !== 1 ? 's' : ''}** out there waiting for a response.${extra}`,
        navSuggestions: [{ label: 'Quotes', href: '/quotes' }],
      }
    },
  },
  // "Quote range" / "Quote distribution" / "What do I usually quote?"
  {
    pattern:
      /^(?:what\s+(?:do\s+i|is\s+my)\s+(?:usually\s+)?quot|quot(?:e|ing)\s+(?:range|distribution|stats|breakdown|history)|(?:my|average)\s+quot)/i,
    answer: (ctx) => {
      if (!ctx.quoteDistribution || ctx.quoteDistribution.count === 0) return null
      const qd = ctx.quoteDistribution
      const fmt = (c: number) =>
        (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      return {
        text: `**Your quote range** (${qd.count} quotes):\n\n- Low: ${fmt(qd.minCents)}\n- 25th percentile: ${fmt(qd.p25Cents)}\n- **Median: ${fmt(qd.medianCents)}**\n- 75th percentile: ${fmt(qd.p75Cents)}\n- High: ${fmt(qd.maxCents)}\n\nUse this to benchmark when pricing new events. 🎯`,
        navSuggestions: [{ label: 'Quotes', href: '/quotes' }],
      }
    },
  },
  // "Any new messages?" / "Unread inquiries" / "New leads"
  {
    pattern:
      /^(?:any\s+(?:new\s+)?(?:messages?|leads?|inquir)|new\s+(?:messages?|leads?|inquir)|unread\s+(?:messages?|inquir)|(?:show|check)\s+(?:my\s+)?(?:inbox|messages?))/i,
    answer: (ctx) => {
      const unread = ctx.unreadInquiryMessages ?? []
      const stale = ctx.staleInquiries ?? []
      if (unread.length === 0 && stale.length === 0) {
        return {
          text: 'Inbox is clear - no unread messages or stale inquiries. 📬',
          navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
        }
      }
      const lines: string[] = []
      if (unread.length > 0) {
        lines.push(
          `**${unread.length} unread message${unread.length !== 1 ? 's' : ''}** from leads.`
        )
      }
      if (stale.length > 0) {
        lines.push(
          `**${stale.length} inquir${stale.length !== 1 ? 'ies' : 'y'}** going cold (${stale
            .slice(0, 3)
            .map((i) => `${i.leadName} - ${i.daysSinceContact}d`)
            .join(', ')}).`
        )
      }
      return {
        text: lines.join('\n\n'),
        navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
      }
    },
  },
  // "What should I do today?" / "Daily plan" / "Today's plan"
  {
    pattern:
      /^(?:what\s+should\s+i\s+(?:do|work\s+on)\s+today|(?:today'?s?|my)\s+(?:daily\s+)?plan|daily\s+plan|what'?s?\s+(?:on\s+)?(?:my\s+)?(?:plan|agenda)\s+(?:for\s+)?today)/i,
    answer: (ctx) => {
      if (!ctx.dailyPlan || ctx.dailyPlan.totalItems === 0) {
        // Fall through to LLM for a more helpful answer based on full context
        return null
      }
      const dp = ctx.dailyPlan
      const lines = [
        `**Today's plan:** ${dp.totalItems} item${dp.totalItems !== 1 ? 's' : ''} (~${dp.estimatedMinutes} min)\n`,
      ]
      if (dp.adminItems > 0) lines.push(`- Admin: ${dp.adminItems} tasks`)
      if (dp.prepItems > 0) lines.push(`- Prep: ${dp.prepItems} tasks`)
      if (dp.creativeItems > 0) lines.push(`- Creative: ${dp.creativeItems} tasks`)
      if (dp.relationshipItems > 0) lines.push(`- Relationship: ${dp.relationshipItems} tasks`)

      // Add urgent context
      const urgentNuggets: string[] = []
      if (ctx.overduePayments && ctx.overduePayments.length > 0)
        urgentNuggets.push(
          `${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''}`
        )
      if (ctx.staleInquiries && ctx.staleInquiries.length > 0)
        urgentNuggets.push(
          `${ctx.staleInquiries.length} stale inquir${ctx.staleInquiries.length !== 1 ? 'ies' : 'y'}`
        )
      if (urgentNuggets.length > 0) {
        lines.push(`\n⚠️ Also needs attention: ${urgentNuggets.join(', ')}`)
      }

      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Daily Ops', href: '/stations/daily-ops' }],
      }
    },
  },
  // "Recent emails" / "Email summary" / "What's in my inbox?"
  {
    pattern:
      /^(?:recent\s+emails?|email\s+(?:summary|digest|activity)|what'?s?\s+in\s+my\s+(?:inbox|email)|(?:show|check)\s+(?:my\s+)?email)/i,
    answer: (ctx) => {
      if (!ctx.emailDigest) return null
      const ed = ctx.emailDigest
      if (ed.totalSinceYesterday === 0) {
        return { text: 'No new emails since yesterday. Quiet inbox. 📧' }
      }
      const lines = [
        `**${ed.totalSinceYesterday} email${ed.totalSinceYesterday !== 1 ? 's' : ''} since yesterday:**`,
      ]
      if (ed.inquiryCount > 0)
        lines.push(`- ${ed.inquiryCount} new inquir${ed.inquiryCount !== 1 ? 'ies' : 'y'}`)
      if (ed.threadReplyCount > 0)
        lines.push(`- ${ed.threadReplyCount} thread repl${ed.threadReplyCount !== 1 ? 'ies' : 'y'}`)
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
      }
    },
  },
  // "Any menu approvals pending?" / "Menu approval status"
  {
    pattern:
      /^(?:any\s+(?:pending\s+)?menu\s+approvals?|menu\s+approval\s+(?:status|pending)|pending\s+menu\s+approvals?|who'?s?\s+waiting\s+(?:on|for)\s+(?:a\s+)?menu)/i,
    answer: (ctx) => {
      if (!ctx.pendingMenuApprovals || ctx.pendingMenuApprovals.length === 0) {
        return {
          text: 'No pending menu approvals - all menus are either approved or not yet sent. 🍽️',
        }
      }
      const lines = [
        `**${ctx.pendingMenuApprovals.length} menu${ctx.pendingMenuApprovals.length !== 1 ? 's' : ''} awaiting client approval:**\n`,
      ]
      for (const m of ctx.pendingMenuApprovals) {
        lines.push(`- ${m}`)
      }
      let extra = ''
      if (ctx.menuApprovalStats) {
        extra = `\n\nAvg approval time: ${ctx.menuApprovalStats.avgDays} days (fastest: ${ctx.menuApprovalStats.fastestDays}d, slowest: ${ctx.menuApprovalStats.slowestDays}d).`
      }
      return { text: lines.join('\n') + extra }
    },
  },
  // "Seasonal trends" / "Revenue pattern" / "Busy season"
  {
    pattern:
      /^(?:(?:my\s+)?(?:seasonal|revenue)\s+(?:trends?|pattern|cycle)|busy\s+season|when'?s?\s+(?:my\s+)?(?:busy|slow)\s+(?:season|time)|slow\s+season)/i,
    answer: (ctx) => {
      if (!ctx.revenuePattern) return null
      const rp = ctx.revenuePattern
      const avg = (rp.monthlyAvgCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      return {
        text: `**Your revenue pattern:**\n\n- Busiest month: **${rp.busiestMonth}**\n- Slowest month: **${rp.slowestMonth}**\n- Monthly average: ${avg}\n\nPlan your marketing and capacity around these cycles. 📊`,
        navSuggestions: [{ label: 'Analytics', href: '/analytics' }],
      }
    },
  },
  // "Calendar this month" / "Blocked dates" / "When am I free?"
  {
    pattern:
      /^(?:(?:my\s+)?calendar\s+(?:this\s+month|summary|overview)|blocked\s+dates?|when\s+am\s+i\s+(?:free|available|open)|(?:show|what'?s?\s+on)\s+(?:my\s+)?calendar)/i,
    answer: (ctx) => {
      if (!ctx.calendarSummary) return null
      const cs = ctx.calendarSummary
      const blocked = cs.blockedDates?.length ?? 0
      const entries = cs.calendarEntries?.length ?? 0
      const waitlist = cs.waitlistEntries?.length ?? 0
      if (blocked === 0 && entries === 0) {
        return {
          text: 'Your calendar is wide open for the next 30 days. Time to fill it! 📅',
          navSuggestions: [{ label: 'Schedule', href: '/schedule' }],
        }
      }
      const lines = ['**Next 30 days:**\n']
      if (entries > 0) lines.push(`- ${entries} scheduled event${entries !== 1 ? 's' : ''}`)
      if (blocked > 0) lines.push(`- ${blocked} blocked date${blocked !== 1 ? 's' : ''}`)
      if (waitlist > 0) lines.push(`- ${waitlist} on the waitlist`)
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Schedule', href: '/schedule' }],
      }
    },
  },
  // "Recent lessons" / "After-action reviews" / "What went wrong recently?"
  {
    pattern:
      /^(?:(?:recent|latest)\s+(?:lessons?|AARs?|reviews?|insights?)|after[- ]?action\s+review|what\s+(?:went\s+wrong|did\s+i\s+learn)|lessons?\s+learned)/i,
    answer: (ctx) => {
      if (!ctx.recentAARInsights || ctx.recentAARInsights.length === 0) {
        return {
          text: 'No after-action reviews yet. After your next event, do a quick debrief - it compounds fast. 📝',
        }
      }
      const lines = [
        `**${ctx.recentAARInsights.length} recent after-action review${ctx.recentAARInsights.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const aar of ctx.recentAARInsights.slice(0, 3)) {
        lines.push(`- Rating: ${'⭐'.repeat(aar.rating ?? 0)}`)
        if (aar.wentWell) lines.push(`  ✅ ${aar.wentWell}`)
        if (aar.toImprove) lines.push(`  🔧 ${aar.toImprove}`)
        if (aar.lessonsLearned) lines.push(`  💡 ${aar.lessonsLearned}`)
        lines.push('')
      }
      return { text: lines.join('\n') }
    },
  },
  // "How's my business?" / "Business health" / "Business summary"
  {
    pattern:
      /^(?:how'?s?\s+(?:my\s+)?(?:business|things?)\s*(?:going|looking|doing)?|business\s+(?:health|summary|overview|status)|(?:give\s+me\s+a\s+)?(?:business\s+)?overview)/i,
    answer: (ctx) => {
      if (!ctx.businessIntelligence) return null
      return {
        text: ctx.businessIntelligence,
        navSuggestions: [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics', href: '/analytics' },
        ],
      }
    },
  },
  // "Recent activity" / "What's been happening?"
  {
    pattern:
      /^(?:recent\s+(?:activity|work|updates?)|what'?s?\s+(?:been\s+happening|new|changed)|(?:show|any)\s+recent\s+(?:activity|updates?)|(?:catch\s+me\s+up|what\s+changed\s+while\s+i\s+was\s+away|what'?s?\s+changed\s+since\s+i\s+left|what\s+happened\s+while\s+i\s+was\s+gone))/i,
    answer: (ctx, _match, options) => {
      if (options.continuityDigest) {
        return formatContinuityDigestAnswer(options.continuityDigest)
      }
      if (!ctx.recentArtifacts || ctx.recentArtifacts.length === 0) {
        return { text: 'No recent activity to show. 📋' }
      }
      const lines = [`**Recent activity (${ctx.recentArtifacts.length} items):**\n`]
      for (const a of ctx.recentArtifacts.slice(0, 8)) {
        const when = a.createdAt
          ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : ''
        lines.push(`- ${a.type}: **${a.title}** ${when ? `(${when})` : ''}`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "What service styles do I do?" / "Service style breakdown"
  {
    pattern:
      /^(?:what\s+(?:service\s+)?styles?\s+do\s+i|service\s+style\s+(?:breakdown|distribution|split)|my\s+service\s+styles?)/i,
    answer: (ctx) => {
      if (!ctx.serviceStyles || ctx.serviceStyles.length === 0) return null
      const lines = ['**Your service style breakdown:**\n']
      for (const s of ctx.serviceStyles) {
        lines.push(`- **${s.style}**: ${s.count} event${s.count !== 1 ? 's' : ''} (${s.pct}%)`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "Any upcoming calls?" / "Scheduled calls"
  {
    pattern:
      /^(?:any\s+(?:upcoming\s+)?calls?|scheduled\s+calls?|(?:show|list)\s+(?:my\s+)?calls?|do\s+i\s+have\s+(?:any\s+)?calls?)/i,
    answer: (ctx) => {
      if (!ctx.upcomingCalls || ctx.upcomingCalls.length === 0) {
        return { text: 'No scheduled calls coming up. 📞' }
      }
      const lines = [
        `**${ctx.upcomingCalls.length} upcoming call${ctx.upcomingCalls.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const c of ctx.upcomingCalls) {
        const when = new Date(c.scheduledAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
        lines.push(`- **${c.clientName}** - ${c.purpose ?? 'call'} (${when})`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "What's my YTD?" / "Year to date stats" / "How's my year going?"
  {
    pattern:
      /^(?:what'?s?\s+(?:my\s+)?(?:ytd|year\s+to\s+date)|how'?s?\s+my\s+year\s+(?:going|looking|so\s+far)|year\s+(?:summary|stats|recap))/i,
    answer: (ctx) => {
      if (!ctx.yearlyStats) return null
      const ys = ctx.yearlyStats
      const rev = (ys.yearRevenueCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      const exp = (ys.yearExpenseCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      const profit = ((ys.yearRevenueCents - ys.yearExpenseCents) / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      const margin =
        ys.yearRevenueCents > 0
          ? Math.round(((ys.yearRevenueCents - ys.yearExpenseCents) / ys.yearRevenueCents) * 100)
          : 0
      const avgEvent =
        ys.totalEventsThisYear > 0
          ? (ys.avgEventRevenueCents / 100).toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })
          : '$0'
      return {
        text: `**${new Date().getFullYear()} Year-to-Date:**\n\n- Revenue: **${rev}** (actual payments received)\n- Expenses: ${exp}\n- Profit: **${profit}** (${margin}% margin)\n- Events: ${ys.totalEventsThisYear} total (${ys.completedEventsThisYear} completed)\n- Avg revenue/event: ${avgEvent}\n\n${margin >= 50 ? 'Strong margins - your year is on track.' : margin >= 30 ? 'Decent margins. Keep an eye on expenses.' : 'Margins are tight - worth reviewing your cost structure.'}\n\n_Revenue reflects payments logged in your ledger. Quoted prices for upcoming events appear in Finance > Reporting._`,
        navSuggestions: [
          { label: 'Finance', href: '/finance' },
          { label: 'Analytics', href: '/analytics' },
        ],
      }
    },
  },
  // "How's my cash flow?" / "Expected income"
  {
    pattern:
      /^(?:how'?s?\s+(?:my\s+)?cash\s*flow|expected\s+(?:income|revenue)|cash\s*flow\s+(?:projection|forecast|outlook)|what'?s?\s+coming\s+in)/i,
    answer: (ctx) => {
      if (!ctx.cashFlowProjection) return null
      const cf = ctx.cashFlowProjection
      if (cf.eventCount === 0) {
        return {
          text: 'No upcoming events with projected revenue. Pipeline is empty - time for some outreach. 📬',
          navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
        }
      }
      return {
        text: `**Cash flow outlook:** ${(cf.expectedCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} expected from **${cf.eventCount} upcoming event${cf.eventCount !== 1 ? 's' : ''}**.\n\n${ctx.overduePayments && ctx.overduePayments.length > 0 ? `⚠️ Plus ${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''} outstanding.` : 'No overdue payments - clean pipeline. ✅'}`,
        navSuggestions: [{ label: 'Finance', href: '/finance' }],
      }
    },
  },
  // "What's my workload?" / "Am I overbooked?"
  {
    pattern:
      /^(?:what'?s?\s+my\s+workload|am\s+i\s+overbooked|how\s+(?:busy|packed|full)\s+am\s+i)/i,
    answer: (ctx) => {
      const clock = getChefClock({ chefTimezone: ctx.chefTimezone })
      const upcoming = ctx.upcomingEventCount ?? 0
      const todayEvents = (ctx.upcomingEvents ?? []).filter(
        (e) => e.date && isSameChefDate(e.date, clock)
      ).length
      const thisWeek = (ctx.upcomingEvents ?? []).length
      const status =
        thisWeek >= 5
          ? "You're packed - consider blocking time for prep and self-care."
          : thisWeek >= 3
            ? 'Steady week ahead. Manageable load.'
            : thisWeek > 0
              ? 'Light week - good time for admin, outreach, or creative work.'
              : 'Clear calendar. Perfect for planning ahead.'
      return {
        text: `**Workload snapshot:**\n\n- Today: **${todayEvents} event${todayEvents !== 1 ? 's' : ''}**\n- This week: **${thisWeek} event${thisWeek !== 1 ? 's' : ''}**\n- Total upcoming: **${upcoming}**\n\n${status}`,
        navSuggestions: [{ label: 'Calendar', href: '/calendar' }],
      }
    },
  },
  // "Who should I re-engage?" / "Dormant clients"
  {
    pattern:
      /^(?:who\s+should\s+i\s+re-?engage|dormant\s+clients?|inactive\s+clients?|clients?\s+(?:to\s+)?re-?engage|who'?s?\s+gone\s+quiet)/i,
    answer: (ctx) => {
      if (!ctx.clientReengagement || ctx.clientReengagement.length === 0) {
        return {
          text: 'All your clients are booking on schedule - no one dormant right now. Nice work. 💪',
        }
      }
      const lines = [
        `**${ctx.clientReengagement.length} client${ctx.clientReengagement.length !== 1 ? 's' : ''} overdue for a booking:**\n`,
      ]
      for (const c of ctx.clientReengagement.slice(0, 5)) {
        lines.push(
          `- **${c.clientName}** - last booked ${c.daysSinceLastBooking}d ago (usually every ${c.avgIntervalDays}d, ${c.eventCount} events total)`
        )
      }
      if (ctx.clientReengagement.length > 5) {
        lines.push(`\n_...and ${ctx.clientReengagement.length - 5} more._`)
      }
      lines.push('\nA quick text or email could bring them back. 📬')
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Clients', href: '/clients' }] }
    },
  },
  // "Expiring quotes" / "Quotes about to expire"
  {
    pattern:
      /^(?:expiring\s+quotes?|quotes?\s+(?:about\s+to\s+)?expir|quotes?\s+running\s+out|any\s+quotes?\s+expiring)/i,
    answer: (ctx) => {
      if (!ctx.expiringQuotes || ctx.expiringQuotes.length === 0) {
        return { text: 'No quotes expiring soon. All good on the proposals front. ✅' }
      }
      const lines = [
        `**${ctx.expiringQuotes.length} quote${ctx.expiringQuotes.length !== 1 ? 's' : ''} expiring soon:**\n`,
      ]
      for (const q of ctx.expiringQuotes) {
        const amt = (q.totalCents / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
        lines.push(
          `- **${q.clientName}** (${q.occasion}) - ${amt}, expires in ${q.daysUntilExpiry}d`
        )
      }
      lines.push('\nFollow up before they lapse!')
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Events', href: '/events' }] }
    },
  },
  // "Payment deadlines" / "What payments are due?"
  {
    pattern:
      /^(?:payment\s+deadlines?|what\s+payments?\s+(?:are\s+)?due|upcoming\s+payments?|due\s+payments?|invoices?\s+(?:due|coming\s+due))/i,
    answer: (ctx) => {
      const overdue = ctx.overduePayments ?? []
      const upcoming = ctx.upcomingPaymentDeadlines ?? []
      if (overdue.length === 0 && upcoming.length === 0) {
        return {
          text: 'No payments due or overdue. Clean slate! ✅',
          navSuggestions: [{ label: 'Finance', href: '/finance' }],
        }
      }
      const lines: string[] = []
      if (overdue.length > 0) {
        lines.push(`**${overdue.length} overdue:**\n`)
        for (const p of overdue) {
          const amt = (p.amountCents / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })
          lines.push(`- **${p.clientName}** - ${amt} (${p.daysOverdue}d overdue)`)
        }
        lines.push('')
      }
      if (upcoming.length > 0) {
        lines.push(`**${upcoming.length} due soon:**\n`)
        for (const p of upcoming) {
          const amt = (p.amountCents / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })
          lines.push(`- **${p.clientName}** (${p.occasion}) - ${amt} due in ${p.daysUntilDue}d`)
        }
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Finance', href: '/finance' }],
      }
    },
  },
  // "Inquiry velocity" / "How are inquiries trending?"
  {
    pattern:
      /^(?:inquiry\s+(?:velocity|trend|volume)|how\s+are\s+inquiries?\s+(?:trending|doing|looking)|lead\s+(?:flow|volume|trend))/i,
    answer: (ctx) => {
      if (!ctx.inquiryVelocity) return null
      const iv = ctx.inquiryVelocity
      const trend =
        iv.thisWeek > iv.lastWeek
          ? `Up from ${iv.lastWeek} last week - momentum building! 🔥`
          : iv.thisWeek < iv.lastWeek
            ? `Down from ${iv.lastWeek} last week. Time for some outreach?`
            : `Same as last week (${iv.lastWeek}). Steady pipeline.`
      return {
        text: `**Inquiry velocity:**\n\n- This week: **${iv.thisWeek} new inquiries**\n- Last week: ${iv.lastWeek}\n\n${trend}`,
        navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
      }
    },
  },
  // "What's my conversion rate by channel?"
  {
    pattern:
      /^(?:conversion\s+(?:rate\s+)?by\s+channel|channel\s+(?:performance|breakdown|conversion))/i,
    answer: (ctx) => {
      if (!ctx.conversionRate?.byChannel || ctx.conversionRate.byChannel.length === 0) return null
      const lines = [`**Conversion rate by channel** (overall: ${ctx.conversionRate.rate}%):\n`]
      for (const ch of ctx.conversionRate.byChannel) {
        lines.push(`- **${ch.channel}**: ${ch.rate}% (${ch.converted}/${ch.total})`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "Profitability" / "How profitable am I?"
  {
    pattern: /^(?:(?:how\s+)?profitable|profitability|profit\s+stats?|event\s+profitability)/i,
    answer: (ctx) => {
      if (!ctx.profitabilityStats) return null
      const ps = ctx.profitabilityStats
      const avgProfit = (ps.avgProfitCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      return {
        text: `**Profitability across ${ps.eventCount} events:**\n\n- Average margin: **${ps.avgMargin}%**\n- Best margin: ${ps.bestMargin}%\n- Worst margin: ${ps.worstMargin}%\n- Average profit/event: ${avgProfit}\n\n${ps.avgMargin >= 50 ? 'Strong margins - well-priced. 💰' : ps.avgMargin >= 30 ? 'Decent margins. Room to optimize costs.' : 'Thin margins - review your pricing or food costs.'}`,
        navSuggestions: [{ label: 'Analytics', href: '/analytics' }],
      }
    },
  },
  // "Day of week pattern" / "What's my busiest day of the week?"
  {
    pattern:
      /^(?:day\s+of\s+(?:the\s+)?week|which\s+day\s+(?:is|am\s+i)\s+busiest|event\s+distribution\s+by\s+day|when\s+do\s+(?:most|my)\s+events\s+happen)/i,
    answer: (ctx) => {
      if (!ctx.dayOfWeekPattern) return null
      const dp = ctx.dayOfWeekPattern
      const lines = [`**Event distribution by day:**\n`]
      for (const d of dp.distribution) {
        const bar = '█'.repeat(Math.min(d.count, 20))
        lines.push(`- ${d.day}: ${bar} (${d.count})`)
      }
      lines.push(`\nBusiest: **${dp.busiestDay}** | Slowest: **${dp.slowestDay}**`)
      return { text: lines.join('\n') }
    },
  },
  // "Guest count trend" / "Are my events getting bigger?"
  {
    pattern:
      /^(?:guest\s+count\s+trend|are\s+(?:my\s+)?events?\s+getting\s+(?:bigger|larger|smaller)|average\s+party\s+size|how\s+big\s+are\s+my\s+events?)/i,
    answer: (ctx) => {
      if (!ctx.guestCountTrend) return null
      const gt = ctx.guestCountTrend
      const trend =
        gt.direction === 'up'
          ? 'Trending up - your events are getting bigger! 📈'
          : gt.direction === 'down'
            ? 'Trending down - smaller, more intimate events lately.'
            : 'Holding steady - consistent event sizes.'
      return {
        text: `**Guest count trend:**\n\n- Recent average: **${gt.recentAvg} guests**\n- Previous average: ${gt.previousAvg} guests\n\n${trend}`,
      }
    },
  },
  // "Menu approval stats" / "How fast do clients approve menus?"
  {
    pattern:
      /^(?:menu\s+approval\s+(?:stats?|time|speed)|how\s+(?:fast|long|quickly)\s+(?:do\s+)?clients?\s+approve\s+menus?)/i,
    answer: (ctx) => {
      if (!ctx.menuApprovalStats) return null
      const ma = ctx.menuApprovalStats
      return {
        text: `**Menu approval turnaround:**\n\n- Average: **${ma.avgDays} days**\n- Median: ${ma.medianDays} days\n- Fastest: ${ma.fastestDays} days\n- Slowest: ${ma.slowestDays} days\n\n${ma.avgDays <= 3 ? 'Quick turnaround - clients trust your menus. 🍽️' : 'Consider a follow-up at the 3-day mark to speed things up.'}`,
      }
    },
  },
  // "What dietary restrictions come up most?"
  {
    pattern:
      /^(?:(?:common|top|frequent)\s+(?:dietary|allergy|allergies)|what\s+(?:dietary|allergies?)\s+come\s+up\s+(?:most|often)|dietary\s+(?:profile|stats?|breakdown))/i,
    answer: (ctx) => {
      if (!ctx.dietaryProfile) return null
      const dp = ctx.dietaryProfile
      const lines = ['**Most common dietary needs across your clients:**\n']
      if (dp.topDietary.length > 0) {
        lines.push('*Dietary restrictions:*')
        for (const d of dp.topDietary.slice(0, 5)) {
          lines.push(`- ${d.name}: ${d.count} client${d.count !== 1 ? 's' : ''}`)
        }
      }
      if (dp.topAllergies.length > 0) {
        lines.push('\n*Allergies:*')
        for (const a of dp.topAllergies.slice(0, 5)) {
          lines.push(`- ${a.name}: ${a.count} client${a.count !== 1 ? 's' : ''}`)
        }
      }
      return { text: lines.join('\n') }
    },
  },
  // "How many documents do I have?"
  {
    pattern:
      /^(?:how\s+many\s+documents?|document\s+(?:count|stats?)|my\s+documents?|files?\s+(?:count|stats?))/i,
    answer: (ctx) => {
      if (!ctx.documentSummary) return null
      const ds = ctx.documentSummary
      return {
        text: `You have **${ds.totalDocuments} document${ds.totalDocuments !== 1 ? 's' : ''}** across **${ds.totalFolders} folder${ds.totalFolders !== 1 ? 's' : ''}**.`,
        navSuggestions: [{ label: 'Documents', href: '/documents' }],
      }
    },
  },
  // "What's in my recipe book?" / "Recipe stats"
  {
    pattern:
      /^(?:what'?s?\s+in\s+my\s+recipe\s+book|recipe\s+(?:stats?|count|library)|how\s+many\s+recipes?\s+(?:do\s+i\s+)?have)/i,
    answer: (ctx) => {
      if (!ctx.recipeStats) return null
      const rs = ctx.recipeStats
      const cats = rs.categories.length > 0 ? `\n\nCategories: ${rs.categories.join(', ')}` : ''
      return {
        text: `You have **${rs.totalRecipes} recipe${rs.totalRecipes !== 1 ? 's' : ''}** in your book.${cats}`,
        navSuggestions: [{ label: 'Recipes', href: '/recipes' }],
      }
    },
  },
  // "What referral sources work best?"
  {
    pattern:
      /^(?:(?:what|which)\s+referral\s+sources?|where\s+(?:do\s+)?(?:my\s+)?clients?\s+come\s+from|how\s+(?:are\s+)?(?:people|clients?)\s+finding\s+me|referral\s+(?:breakdown|stats?|sources?))/i,
    answer: (ctx) => {
      if (!ctx.referralSources || ctx.referralSources.length === 0) return null
      const lines = ['**Where your clients come from:**\n']
      for (const r of ctx.referralSources) {
        lines.push(`- **${r.source}**: ${r.count} client${r.count !== 1 ? 's' : ''} (${r.pct}%)`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "My business name" / "What's my tagline?"
  {
    pattern:
      /^(?:what'?s?\s+my\s+(?:business\s+name|tagline|brand)|my\s+business\s+(?:name|info)|business\s+(?:details|info))/i,
    answer: (ctx) => ({
      text: `**Business:** ${ctx.businessName ?? 'Not set'}\n**Tagline:** ${ctx.tagline ?? 'Not set'}\n\nYou can update these in Settings.`,
      navSuggestions: [{ label: 'Settings', href: '/settings' }],
    }),
  },
  // "What's my cost per guest?" / "Average cost per head"
  {
    pattern:
      /^(?:(?:what'?s?\s+)?(?:my\s+)?(?:cost|price)\s+per\s+(?:guest|head|person|plate)|average\s+(?:cost|price)\s+per\s+(?:guest|head))/i,
    answer: (ctx) => {
      if (!ctx.yearlyStats || !ctx.yearlyStats.totalEventsThisYear) return null
      // Rough estimate from avg revenue per event if we have guest count trend
      const avgRevPerEvent = ctx.yearlyStats.avgEventRevenueCents
      const avgGuests = ctx.guestCountTrend?.recentAvg ?? 0
      if (avgGuests === 0) return null
      const costPerGuest = Math.round(avgRevPerEvent / avgGuests)
      const formatted = (costPerGuest / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      return {
        text: `**Average revenue per guest: ${formatted}**\n\nBased on ${ctx.yearlyStats.totalEventsThisYear} events with ~${avgGuests} avg guests each.\n\n${costPerGuest >= 15000 ? 'Premium pricing - you command top rates. 🔥' : costPerGuest >= 7500 ? 'Solid mid-range pricing.' : 'Room to adjust your per-head pricing up.'}`,
      }
    },
  },
  // "Blocked dates" / "When am I unavailable?"
  {
    pattern:
      /^(?:blocked\s+dates?|when\s+am\s+i\s+(?:un)?available|my\s+(?:blocked|unavailable)\s+(?:dates?|days?)|(?:show|list)\s+(?:my\s+)?blocked\s+dates?)/i,
    answer: (ctx) => {
      if (!ctx.calendarSummary?.blockedDates || ctx.calendarSummary.blockedDates.length === 0) {
        return {
          text: "No blocked dates on your calendar. You're wide open! 📅",
          navSuggestions: [{ label: 'Calendar', href: '/calendar' }],
        }
      }
      const lines = [
        `**${ctx.calendarSummary.blockedDates.length} blocked date${ctx.calendarSummary.blockedDates.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const b of ctx.calendarSummary.blockedDates.slice(0, 10)) {
        const d = new Date(b.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        lines.push(`- **${d}** - ${b.reason} (${b.type})`)
      }
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Calendar', href: '/calendar' }] }
    },
  },
  // "Waitlist" / "Anyone on the waitlist?"
  {
    pattern:
      /^(?:(?:show|list|any)\s+(?:my\s+)?waitlist|waitlist\s+(?:entries|status)|who'?s?\s+on\s+(?:the\s+)?waitlist)/i,
    answer: (ctx) => {
      if (
        !ctx.calendarSummary?.waitlistEntries ||
        ctx.calendarSummary.waitlistEntries.length === 0
      ) {
        return { text: 'No one on the waitlist right now.' }
      }
      const lines = [
        `**${ctx.calendarSummary.waitlistEntries.length} waitlist ${ctx.calendarSummary.waitlistEntries.length !== 1 ? 'entries' : 'entry'}:**\n`,
      ]
      for (const w of ctx.calendarSummary.waitlistEntries) {
        const d = new Date(w.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        lines.push(`- **${w.clientName}** - ${w.occasion} on ${d} (${w.status})`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "Recent artifacts" / "What has Remy created?"
  {
    pattern:
      /^(?:recent\s+artifacts?|what\s+(?:have\s+you|has\s+remy)\s+(?:created|generated|made)|(?:show|list)\s+(?:my\s+)?artifacts?)/i,
    answer: (ctx) => {
      if (!ctx.recentArtifacts || ctx.recentArtifacts.length === 0) {
        return {
          text: "I haven't created any artifacts yet this session. Ask me to draft something - a bio, contract, or message - and it'll show up here.",
        }
      }
      const lines = [`**Recent artifacts:**\n`]
      for (const a of ctx.recentArtifacts) {
        const date = new Date(a.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        lines.push(`- **${a.title}** (${a.type}) - ${date}`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "How many staff do I have?" / "Staff roster"
  {
    pattern:
      /^(?:(?:how\s+many\s+)?staff|(?:show|list)\s+(?:my\s+)?(?:staff|team|crew)|staff\s+(?:roster|list|count)|my\s+team)/i,
    answer: (ctx) => {
      if (!ctx.staffRoster || ctx.staffRoster.length === 0) {
        return {
          text: 'No staff members in your roster yet. Add your team in the Staff section.',
          navSuggestions: [{ label: 'Staff', href: '/staff' }],
        }
      }
      const lines = [
        `**${ctx.staffRoster.length} team member${ctx.staffRoster.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const s of ctx.staffRoster) {
        lines.push(
          `- **${s.name}** - ${s.role}${s.activeAssignments > 0 ? ` (${s.activeAssignments} active)` : ''}`
        )
      }
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Staff', href: '/staff' }] }
    },
  },
  // "Equipment" / "What equipment do I have?"
  {
    pattern:
      /^(?:(?:what|show|list)\s+(?:my\s+)?equipment|equipment\s+(?:list|inventory|count|summary)|my\s+(?:kitchen\s+)?equipment)/i,
    answer: (ctx) => {
      if (!ctx.equipmentSummary) return null
      const es = ctx.equipmentSummary
      const cats = es.categories.length > 0 ? `\n\nCategories: ${es.categories.join(', ')}` : ''
      return {
        text: `You have **${es.totalItems} piece${es.totalItems !== 1 ? 's' : ''} of equipment** tracked.${cats}`,
        navSuggestions: [{ label: 'Equipment', href: '/operations/equipment' }],
      }
    },
  },
  // "My goals" / "Active goals"
  {
    pattern:
      /^(?:(?:what\s+are\s+)?my\s+goals?|active\s+goals?|(?:show|list)\s+(?:my\s+)?goals?|goal\s+progress)/i,
    answer: (ctx) => {
      if (!ctx.activeGoals || ctx.activeGoals.length === 0) {
        return {
          text: 'No active goals set. Head to Goals to create one - having a target changes everything.',
          navSuggestions: [{ label: 'Goals', href: '/goals' }],
        }
      }
      const lines = [
        `**${ctx.activeGoals.length} active goal${ctx.activeGoals.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const g of ctx.activeGoals) {
        const progress = g.progress !== null ? ` (${g.progress}%)` : ''
        const target = g.targetDate
          ? ` - due ${new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : ''
        lines.push(`- **${g.title}**${progress}${target}`)
      }
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Goals', href: '/goals' }] }
    },
  },
  // "My todos" / "What's on my task list?"
  {
    pattern:
      /^(?:(?:what'?s?\s+on\s+)?my\s+(?:todo|task)\s*(?:list)?|(?:show|list)\s+(?:my\s+)?(?:todos?|tasks?)|pending\s+(?:todos?|tasks?)|what\s+(?:do\s+i\s+)?need\s+to\s+do)/i,
    answer: (ctx) => {
      if (!ctx.activeTodos || ctx.activeTodos.length === 0) {
        return { text: 'No pending tasks. Enjoy the clean slate! ✨' }
      }
      const lines = [
        `**${ctx.activeTodos.length} pending task${ctx.activeTodos.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const t of ctx.activeTodos.slice(0, 8)) {
        const due = t.dueDate
          ? ` - due ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : ''
        const pri = t.priority === 'high' ? ' ⚡' : t.priority === 'urgent' ? ' 🔴' : ''
        lines.push(`- ${t.title}${pri}${due}`)
      }
      if (ctx.activeTodos.length > 8) {
        lines.push(`\n_...and ${ctx.activeTodos.length - 8} more._`)
      }
      return { text: lines.join('\n') }
    },
  },
  // "Stale inquiries" / "Which leads are going cold?"
  {
    pattern:
      /^(?:stale\s+inquiries?|(?:which|what)\s+leads?\s+(?:are\s+)?(?:going\s+)?cold|unanswered\s+(?:inquiries?|leads?)|leads?\s+(?:going|getting)\s+cold)/i,
    answer: (ctx) => {
      if (!ctx.staleInquiries || ctx.staleInquiries.length === 0) {
        return {
          text: "No stale inquiries - you're responding promptly. ✅",
          navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
        }
      }
      const lines = [`**${ctx.staleInquiries.length} inquiries going cold:**\n`]
      for (const i of ctx.staleInquiries) {
        const score = i.leadScore >= 60 ? ' 🔥 hot lead' : i.leadScore >= 30 ? ' warm lead' : ''
        lines.push(`- **${i.leadName}** - ${i.daysSinceContact}d without response${score}`)
      }
      lines.push('\nRespond to the hottest leads first!')
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
      }
    },
  },
  // "Overdue payments" / "Who owes me money?"
  {
    pattern:
      /^(?:overdue\s+payments?|who\s+owes\s+me|outstanding\s+payments?|unpaid\s+invoices?|late\s+payments?)/i,
    answer: (ctx) => {
      if (!ctx.overduePayments || ctx.overduePayments.length === 0) {
        return {
          text: 'No overdue payments. Everyone has paid up! 💸',
          navSuggestions: [{ label: 'Finance', href: '/finance' }],
        }
      }
      const lines = [
        `**${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''}:**\n`,
      ]
      let totalOverdue = 0
      for (const p of ctx.overduePayments) {
        const amt = (p.amountCents / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
        totalOverdue += p.amountCents
        lines.push(`- **${p.clientName}** - ${amt} (${p.daysOverdue}d overdue)`)
      }
      const total = (totalOverdue / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
      lines.push(`\n**Total outstanding: ${total}**`)
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Finance', href: '/finance' }],
      }
    },
  },
  // "Client vibe notes" / "What do I know about my clients?"
  {
    pattern:
      /^(?:client\s+vibe\s+notes?|(?:what\s+)?(?:do\s+i\s+)?know\s+about\s+my\s+clients?|client\s+(?:notes?|preferences?|likes?))/i,
    answer: (ctx) => {
      if (!ctx.clientVibeNotes || ctx.clientVibeNotes.length === 0) {
        return {
          text: 'No client vibe notes recorded yet. Add notes from the client profile - the more you know, the better you cook.',
        }
      }
      const lines = [
        `**Client notes for ${ctx.clientVibeNotes.length} client${ctx.clientVibeNotes.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const c of ctx.clientVibeNotes.slice(0, 5)) {
        lines.push(`**${c.name}:**`)
        if (c.vibeNotes) lines.push(`- Notes: ${c.vibeNotes}`)
        if (c.dietaryRestrictions.length > 0)
          lines.push(`- Dietary: ${c.dietaryRestrictions.join(', ')}`)
        if (c.allergies.length > 0) lines.push(`- Allergies: ⚠️ ${c.allergies.join(', ')}`)
        lines.push('')
      }
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Clients', href: '/clients' }] }
    },
  },
  // "Prep checklist" / "What events need prep?"
  {
    pattern:
      /^(?:prep\s+(?:checklist|status|check)|(?:what|which)\s+events?\s+need\s+prep|unprepared\s+events?|events?\s+(?:not\s+)?(?:prepped|prepared))/i,
    answer: (ctx) => {
      const unprepped = (ctx.upcomingEvents ?? []).filter((e) => !e.prepReady)
      if (unprepped.length === 0) {
        return { text: 'All upcoming events have their prep lists ready. Nice work, chef! ✅' }
      }
      const lines = [
        `**${unprepped.length} event${unprepped.length !== 1 ? 's' : ''} still need prep:**\n`,
      ]
      for (const e of unprepped.slice(0, 5)) {
        const missing: string[] = []
        if (!e.prepReady) missing.push('prep list')
        if (!e.groceryReady) missing.push('grocery list')
        if (!e.timelineReady) missing.push('timeline')
        const date = e.date
          ? new Date(e.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : 'TBD'
        lines.push(
          `- **${e.occasion ?? 'Event'}** for ${e.clientName} (${date}) - needs: ${missing.join(', ')}`
        )
      }
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Events', href: '/events' }] }
    },
  },
  // "Today's plan" / "What should I focus on today?"
  {
    pattern:
      /^(?:today'?s?\s+(?:plan|focus|priorities?)|what\s+should\s+i\s+(?:focus\s+on|do)\s+today|daily\s+priorities?|what'?s?\s+the\s+plan)/i,
    answer: (ctx) => {
      const clock = getChefClock({ chefTimezone: ctx.chefTimezone })
      const todayEvents = (ctx.upcomingEvents ?? []).filter(
        (e) => e.date && isSameChefDate(e.date, clock)
      )
      const lines: string[] = []
      if (todayEvents.length > 0) {
        lines.push(`**${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today:**\n`)
        for (const e of todayEvents) {
          lines.push(
            `- ${e.occasion ?? 'Event'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status})`
          )
        }
        lines.push('')
      }
      if (ctx.dailyPlan) {
        const dp = ctx.dailyPlan
        lines.push(`**Daily plan:** ${dp.totalItems} items (~${dp.estimatedMinutes} min)\n`)
        if (dp.prepItems > 0) lines.push(`- Prep: ${dp.prepItems} items`)
        if (dp.adminItems > 0) lines.push(`- Admin: ${dp.adminItems} items`)
        if (dp.creativeItems > 0) lines.push(`- Creative: ${dp.creativeItems} items`)
        if (dp.relationshipItems > 0) lines.push(`- Relationships: ${dp.relationshipItems} items`)
        lines.push('')
      }
      if (ctx.upcomingCalls && ctx.upcomingCalls.length > 0) {
        const todayCalls = ctx.upcomingCalls.filter((c) => isSameChefDate(c.scheduledAt, clock))
        if (todayCalls.length > 0) {
          lines.push(`**${todayCalls.length} call${todayCalls.length !== 1 ? 's' : ''} today:**`)
          for (const c of todayCalls) {
            const time = new Date(c.scheduledAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })
            lines.push(`- ${c.clientName} at ${time}`)
          }
        }
      }
      if (lines.length === 0) {
        return {
          text: 'Clear day ahead. No events, no scheduled calls. Good time for planning, outreach, or recipe development. ☀️',
        }
      }
      return { text: lines.join('\n') }
    },
  },
  // "Pending quotes" / "How many quotes are pending?"
  {
    pattern:
      /^(?:(?:how\s+many\s+)?pending\s+quotes?|quotes?\s+(?:pending|awaiting|outstanding)|open\s+quotes?)/i,
    answer: (ctx) => ({
      text:
        (ctx.pendingQuoteCount ?? 0) === 0
          ? 'No pending quotes right now.'
          : `You have **${ctx.pendingQuoteCount} pending quote${ctx.pendingQuoteCount !== 1 ? 's' : ''}** awaiting client response.`,
      navSuggestions: [{ label: 'Events', href: '/events' }],
    }),
  },
  // "Cost per guest trend" (different from "cost per guest" - uses expense data)
  {
    pattern:
      /^(?:(?:where\s+(?:is|does)\s+my\s+money\s+go|expense\s+(?:categories|distribution)|spending\s+breakdown))/i,
    answer: (ctx) => {
      if (!ctx.expenseBreakdown || ctx.expenseBreakdown.length === 0) return null
      const lines = ['**Expense breakdown by category:**\n']
      for (const e of ctx.expenseBreakdown) {
        const amt = (e.totalCents / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })
        lines.push(`- **${e.category}**: ${amt}`)
      }
      return { text: lines.join('\n'), navSuggestions: [{ label: 'Expenses', href: '/expenses' }] }
    },
  },
  // "Unread messages" / "Any new messages?"
  {
    pattern: /^(?:(?:any\s+)?(?:unread|new)\s+messages?|unread\s+(?:inbox|leads?)|new\s+leads?)/i,
    answer: (ctx) => {
      const unread = ctx.unreadInquiryMessages ?? []
      if (unread.length === 0) {
        return { text: 'No unread messages from leads. Inbox is clear! 📬' }
      }
      const lines = [`**${unread.length} unread message${unread.length !== 1 ? 's' : ''}:**\n`]
      for (const m of unread) {
        lines.push(`- From **${m.leadName}**`)
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
      }
    },
  },
  // "Pending menu approvals" / "Who hasn't approved their menu?"
  {
    pattern:
      /^(?:pending\s+menu\s+approvals?|who\s+hasn'?t\s+approved\s+(?:their\s+)?menu|menu\s+(?:approvals?\s+)?pending|awaiting\s+menu\s+approval)/i,
    answer: (ctx) => {
      const pending = ctx.pendingMenuApprovals ?? []
      if (pending.length === 0) {
        return { text: 'All menus approved! No one pending. ✅' }
      }
      const lines = [
        `**${pending.length} menu${pending.length !== 1 ? 's' : ''} awaiting approval:**\n`,
      ]
      for (const m of pending) {
        lines.push(`- **${m.clientName}**`)
      }
      lines.push('\nConsider a gentle follow-up if any have been waiting more than 3 days.')
      return { text: lines.join('\n') }
    },
  },
  // "Repeat clients" / "How many repeat clients?"
  {
    pattern:
      /^(?:(?:how\s+many\s+)?repeat\s+clients?|client\s+retention|returning\s+clients?|loyal\s+clients?)/i,
    answer: (ctx) => {
      if (!ctx.repeatClientRatio) return null
      const rc = ctx.repeatClientRatio
      return {
        text: `**${rc.repeatClients}** of your **${rc.totalClients}** clients are repeat bookers (**${rc.ratio}%**).\n\n${rc.ratio >= 40 ? 'Excellent retention - your clients love you. Keep nurturing those relationships. 💛' : rc.ratio >= 20 ? "Solid foundation of repeats. Focus on re-engagement for clients who've gone quiet." : 'Low repeat rate - consider a post-event follow-up sequence to bring clients back.'}`,
        navSuggestions: [
          { label: 'Clients', href: '/clients' },
          { label: 'Loyalty', href: '/loyalty' },
        ],
      }
    },
  },

  // ─── Food Costing Knowledge (deterministic, from canonical guide) ────────
  // "What is food cost percentage?" / "How do I calculate food cost?"
  {
    pattern:
      /^(?:what(?:'s|\s+is)\s+(?:a\s+)?food\s+cost\s*%?|how\s+(?:do\s+i|to)\s+calculate\s+food\s+cost|explain\s+food\s+cost)/i,
    answer: () => ({
      text: `**Food Cost Percentage** is the portion of your selling price consumed by ingredient costs.\n\n**Formula:** Food Cost % = (Total Ingredient Cost / Selling Price) x 100\n\n**Target range:** 25-35% for most operations. Above 45% is a warning; above 50% is critical.\n\nIf your food cost is above target, check yield factors, portion sizes, and ingredient prices first. Menu engineering (subsidizing high-cost items with low-cost ones) can bring the blend into range.`,
      navSuggestions: [
        { label: 'Food Costing Guide', href: '/help/food-costing' },
        { label: 'Costing Dashboard', href: '/culinary/costing' },
      ],
    }),
  },
  // "What is Q-factor?" / "What's the Q factor?"
  {
    pattern: /^(?:what(?:'s|\s+is)\s+(?:the\s+)?q[\s-]?factor|explain\s+q[\s-]?factor)/i,
    answer: () => ({
      text: `**Q-Factor** is a percentage added to your recipe cost to cover small incidental ingredients you don't individually track: cooking oil, salt, pepper, butter for pans, garnish herbs, and so on.\n\n**Formula:** Adjusted Cost = Direct Ingredient Cost x (1 + Q-Factor %)\n\n**Default:** 7%. Recommended range: 5-8% for most kitchens.\n\nWithout Q-factor, your food cost is systematically undercounted. Set to 0% only if you track every single ingredient including oil and seasoning.`,
      navSuggestions: [
        { label: 'Food Costing Guide', href: '/help/food-costing' },
        { label: 'Pricing Settings', href: '/settings/pricing' },
      ],
    }),
  },
  // "What is yield factor?" / "What's AP vs EP?" / "What's as purchased vs edible portion?"
  {
    pattern:
      /^(?:what(?:'s|\s+is)\s+(?:a\s+)?(?:yield\s+factor|AP\s+vs\s+EP|as\s+purchased|edible\s+portion)|explain\s+yield)/i,
    answer: () => ({
      text: `**Yield Factor** is the ratio of usable product (Edible Portion) to purchased product (As Purchased).\n\n**Formula:** EP Cost = AP Cost / Yield Factor\n\nA yield of 0.65 means 35% waste. A $4/lb chicken breast with 0.72 yield actually costs $5.56/lb of usable meat.\n\n**Key rules:**\n- Trim yield is always <= 1.0\n- Cooking yield CAN exceed 1.0 (rice, pasta, beans absorb water)\n- Combined yield = trim yield x cooking yield\n\nAlways cost recipes using EP cost, not AP cost. Costing against AP weight systematically undercounts your true cost.`,
      navSuggestions: [{ label: 'Food Costing Guide', href: '/help/food-costing' }],
    }),
  },
  // "What is prime cost?" / "What's prime cost?"
  {
    pattern: /^(?:what(?:'s|\s+is)\s+(?:a\s+)?prime\s+cost|explain\s+prime\s+cost)/i,
    answer: () => ({
      text: `**Prime Cost** is food cost plus labor cost as a percentage of revenue. It's the single most important profitability metric in food service.\n\n**Formula:** Prime Cost % = (Food Cost + Labor Cost) / Revenue x 100\n\n**Target:** 55-65% of revenue. Above 65% means you're likely losing money. Above 75% is a red flag.\n\nPrime cost matters more than food cost alone because it captures your two biggest variable expenses together.`,
      navSuggestions: [{ label: 'Food Costing Guide', href: '/help/food-costing' }],
    }),
  },
  // "What is cost plus?" / "How does cost plus work?"
  {
    pattern:
      /^(?:what(?:'s|\s+is)\s+(?:the\s+)?cost[\s-]?plus|how\s+does\s+cost[\s-]?plus\s+work|explain\s+cost[\s-]?plus)/i,
    answer: () => ({
      text: `**Cost-Plus Pricing** builds your price from the bottom up: food cost + labor + overhead + incidentals + markup.\n\n**Formula:** Price = (Food + Labor + Overhead + Incidentals) x (1 + Markup %)\n\n**When to use it:** Catering, private chef events, and any job where labor and overhead vary significantly between jobs.\n\n**Typical markup:** 15-25% after all costs are covered.\n\nCost-plus ensures every cost is accounted for before adding markup. Food cost percentage (Method 1) works backward from a revenue target instead.`,
      navSuggestions: [
        { label: 'Food Costing Guide', href: '/help/food-costing' },
        { label: 'Costing Dashboard', href: '/culinary/costing' },
      ],
    }),
  },
  // "What is contribution margin?" / "Explain contribution margin"
  {
    pattern:
      /^(?:what(?:'s|\s+is)\s+(?:a\s+)?contribution\s+margin|explain\s+contribution\s+margin)/i,
    answer: () => ({
      text: `**Contribution Margin** is the dollar amount left after subtracting food cost from selling price.\n\n**Formula:** Contribution Margin = Selling Price - Food Cost\n\nA $50 steak at 40% food cost contributes **$30**. A $15 pasta at 25% food cost contributes **$11.25**.\n\nThe steak has worse food cost % but nearly 3x the contribution margin. That's why contribution margin and food cost % should always be viewed together.`,
      navSuggestions: [{ label: 'Food Costing Guide', href: '/help/food-costing' }],
    }),
  },
]

/**
 * Try to answer a question deterministically from loaded context.
 * Returns an InstantAnswer if the question can be answered without Ollama,
 * or null if Ollama is needed.
 *
 * This function runs AFTER context is loaded but BEFORE the Ollama call.
 * It only handles simple factual questions - anything requiring analysis,
 * judgment, or multi-step reasoning still goes to the LLM.
 */
// ─── Contextual Follow-Up Intelligence ──────────────────────────────────────
// After answering a factual question, Remy proactively suggests the most
// relevant next action based on the chef's current state. This turns every
// instant answer into a mini-consultation - one nugget, max, to avoid noise.

function buildContextualFollowUp(ctx: RemyContext, answeredTopic: string): string | null {
  // Don't suggest follow-ups for greetings/thanks - those already have proactive context
  if (answeredTopic === 'greeting' || answeredTopic === 'thanks') return null

  // Priority 1: Urgent items the chef might not know about
  if (answeredTopic !== 'payments' && ctx.overduePayments && ctx.overduePayments.length > 0) {
    return `\n\n💡 *Heads up:* ${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''} need attention - ask me "payment deadlines" for details.`
  }

  if (
    answeredTopic !== 'inquiries' &&
    ctx.staleInquiries &&
    ctx.staleInquiries.some((i) => i.leadScore >= 60)
  ) {
    const hot = ctx.staleInquiries.filter((i) => i.leadScore >= 60)
    return `\n\n💡 *Quick note:* ${hot.length} high-value lead${hot.length !== 1 ? 's' : ''} going cold - ask me about stale inquiries.`
  }

  // Priority 2: Contextual nudges based on what they asked about
  if (answeredTopic === 'revenue' && ctx.conversionRate && ctx.conversionRate.rate < 25) {
    return `\n\n💡 *Tip:* Your conversion rate is ${ctx.conversionRate.rate}% - faster follow-ups on new inquiries could boost revenue.`
  }

  if (answeredTopic === 'clients' && ctx.clientReengagement && ctx.clientReengagement.length > 0) {
    return `\n\n💡 *Tip:* ${ctx.clientReengagement.length} client${ctx.clientReengagement.length !== 1 ? 's are' : ' is'} overdue for a booking - ask me "who should I re-engage?"`
  }

  if (answeredTopic === 'events' && ctx.expiringQuotes && ctx.expiringQuotes.length > 0) {
    return `\n\n💡 *Tip:* ${ctx.expiringQuotes.length} quote${ctx.expiringQuotes.length !== 1 ? 's are' : ' is'} expiring soon - follow up before they lapse.`
  }

  if (answeredTopic === 'schedule' && ctx.upcomingCalls && ctx.upcomingCalls.length > 0) {
    const nextCall = ctx.upcomingCalls[0]
    return `\n\n💡 *Also:* You have a call with ${nextCall.clientName} coming up - ask me "upcoming calls" for the full list.`
  }

  return null
}

// Map patterns to topic names for follow-up intelligence
function getAnswerTopic(pattern: RegExp): string {
  const src = pattern.source
  if (/client/.test(src) && /many|count/.test(src)) return 'clients'
  if (/event/.test(src) && /many|upcoming/.test(src)) return 'events'
  if (/inquir/.test(src)) return 'inquiries'
  if (/revenue|made/.test(src)) return 'revenue'
  if (/schedule|week|plate/.test(src)) return 'schedule'
  if (/conversion|close/.test(src)) return 'conversion'
  if (/margin/.test(src)) return 'margins'
  if (/top.*client|best.*client/.test(src)) return 'clients'
  if (/weather/.test(src)) return 'smalltalk'
  if (/can.*you.*do|help|capabilit/.test(src)) return 'help'
  if (/morning|afternoon|evening|hey|hi|hello/.test(src)) return 'greeting'
  if (/thanks|thank|thx|cheers|awesome/.test(src)) return 'thanks'
  if (/busiest/.test(src)) return 'schedule'
  if (/expense|money.*going/.test(src)) return 'expenses'
  if (/referral|finding/.test(src)) return 'referrals'
  if (/guest.*count/.test(src)) return 'events'
  if (/lead.*time|far.*ahead/.test(src)) return 'booking'
  if (/staff|team|crew/.test(src)) return 'staff'
  if (/recipe/.test(src)) return 'recipes'
  if (/goal/.test(src)) return 'goals'
  if (/todo|task/.test(src)) return 'todos'
  if (/payment/.test(src)) return 'payments'
  if (/quote.*expir/.test(src)) return 'quotes'
  if (/equipment/.test(src)) return 'equipment'
  if (/re-?engage|dormant|inactive/.test(src)) return 'reengagement'
  if (/document|docs|files/.test(src)) return 'documents'
  if (/dietary|allergy/.test(src)) return 'dietary'
  if (/service.*style/.test(src)) return 'servicestyles'
  if (/call/.test(src)) return 'calls'
  if (/ytd|year/.test(src)) return 'revenue'
  if (/cash.*flow|expected.*income/.test(src)) return 'cashflow'
  if (/repeat.*client|retention|loyal/.test(src)) return 'clients'
  if (/workload|overbooked|busy.*am/.test(src)) return 'schedule'
  if (/re-?engage|dormant|inactive|gone.*quiet/.test(src)) return 'reengagement'
  if (/expir.*quot/.test(src)) return 'quotes'
  if (/payment.*deadline|due/.test(src)) return 'payments'
  if (/inquiry.*velocity|trend|lead.*flow/.test(src)) return 'inquiries'
  if (/channel/.test(src)) return 'conversion'
  if (/profitable|profitability/.test(src)) return 'revenue'
  if (/day\s+of.*week|which\s+day/.test(src)) return 'schedule'
  if (/guest.*count.*trend|getting.*bigger/.test(src)) return 'events'
  if (/menu.*approval.*stat|fast.*approve/.test(src)) return 'menus'
  if (/common.*dietary|dietary.*profile|allerg.*come.*up/.test(src)) return 'dietary'
  if (/document.*count|how.*many.*doc|files.*count/.test(src)) return 'documents'
  if (/recipe.*book|recipe.*stat|how.*many.*recipe/.test(src)) return 'recipes'
  if (/referral.*source|where.*clients.*come|finding.*me/.test(src)) return 'referrals'
  if (/business.*name|tagline|brand/.test(src)) return 'general'
  if (/cost.*per.*guest|price.*per.*head/.test(src)) return 'revenue'
  if (/blocked.*date|unavailable/.test(src)) return 'schedule'
  if (/waitlist/.test(src)) return 'schedule'
  if (/artifact/.test(src)) return 'general'
  if (/staff.*roster|team|crew|how.*many.*staff/.test(src)) return 'staff'
  if (/equipment.*list|equipment.*inventory/.test(src)) return 'equipment'
  if (/goals?.*progress|active.*goal|my.*goal/.test(src)) return 'goals'
  if (/todo.*list|task.*list|need.*to.*do/.test(src)) return 'todos'
  if (/stale.*inquir|leads?.*cold|unanswered/.test(src)) return 'inquiries'
  if (/overdue.*payment|owes.*me|unpaid|late.*payment/.test(src)) return 'payments'
  if (/vibe.*note|know.*about.*client|client.*note/.test(src)) return 'clients'
  if (/prep.*check|need.*prep|unprepared/.test(src)) return 'events'
  if (/today.*plan|focus.*today|daily.*prior/.test(src)) return 'todos'
  if (/pending.*quot|open.*quot/.test(src)) return 'quotes'
  if (/spending.*breakdown|expense.*categor/.test(src)) return 'expenses'
  if (/unread.*message|new.*message|new.*lead/.test(src)) return 'inquiries'
  if (/pending.*menu|hasn.*approved.*menu|awaiting.*menu/.test(src)) return 'menus'
  if (/next\s+event|next\s+gig/.test(src)) return 'events'
  if (/pending.*quot|quot.*pending/.test(src)) return 'quotes'
  if (/quot.*range|quot.*distribution|usually.*quot/.test(src)) return 'quotes'
  if (/new.*message|new.*lead|unread|inbox/.test(src)) return 'inquiries'
  if (/daily.*plan|today.*plan|should.*do.*today/.test(src)) return 'todos'
  if (/recent.*email|email.*summary|email.*digest/.test(src)) return 'emails'
  if (/menu.*approval|pending.*menu/.test(src)) return 'menus'
  if (/seasonal|revenue.*pattern|busy.*season|slow.*season/.test(src)) return 'revenue'
  if (/calendar.*month|blocked.*date|when.*free/.test(src)) return 'schedule'
  if (/lesson|AAR|after.*action|went.*wrong/.test(src)) return 'reviews'
  if (/business.*health|business.*summary|how.*business/.test(src)) return 'revenue'
  if (/recent.*activity|been.*happening/.test(src)) return 'general'
  if (
    /food\s+cost|q[\s-]?factor|yield\s+factor|prime\s+cost|cost[\s-]?plus|contribution\s+margin/.test(
      src
    )
  )
    return 'costing'
  return 'general'
}

/**
 * Try to answer a question deterministically from loaded context.
 * Returns an InstantAnswer if the question can be answered without Ollama,
 * or null if Ollama is needed.
 *
 * This function runs AFTER context is loaded but BEFORE the Ollama call.
 * It only handles simple factual questions - anything requiring analysis,
 * judgment, or multi-step reasoning still goes to the LLM.
 */
export function tryInstantAnswer(
  message: string,
  context: RemyContext,
  memories: RemyMemory[] = [],
  options: { allowSuggestions?: boolean; continuityDigest?: ContinuityDigest | null } = {}
): InstantAnswer | null {
  const trimmed = message.trim()
  const allowSuggestions = options.allowSuggestions !== false

  for (const { pattern, answer } of INSTANT_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      const result = answer(context, match, {
        message: trimmed,
        memories,
        continuityDigest: options.continuityDigest ?? null,
      })
      if (result) {
        const answerResult = allowSuggestions
          ? result
          : { text: result.text, navSuggestions: undefined }
        // Enrich with contextual follow-up intelligence
        const topic = getAnswerTopic(pattern)
        const followUp = allowSuggestions ? buildContextualFollowUp(context, topic) : null
        if (followUp) {
          return { ...answerResult, text: answerResult.text + followUp }
        }
        return answerResult
      }
    }
  }

  return null
}

function formatContinuityDigestAnswer(digest: ContinuityDigest): InstantAnswer {
  const sinceLabel = new Date(digest.cutoff).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  if (digest.activityCount === 0) {
    return {
      text: `Nothing changed in tracked ChefFlow activity since ${sinceLabel}.`,
      navSuggestions: [{ label: 'Open Activity', href: '/activity' }],
    }
  }

  const lines = [
    `**Changed since ${sinceLabel}:**`,
    '',
    ...digest.activities.map((activity) => {
      const when = new Date(activity.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      return `- ${activity.summary} (${when})`
    }),
  ]

  if (digest.activityCount > digest.activities.length) {
    lines.push('', `${digest.activityCount - digest.activities.length} more tracked update(s).`)
  }

  return {
    text: lines.join('\n'),
    navSuggestions: [{ label: 'Open Activity', href: '/activity' }],
  }
}
