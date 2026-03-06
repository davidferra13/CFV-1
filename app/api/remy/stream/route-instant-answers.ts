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
  // "How many staff do I have?" / "Who's on my team?"
  {
    pattern:
      /^(?:how\s+many\s+staff|who'?s?\s+on\s+my\s+(?:team|staff|crew)|(?:show|list)\s+(?:my\s+)?staff|my\s+team)/i,
    answer: (ctx) => {
      if (!ctx.staffRoster || ctx.staffRoster.length === 0) {
        return {
          text: "No staff members on your roster yet. Head to Staff to add your first team member — even if it's just you. 🧑‍🍳",
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
          text: 'No active goals set. Having clear targets keeps you focused — head to Goals to set your first one. 🎯',
          navSuggestions: [{ label: 'Goals', href: '/goals' }],
        }
      }
      const lines = [
        `**${ctx.activeGoals.length} active goal${ctx.activeGoals.length !== 1 ? 's' : ''}:**\n`,
      ]
      for (const g of ctx.activeGoals) {
        const progress = g.progress != null ? ` — ${g.progress}%` : ''
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
          text: 'Your task list is clear — nothing pending. 🙌 Focus on what matters most today.',
        }
      }
      const today = new Date().toISOString().split('T')[0]
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
            `- ${p.clientName} — ${p.occasion}: $${(p.amountCents / 100).toLocaleString()} (${p.daysUntilDue === 0 ? 'today' : `in ${p.daysUntilDue}d`})`
          )
        }
      }
      if (items.length === 0) {
        return {
          text: 'No payment deadlines coming up — all clear on the money front. 💰',
          navSuggestions: [{ label: 'Financials', href: '/financials' }],
        }
      }
      return {
        text: items.join('\n'),
        navSuggestions: [{ label: 'Financials', href: '/financials' }],
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
          `- **${q.clientName}** — ${q.occasion}: $${(q.totalCents / 100).toLocaleString()} (expires ${q.daysUntilExpiry === 0 ? 'today ⚠️' : `in ${q.daysUntilExpiry}d`})`
        )
      }
      lines.push('\nFollow up before they expire — a quick nudge can close the deal. 🎯')
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
          text: "All your clients are within their normal booking patterns — no one's overdue for a touchpoint. 👍",
          navSuggestions: [{ label: 'Clients', href: '/clients' }],
        }
      }
      const lines = [
        `**${ctx.clientReengagement.length} client${ctx.clientReengagement.length !== 1 ? 's' : ''} overdue for a booking:**\n`,
      ]
      for (const c of ctx.clientReengagement.slice(0, 5)) {
        lines.push(
          `- **${c.clientName}** — usually books every ~${c.avgIntervalDays}d, last booked ${c.daysSinceLastBooking}d ago (${c.eventCount} events total)`
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
        lines.push(`- **${c.clientName}** — ${c.purpose ?? 'call'} (${when})`)
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
        text: `**${new Date().getFullYear()} Year-to-Date:**\n\n- Revenue: **${rev}**\n- Expenses: ${exp}\n- Profit: **${profit}** (${margin}% margin)\n- Events: ${ys.totalEventsThisYear} total (${ys.completedEventsThisYear} completed)\n- Avg revenue/event: ${avgEvent}\n\n${margin >= 50 ? 'Strong margins — your year is on track. 🔥' : margin >= 30 ? 'Decent margins. Keep an eye on expenses.' : 'Margins are tight — worth reviewing your cost structure.'}`,
        navSuggestions: [
          { label: 'Financials', href: '/financials' },
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
          text: 'No upcoming events with projected revenue. Pipeline is empty — time for some outreach. 📬',
          navSuggestions: [{ label: 'Inquiries', href: '/inquiries' }],
        }
      }
      return {
        text: `**Cash flow outlook:** ${(cf.expectedCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} expected from **${cf.eventCount} upcoming event${cf.eventCount !== 1 ? 's' : ''}**.\n\n${ctx.overduePayments && ctx.overduePayments.length > 0 ? `⚠️ Plus ${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''} outstanding.` : 'No overdue payments — clean pipeline. ✅'}`,
        navSuggestions: [{ label: 'Financials', href: '/financials' }],
      }
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
        text: `**${rc.repeatClients}** of your **${rc.totalClients}** clients are repeat bookers (**${rc.ratio}%**).\n\n${rc.ratio >= 40 ? 'Excellent retention — your clients love you. Keep nurturing those relationships. 💛' : rc.ratio >= 20 ? "Solid foundation of repeats. Focus on re-engagement for clients who've gone quiet." : 'Low repeat rate — consider a post-event follow-up sequence to bring clients back.'}`,
        navSuggestions: [
          { label: 'Clients', href: '/clients' },
          { label: 'Loyalty', href: '/loyalty' },
        ],
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
// ─── Contextual Follow-Up Intelligence ──────────────────────────────────────
// After answering a factual question, Remy proactively suggests the most
// relevant next action based on the chef's current state. This turns every
// instant answer into a mini-consultation — one nugget, max, to avoid noise.

function buildContextualFollowUp(ctx: RemyContext, answeredTopic: string): string | null {
  // Don't suggest follow-ups for greetings/thanks — those already have proactive context
  if (answeredTopic === 'greeting' || answeredTopic === 'thanks') return null

  // Priority 1: Urgent items the chef might not know about
  if (answeredTopic !== 'payments' && ctx.overduePayments && ctx.overduePayments.length > 0) {
    return `\n\n💡 *Heads up:* ${ctx.overduePayments.length} overdue payment${ctx.overduePayments.length !== 1 ? 's' : ''} need attention — ask me "payment deadlines" for details.`
  }

  if (
    answeredTopic !== 'inquiries' &&
    ctx.staleInquiries &&
    ctx.staleInquiries.some((i) => i.leadScore >= 60)
  ) {
    const hot = ctx.staleInquiries.filter((i) => i.leadScore >= 60)
    return `\n\n💡 *Quick note:* ${hot.length} high-value lead${hot.length !== 1 ? 's' : ''} going cold — ask me about stale inquiries.`
  }

  // Priority 2: Contextual nudges based on what they asked about
  if (answeredTopic === 'revenue' && ctx.conversionRate && ctx.conversionRate.rate < 25) {
    return `\n\n💡 *Tip:* Your conversion rate is ${ctx.conversionRate.rate}% — faster follow-ups on new inquiries could boost revenue.`
  }

  if (answeredTopic === 'clients' && ctx.clientReengagement && ctx.clientReengagement.length > 0) {
    return `\n\n💡 *Tip:* ${ctx.clientReengagement.length} client${ctx.clientReengagement.length !== 1 ? 's are' : ' is'} overdue for a booking — ask me "who should I re-engage?"`
  }

  if (answeredTopic === 'events' && ctx.expiringQuotes && ctx.expiringQuotes.length > 0) {
    return `\n\n💡 *Tip:* ${ctx.expiringQuotes.length} quote${ctx.expiringQuotes.length !== 1 ? 's are' : ' is'} expiring soon — follow up before they lapse.`
  }

  if (answeredTopic === 'schedule' && ctx.upcomingCalls && ctx.upcomingCalls.length > 0) {
    const nextCall = ctx.upcomingCalls[0]
    return `\n\n💡 *Also:* You have a call with ${nextCall.clientName} coming up — ask me "upcoming calls" for the full list.`
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
  return 'general'
}

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
      if (result) {
        // Enrich with contextual follow-up intelligence
        const topic = getAnswerTopic(pattern)
        const followUp = buildContextualFollowUp(context, topic)
        if (followUp) {
          return { ...result, text: result.text + followUp }
        }
        return result
      }
    }
  }

  return null
}
