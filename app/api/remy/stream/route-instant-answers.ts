// Remy — Deterministic Instant Answers (Formula > AI)
//
// For simple factual questions where the answer is already in the loaded context,
// this module returns an instant response WITHOUT calling Ollama at all.
// Saves 30-90 seconds per question. Zero cost, zero latency, always correct.
//
// The loaded RemyContext already has all the data — we just need to recognize
// the question pattern and format the answer in Remy's voice.

import type { RemyContext } from '@/lib/ai/remy-types'

interface InstantAnswer {
  text: string
  navSuggestions?: Array<{ label: string; href: string }>
}

interface AnswerPattern {
  pattern: RegExp
  answer: (ctx: RemyContext, match: RegExpMatchArray) => InstantAnswer | null
}

const INSTANT_PATTERNS: AnswerPattern[] = [
  // "How many clients do I have?"
  {
    pattern: /^how\s+many\s+clients?\s+(?:do\s+i\s+have|are\s+there|have\s+i\s+got)/i,
    answer: (ctx) => ({
      text:
        ctx.clientCount === 0
          ? "You don't have any clients yet. Let's fix that — head to Clients → New Client to add your first one. 🔥"
          : `You have **${ctx.clientCount} client${ctx.clientCount !== 1 ? 's' : ''}** in your book.${ctx.repeatClientRatio ? ` ${ctx.repeatClientRatio.ratio}% are repeat clients.` : ''} ${ctx.clientCount < 5 ? 'Still building — every great kitchen started with the first plate. 🍽️' : 'Solid roster, chef! 💪'}`,
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
          ? 'No open inquiries right now. Your pipeline is clear — great time for proactive outreach. 📬'
          : `You have **${ctx.openInquiryCount} open inquir${ctx.openInquiryCount !== 1 ? 'ies' : 'y'}** in the pipeline.${
              ctx.staleInquiries && ctx.staleInquiries.length > 0
                ? ` ⚠️ ${ctx.staleInquiries.length} need follow-up (${ctx.staleInquiries
                    .slice(0, 2)
                    .map((i) => `${i.leadName} — ${i.daysSinceContact}d`)
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
        if (pct > 120) pacing = ` You're **${pct}% of target** — ahead of pace! 🔥`
        else if (pct < 80 && pct > 0) pacing = ` That's **${pct}% of target** — a bit behind pace.`
      }
      let ytd = ''
      if (ctx.yearlyStats) {
        ytd = `\n\n**YTD:** ${(ctx.yearlyStats.yearRevenueCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} across ${ctx.yearlyStats.totalEventsThisYear} events.`
      }
      return {
        text: `**This month:** ${monthRev}${pacing}${ytd}`,
        navSuggestions: [{ label: 'Financials', href: '/financials' }],
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
          text: 'Nothing on the board right now. Light schedule — good time for menu development, client outreach, or recipe work. 🧑‍🍳',
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
        lines.push('No events this week — lighter schedule. 📋')
      } else if (thisWeek.length >= 3) {
        lines.push(`**${thisWeek.length} events this week** — full rail, chef! 🔥\n`)
      } else {
        lines.push(`**${thisWeek.length} event${thisWeek.length !== 1 ? 's' : ''} this week:**\n`)
      }
      for (const e of thisWeek.slice(0, 5)) {
        const day = e.date
          ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' })
          : '(TBD)'
        lines.push(
          `- **${day}** — ${e.occasion ?? 'Event'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.status})`
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
        text: `Your conversion rate is **${cr.rate}%** — ${cr.converted} of ${cr.total} inquiries became events.${channelInfo}${cr.rate >= 40 ? "\n\nThat's strong — above industry average. 🎯" : cr.rate >= 25 ? "\n\nDecent, but there's room to improve. Focus on faster follow-ups." : "\n\nThat's on the lower side — let's look at your follow-up speed and lead quality."}`,
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
        text: `**Average margin:** ${ps.avgMargin}% across ${ps.eventCount} events\n- Best: ${ps.bestMargin}%\n- Worst: ${ps.worstMargin}%\n- Avg profit/event: $${(ps.avgProfitCents / 100).toFixed(0)}\n\n${ps.avgMargin >= 55 ? "Strong margins — you're cooking with gas 🎯" : ps.avgMargin >= 40 ? 'Decent margins. Look for cost savings on your lower-margin events.' : "Margins are tight. Let's dig into your expense categories and find some savings."}`,
        navSuggestions: [{ label: 'Financials', href: '/financials' }],
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
          `- **${c.name}** — $${(c.revenueCents / 100).toLocaleString()} across ${c.eventCount} event${c.eventCount !== 1 ? 's' : ''}`
        )
      }
      return {
        text: lines.join('\n'),
        navSuggestions: [{ label: 'Clients', href: '/clients' }],
      }
    },
  },
  // "What's the weather?" / non-business small talk — redirect
  // (This is NOT in out-of-scope because it's conversational, not malicious)
  {
    pattern: /^what'?s?\s+the\s+weather/i,
    answer: () => ({
      text: "I'm more of a kitchen thermometer than a weather forecaster 😄 Check your phone for the weather — and let me know if you need anything on the business side!",
    }),
  },
  // "What can you do?" / "What are you capable of?" / "Help"
  {
    pattern: /^(?:what\s+can\s+you\s+do|help|what\s+are\s+(?:you|your)\s+capabilit)/i,
    answer: () => ({
      text: `Here's what I can help with, chef 🔪\n\n**Quick answers:** Client counts, revenue, margins, schedules, conversion rates — instant from your data\n**Drafts:** Thank-you notes, follow-ups, payment reminders, cover letters, re-engagement emails\n**Lookups:** Client search, dietary/allergy checks, recipe search, calendar availability\n**Analysis:** Break-even, cost optimization, client LTV, profitability\n**Ops:** Packing lists, prep timelines, portion scaling, cross-contamination checks\n**Memory:** "Remember that..." to teach me your preferences\n\nJust ask naturally — I'll figure out what you need. 🎯`,
    }),
  },
  // "Good morning" / "Hey" / greetings — warm but brief, with proactive context
  {
    pattern:
      /^(?:good\s+morning|good\s+afternoon|good\s+evening|morning|afternoon|evening|hey|hi|hello|yo|sup|what'?s?\s+up)\s*[!.?]?$/i,
    answer: (ctx) => {
      const hour = new Date().getHours()
      const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
      const lines: string[] = [`${greeting}, chef! 👨‍🍳`]

      // Proactive context — what's most relevant right now
      const nuggets: string[] = []
      if (ctx.upcomingEvents && ctx.upcomingEvents.length > 0) {
        const now = Date.now()
        const today = ctx.upcomingEvents.filter((e) => {
          if (!e.date) return false
          const dt = new Date(e.date)
          return dt.toDateString() === new Date().toDateString()
        })
        if (today.length > 0) {
          nuggets.push(
            `You've got **${today.length} event${today.length !== 1 ? 's' : ''} today** — game time 🔥`
          )
        } else {
          const next = ctx.upcomingEvents[0]
          if (next.date) {
            const daysUntil = Math.ceil(
              (new Date(next.date).getTime() - now) / (1000 * 60 * 60 * 24)
            )
            if (daysUntil <= 3) {
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
        text: `Recent average: **${gc.recentAvg} guests/event** (previous: ${gc.previousAvg}).\n\nTrend: **${gc.direction}** ${gc.direction === 'growing' ? '📈 Events are getting bigger — consider scaling your pricing and staffing accordingly.' : gc.direction === 'shrinking' ? '📉 Events are getting smaller — could mean more intimate bookings or a shift in clientele.' : '➡️ Stable guest counts.'}`,
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
        text: `Clients book an average of **${lt.avgDays} days ahead** (median: ${lt.medianDays}d).\n\nRange: ${lt.shortestDays}–${lt.longestDays} days.\n\nUse this for capacity planning — start marketing for slow periods at least ${lt.avgDays} days out.`,
      }
    },
  },
]

/**
 * Try to answer a question deterministically from loaded context.
 * Returns an InstantAnswer if the question can be answered without Ollama,
 * or null if Ollama is needed.
 *
 * This function runs AFTER context is loaded but BEFORE the Ollama call.
 * It only handles simple factual questions — anything requiring analysis,
 * judgment, or multi-step reasoning still goes to the LLM.
 */
export function tryInstantAnswer(message: string, context: RemyContext): InstantAnswer | null {
  const trimmed = message.trim()

  for (const { pattern, answer } of INSTANT_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      const result = answer(context, match)
      if (result) return result
    }
  }

  return null
}
