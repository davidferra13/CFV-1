import type { RemyTaskResult } from '@/lib/ai/remy-types'

interface StreamEvent {
  type: 'token' | 'tasks' | 'nav' | 'memories' | 'quick_replies' | 'done' | 'error' | 'intent'
  data: unknown
}

//  Memory Intent Detection

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

export function detectMemoryIntent(message: string): MemoryIntent {
  for (const p of MEMORY_ADD_PATTERNS) {
    if (p.test(message)) return 'add'
  }
  for (const p of MEMORY_LIST_PATTERNS) {
    if (p.test(message)) return 'list'
  }
  return null
}

// ─── Thinking Mode (Gemma 4 configurable reasoning) ──────────────────────────
// Gemma 4 supports `think: true` for step-by-step reasoning before answering.
// Enable for complex queries where deeper reasoning improves output quality.
// Keep off for simple chat to maintain fast response times.

const THINKING_PATTERNS = [
  /\b(analyz|analysis|break\s*down|compare|evaluat|assess)/i,
  /\b(financ|revenue|profit|margin|cost|expense|budget|pricing|forecast)/i,
  /\b(strategy|plan|approach|recommend|advise|suggest\s+how)/i,
  /\b(why\s+(is|are|did|does|do|should|would|has))/i,
  /\b(explain|walk\s+me\s+through|help\s+me\s+understand)/i,
  /\b(what\s+should\s+I|how\s+should\s+I|best\s+way\s+to)/i,
  /\b(trend|pattern|insight|opportunit)/i,
]

export function shouldUseThinking(scope: 'full' | 'minimal' | 'focused', message: string): boolean {
  // Always off for minimal scope (greetings, simple questions)
  if (scope === 'minimal') return false

  // Full scope = complex query, always think
  if (scope === 'full') return true

  // Focused scope: check message patterns for complexity signals
  return THINKING_PATTERNS.some((p) => p.test(message))
}

export function formatCategoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

//  Task Result Summarizer

export function summarizeTaskResults(results: RemyTaskResult[]): string {
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
      // Inline draft content so the text stream includes the actual draft
      const pendingData = task.data as
        | { draftText?: string; subject?: string; clientName?: string }
        | undefined
      if (pendingData?.draftText) {
        const label = pendingData.clientName ? ` for ${pendingData.clientName}` : ''
        summaries.push(
          `I've drafted "${name}"${label} for your review - edit before sending:\n\n${pendingData.draftText}`
        )
      } else {
        summaries.push(`I've drafted "${name}" for your review - check the card below.`)
      }
      continue
    }

    if (task.taskType === 'client.search' && task.data) {
      const d = task.data as {
        clients: Array<{
          name: string
          allergies?: string[]
          dietaryRestrictions?: string[]
          loyaltyTier?: string | null
        }>
      }
      if (d.clients.length === 0) summaries.push('No matching clients found.')
      else {
        const clientLines = d.clients.map((c) => {
          const parts = [c.name]
          if (c.loyaltyTier) parts.push(`(${c.loyaltyTier} tier)`)
          if (c.allergies && c.allergies.length > 0)
            parts.push(`\n  [ALERT] ALLERGIES: ${c.allergies.join(', ').toUpperCase()}`)
          if (c.dietaryRestrictions && c.dietaryRestrictions.length > 0)
            parts.push(`\n  Dietary: ${c.dietaryRestrictions.join(', ')}`)
          return parts.join(' ')
        })
        summaries.push(
          `Found ${d.clients.length} client${d.clients.length > 1 ? 's' : ''}:\n${clientLines.map((l) => `- ${l}`).join('\n')}`
        )
      }
    } else if (task.taskType === 'calendar.availability' && task.data) {
      const d = task.data as {
        date: string
        available: boolean
        conflicts?: Array<{ occasion: string }>
      }
      if (d.available) summaries.push(`${d.date} is available - no events booked.`)
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
          `Here are your upcoming events:\n${d.events.map((e) => `- ${e.occasion ?? 'Event'} on ${e.date ?? '(no date)'} for ${e.clientName} (${e.status})`).join('\n')}`
        )
    } else if (task.taskType === 'event.details' && task.data) {
      const d = task.data as {
        found: boolean
        event?: {
          occasion?: string | null
          date?: string | null
          status?: string | null
          guestCount?: number | null
          clientName?: string | null
        }
      }
      if (!d.found || !d.event) {
        summaries.push('No event found matching that name in your account.')
      } else {
        const occasion = d.event.occasion ?? 'Event'
        const date = d.event.date ?? '(no date)'
        const status = d.event.status ?? 'unknown'
        const guests =
          typeof d.event.guestCount === 'number' ? `${d.event.guestCount} guests` : null
        const client =
          d.event.clientName && d.event.clientName.trim().length > 0
            ? d.event.clientName
            : 'Unknown client'
        const details = [guests, `for ${client}`].filter(Boolean).join(', ')
        summaries.push(
          `Found event: ${occasion} on ${date} (${status})${details ? ` - ${details}` : ''}.`
        )
      }
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
          `Here's what I found online for "${d.query}":\n${d.results.map((r) => `- **${r.title}**\n  ${r.snippet}\n  [${r.url}](${r.url})`).join('\n')}`
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
          lines.push(`- **${c.name}**${c.reason ? ` - ${c.reason}` : ''}`)
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
            `- **${step.time}** ${step.task} _(${step.duration})_${step.notes ? ` - ${step.notes}` : ''}`
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
        summaries.push("Nothing urgent right now - you're all caught up!")
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
          `**${d.recipeName}** - scaled from ${d.originalYield} to ${d.targetGuests} servings (${d.scaleFactor}x)\n`,
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
            lines.push(`- ${item.quantity}  ${item.item}${item.notes ? ` _(${item.notes})_` : ''}`)
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
        const lines = [`**${d.recipeName}** - $${(d.currentCostCents / 100).toFixed(2)} total\n`]
        for (const s of d.suggestions) {
          lines.push(
            `- **${s.ingredient}** (${s.currentCost}): ${s.suggestion} - save ~${s.estimatedSaving}`
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
        `Here's your ${name.toLowerCase()}${label} - review and edit before sending:\n\n${d.draftText}`
      )
    } else if (task.taskType === 'inquiry.list_open' && task.data) {
      const d = task.data as {
        inquiries: Array<{
          id: string
          status: string
          eventType: string | null
          eventDate: string | null
          guestCount: number | null
          clientName: string
          channel?: string | null
          sourceMessage?: string | null
        }>
      }
      if (!d.inquiries || d.inquiries.length === 0) {
        summaries.push('No open inquiries right now - your pipeline is clear!')
      } else {
        const lines = [
          `You have ${d.inquiries.length} open inquir${d.inquiries.length === 1 ? 'y' : 'ies'}:\n`,
        ]
        for (const inq of d.inquiries) {
          // Build display: occasion/event type first (most useful identifier), then contact/channel, then metadata
          const label = inq.eventType ?? inq.clientName ?? 'New inquiry'
          const details = [label]
          if (inq.channel) details.push(`via ${inq.channel}`)
          if (inq.eventDate) details.push(inq.eventDate)
          if (inq.guestCount) details.push(`${inq.guestCount} guests`)
          details.push(`(${inq.status.replace(/_/g, ' ')})`)
          lines.push(`- ${details.join(' - ')}`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'recipe.search' && task.data) {
      const d = task.data as {
        recipes: Array<{
          id: string
          name: string
          category: string
          prepTime: number
          cookTime: number
          timesCooked: number
        }>
      }
      if (!d.recipes || d.recipes.length === 0) {
        summaries.push(
          'No recipes found matching that search. Try a different keyword or check your recipe library.'
        )
      } else {
        const lines = [`Found ${d.recipes.length} recipe${d.recipes.length === 1 ? '' : 's'}:\n`]
        for (const r of d.recipes) {
          const totalTime = (r.prepTime || 0) + (r.cookTime || 0)
          const timeStr = totalTime > 0 ? ` (${totalTime} min)` : ''
          const cookedStr = r.timesCooked > 0 ? ` - cooked ${r.timesCooked}` : ''
          lines.push(`- **${r.name}**${r.category ? ` [${r.category}]` : ''}${timeStr}${cookedStr}`)
        }
        summaries.push(lines.join('\n'))
      }
    } else if (task.taskType === 'nav.go' && task.data) {
      const d = task.data as { route: string; navigated: boolean }
      summaries.push(`Navigating you to **${d.route}** now.`)

      // ─── Workflow action results ───────────────────────────────────────────
    } else if (task.taskType === 'agent.complete_todo' && task.data) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)
    } else if (
      (task.taskType === 'agent.start_timer' || task.taskType === 'agent.stop_timer') &&
      task.data
    ) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)
    } else if (task.taskType === 'agent.set_food_budget' && task.data) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)
    } else if (task.taskType === 'agent.create_goal' && task.data) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)
    } else if (task.taskType === 'agent.mark_followup' && task.data) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)
    } else if (task.taskType === 'agent.shopping_list' && task.data) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)
    } else if (task.taskType === 'agent.recipe_dietary_check' && task.data) {
      const d = task.data as { success: boolean; message: string }
      summaries.push(d.message)

      // ─── More read-only task formatting ────────────────────────────────────
    } else if (task.taskType === 'briefing.morning' && task.data) {
      const d = task.data as { briefing?: string; message?: string }
      summaries.push(d.briefing ?? d.message ?? 'Morning briefing ready.')
    } else if (task.taskType === 'goals.dashboard' && task.data) {
      const d = task.data as {
        goals?: Array<{ label: string; progress_pct?: number; status: string }>
      }
      if (d.goals && d.goals.length > 0) {
        const lines = ['**Your goals:**']
        for (const g of d.goals) {
          const pct = g.progress_pct != null ? ` (${g.progress_pct}%)` : ''
          lines.push(`- ${g.label}${pct} - ${g.status}`)
        }
        summaries.push(lines.join('\n'))
      } else {
        summaries.push('No active goals. Set one with "set a goal to..."')
      }
    } else if (task.taskType === 'tasks.list' && task.data) {
      const d = task.data as { tasks?: Array<{ title: string; status: string; due_date?: string }> }
      if (d.tasks && d.tasks.length > 0) {
        const lines = [`**${d.tasks.length} task${d.tasks.length === 1 ? '' : 's'}:**`]
        for (const t of d.tasks.slice(0, 10)) {
          const due = t.due_date ? ` (due ${t.due_date})` : ''
          lines.push(`- ${t.title}${due} [${t.status}]`)
        }
        summaries.push(lines.join('\n'))
      } else {
        summaries.push('No tasks found.')
      }
    } else if (task.taskType === 'tasks.overdue' && task.data) {
      const d = task.data as { tasks?: Array<{ title: string; status: string; due_date?: string }> }
      if (d.tasks && d.tasks.length > 0) {
        const lines = [`**${d.tasks.length} overdue task${d.tasks.length === 1 ? '' : 's'}:**`]
        for (const t of d.tasks.slice(0, 10)) {
          const due = t.due_date ? ` (was due ${t.due_date})` : ''
          lines.push(`- ${t.title}${due}`)
        }
        summaries.push(lines.join('\n'))
      } else {
        summaries.push("No overdue tasks - you're on track!")
      }
    } else if (task.taskType === 'email.inbox_summary' && task.data) {
      const d = task.data as {
        total?: number
        unread?: number
        recent?: Array<{ from: string; subject: string; date?: string }>
        summary?: string
      }
      if (d.summary) {
        summaries.push(d.summary)
      } else if (d.recent && d.recent.length > 0) {
        const lines = [`**Inbox** (${d.unread ?? 0} unread of ${d.total ?? d.recent.length}):\n`]
        for (const e of d.recent.slice(0, 8)) {
          lines.push(`- **${e.from}**: ${e.subject}${e.date ? ` (${e.date})` : ''}`)
        }
        summaries.push(lines.join('\n'))
      } else {
        summaries.push('Inbox is empty or email sync is not connected.')
      }
    } else if (task.taskType === 'email.followup' && task.data) {
      const d = task.data as {
        draftText?: string
        subject?: string
        clientName?: string
        message?: string
      }
      if (d.draftText) {
        const label = d.clientName ? ` for ${d.clientName}` : ''
        summaries.push(`Here's your follow-up draft${label}:\n\n${d.draftText}`)
      } else {
        summaries.push(d.message ?? `Follow-up drafted.`)
      }
    } else if (task.taskType === 'finance.pnl' && task.data) {
      const d = task.data as {
        revenueCents?: number
        expensesCents?: number
        profitCents?: number
        marginPct?: number
        period?: string
        summary?: string
      }
      if (d.summary) {
        summaries.push(d.summary)
      } else {
        const rev = d.revenueCents != null ? `$${(d.revenueCents / 100).toFixed(2)}` : '$0'
        const exp = d.expensesCents != null ? `$${(d.expensesCents / 100).toFixed(2)}` : '$0'
        const profit = d.profitCents != null ? `$${(d.profitCents / 100).toFixed(2)}` : '$0'
        const margin = d.marginPct != null ? ` (${d.marginPct.toFixed(1)}% margin)` : ''
        summaries.push(
          `**P&L${d.period ? ` - ${d.period}` : ''}:**\nRevenue: ${rev}\nExpenses: ${exp}\nProfit: ${profit}${margin}`
        )
      }
    } else if (task.taskType === 'staff.availability' && task.data) {
      const d = task.data as { staff?: Array<{ name: string; available: boolean; role?: string }> }
      if (d.staff && d.staff.length > 0) {
        const available = d.staff.filter((s) => s.available)
        const unavailable = d.staff.filter((s) => !s.available)
        const lines: string[] = []
        if (available.length > 0) {
          lines.push(
            `**Available (${available.length}):** ${available.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(', ')}`
          )
        }
        if (unavailable.length > 0) {
          lines.push(
            `**Unavailable (${unavailable.length}):** ${unavailable.map((s) => s.name).join(', ')}`
          )
        }
        summaries.push(lines.join('\n'))
      } else {
        summaries.push('No staff members found.')
      }
    } else if (task.taskType === 'price.check' && task.data) {
      const d = task.data as {
        message?: string
        prices?: Array<{
          ingredient: string
          cents: number | null
          unit: string
          store: string | null
          source: string
          confidence: number
          piCents?: number | null
          piStore?: string | null
        }>
      }
      if (d.prices && d.prices.length > 0) {
        const lines = d.prices.map((p) => {
          if (p.cents === null && !p.piCents) return `- **${p.ingredient}**: no price data`
          const parts: string[] = [`- **${p.ingredient}**:`]
          if (p.cents !== null) {
            const store = p.store ? ` at ${p.store}` : ''
            parts.push(`$${(p.cents / 100).toFixed(2)}/${p.unit}${store}`)
          }
          // Show Pi market price if different from DB price
          if (p.piCents && p.piStore) {
            if (p.cents === null) {
              parts.push(`$${(p.piCents / 100).toFixed(2)} at ${p.piStore} (market)`)
            } else if (Math.abs(p.piCents - (p.cents || 0)) > 10) {
              const cheaper = p.piCents < (p.cents || 0)
              parts.push(
                `| ${cheaper ? 'better deal' : 'also'} $${(p.piCents / 100).toFixed(2)} at ${p.piStore}`
              )
            }
          }
          return parts.join(' ')
        })
        summaries.push(lines.join('\n'))
      } else {
        summaries.push(d.message || 'No price data found.')
      }
    } else {
      summaries.push(`"${name}" completed successfully.`)
    }
  }

  return summaries.join('\n\n')
}

//  SSE Encoder

export function encodeSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export function sseErrorResponse(message: string, status = 200): Response {
  return new Response(encodeSSE({ type: 'error', data: message }), {
    status,
    headers: sseHeaders(),
  })
}

//  Shared constants
export function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

/**
 * Hard timeout for Ollama streaming calls.
 * Gemma 4 responds in 1-6s. 30s catches genuine hangs without
 * wasting 3 minutes on a dead connection.
 */
export const OLLAMA_STREAM_TIMEOUT_MS = 30_000

/**
 * Max tokens for streaming conversational responses.
 * 4096 tokens ~ 3000 words. Gemma 4 with 128K context handles this easily.
 */
export const OLLAMA_STREAM_MAX_TOKENS = 4096

/**
 * Response token budgets by context scope.
 * Gemma 4 is fast enough that generous budgets don't hurt latency.
 * Let the model use what it needs; short answers stay short naturally.
 */
export function getOperatorResponseTokenBudget(
  scope: 'full' | 'minimal' | 'focused',
  intent: 'question' | 'mixed' | 'command' = 'question'
): number {
  let budget = 1200

  if (scope === 'minimal') {
    budget = intent === 'mixed' ? 800 : 600
  } else if (scope === 'focused') {
    budget = intent === 'mixed' ? 1500 : 1200
  } else {
    budget = intent === 'mixed' ? 2500 : 2000
  }

  return Math.min(budget, OLLAMA_STREAM_MAX_TOKENS)
}

export function buildGreetingFastPath(now = new Date()): string {
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return `${greeting}, chef!\n\nI'm here. Ask me about events, clients, menus, costs, drafts, or what needs attention today.`
}

/**
 * Filters out <think>...</think> blocks from streaming output.
 * Accumulates partial tokens until a complete think block can be stripped.
 */
export class ThinkingBlockFilter {
  private buffer = ''
  private inThinkBlock = false

  process(token: string): string {
    this.buffer += token

    // Check for opening <think> tag
    if (!this.inThinkBlock) {
      const openIdx = this.buffer.indexOf('<think>')
      if (openIdx !== -1) {
        const before = this.buffer.substring(0, openIdx)
        this.buffer = this.buffer.substring(openIdx)
        this.inThinkBlock = true
        // Check if closing tag is already in buffer
        const closeIdx = this.buffer.indexOf('</think>')
        if (closeIdx !== -1) {
          this.buffer = this.buffer.substring(closeIdx + '</think>'.length)
          this.inThinkBlock = false
          return before + this.process('')
        }
        return before || ''
      }
      // No think tag - might be partial "<thi" at end
      if (this.buffer.length > 7 && !this.buffer.endsWith('<')) {
        const safe = this.buffer.includes('<')
          ? this.buffer.substring(0, this.buffer.lastIndexOf('<'))
          : this.buffer
        this.buffer = this.buffer.substring(safe.length)
        return safe
      }
      const out = this.buffer
      this.buffer = ''
      return out
    }

    // Inside think block - look for closing tag
    const closeIdx = this.buffer.indexOf('</think>')
    if (closeIdx !== -1) {
      this.buffer = this.buffer.substring(closeIdx + '</think>'.length)
      this.inThinkBlock = false
      return this.process('')
    }
    return ''
  }

  /** Flush any remaining buffered content that is not inside a think block. */
  flush(): string {
    if (this.inThinkBlock) {
      // Discard incomplete think block content
      this.buffer = ''
      this.inThinkBlock = false
      return ''
    }
    const remaining = this.buffer
    this.buffer = ''
    return remaining
  }
}

export function extractNavSuggestions(
  text: string
): Array<{ label: string; href: string; description?: string }> {
  const navMatch = text.match(/NAV_SUGGESTIONS:\s*(\[[\s\S]*\])/)
  if (!navMatch) return []
  try {
    return JSON.parse(navMatch[1])
  } catch (err) {
    console.error('[remy-stream] Failed to parse NAV_SUGGESTIONS', err)
    return []
  }
}

// ─── Action Suggestions ───────────────────────────────────────────────────────
// After answering a question, suggest related actions Remy can execute.
// Deterministic (regex-based), no LLM call. Max 2 suggestions per response.

interface ActionSuggestion {
  label: string
  prompt: string // Pre-filled message the chef can send
  description?: string
}

const ACTION_SUGGESTION_RULES: Array<{
  trigger: RegExp
  suggestions: ActionSuggestion[]
}> = [
  {
    trigger: /\b(?:revenue|income|earnings|how much.*(?:make|earn))\b/i,
    suggestions: [
      { label: 'Full P&L', prompt: 'Show my P&L', description: 'Profit & loss breakdown' },
      {
        label: 'Cash flow forecast',
        prompt: 'Cash flow forecast',
        description: 'Projected cash flow',
      },
    ],
  },
  {
    trigger: /\b(?:client|customer).*(?:detail|info|about)\b/i,
    suggestions: [
      {
        label: 'Draft follow-up',
        prompt: 'Draft a follow-up',
        description: 'Write a follow-up message',
      },
      {
        label: 'Check dietary needs',
        prompt: 'Check dietary restrictions',
        description: 'Review allergies & restrictions',
      },
    ],
  },
  {
    trigger: /\b(?:event|dinner|party|booking).*(?:upcoming|next|this week|schedule)\b/i,
    suggestions: [
      {
        label: 'Packing list',
        prompt: 'Generate a packing list for my next event',
        description: 'Gear & supplies checklist',
      },
      {
        label: 'Prep timeline',
        prompt: 'What do I need to prep?',
        description: 'Prep readiness check',
      },
    ],
  },
  {
    trigger: /\b(?:inquiry|lead|inquir).*(?:open|pending|new)\b/i,
    suggestions: [
      {
        label: 'Draft response',
        prompt: 'Draft a response to the inquiry',
        description: 'Write a reply',
      },
      {
        label: 'Check availability',
        prompt: 'Check my availability',
        description: 'See open dates',
      },
    ],
  },
  {
    trigger: /\b(?:slow|quiet|no events|no bookings|gap|downtime)\b/i,
    suggestions: [
      {
        label: 'Re-engage clients',
        prompt: 'Who should I re-engage?',
        description: 'Clients due for outreach',
      },
      {
        label: 'Marketing ideas',
        prompt: 'Marketing suggestions for slow season',
        description: 'Growth strategies',
      },
    ],
  },
  {
    trigger: /\b(?:overwhelm|stressed|busy|slammed|full rail|in the weeds)\b/i,
    suggestions: [
      { label: "Today's plan", prompt: 'Brief me', description: 'Prioritized daily plan' },
      { label: 'Staff help', prompt: "Who's available to help?", description: 'Available staff' },
    ],
  },
  {
    trigger: /\b(?:margin|profit|food cost|pricing|charge|undercharg)\b/i,
    suggestions: [
      {
        label: 'Break-even analysis',
        prompt: 'Break-even analysis for my next event',
        description: 'Cost vs revenue',
      },
      {
        label: 'Quote comparison',
        prompt: 'How do my quotes compare?',
        description: 'Quote range analysis',
      },
    ],
  },
  {
    trigger: /\b(?:recipe|menu|dish|course)\b/i,
    suggestions: [
      {
        label: 'Shopping list',
        prompt: 'Shopping list for this menu',
        description: 'Ingredients & quantities',
      },
      {
        label: 'Dietary check',
        prompt: 'Check dietary compatibility',
        description: 'Allergen & diet analysis',
      },
    ],
  },
  {
    trigger: /\b(?:prep|shopping|groceries|pack|drive|cook)\b.*\b(?:start|begin|ready|time)\b/i,
    suggestions: [
      {
        label: 'Start timer',
        prompt: 'Start the prep timer',
        description: 'Track your work phase',
      },
      {
        label: 'Packing list',
        prompt: 'Generate packing list',
        description: 'Gear & supplies checklist',
      },
    ],
  },
  {
    trigger: /\b(?:done|finished|completed|wrapped up|all set)\b/i,
    suggestions: [
      { label: 'Stop timer', prompt: 'Stop the timer', description: 'Log elapsed time' },
      {
        label: 'Mark follow-up sent',
        prompt: 'Mark the follow-up done',
        description: 'Update event closure',
      },
    ],
  },
  {
    trigger: /\b(?:goal|target|objective|plan|quarter|year)\b.*\b(?:set|create|track|new)\b/i,
    suggestions: [
      {
        label: 'Set a goal',
        prompt: 'Set a goal to book 10 events',
        description: 'Create a business goal',
      },
      { label: 'Goal dashboard', prompt: 'Show my goals', description: 'Progress overview' },
    ],
  },
  {
    trigger: /\b(?:budget|food cost|spend|cap)\b/i,
    suggestions: [
      {
        label: 'Set food budget',
        prompt: 'Set food budget for my next event',
        description: 'Track ingredient spend',
      },
      {
        label: 'Expense breakdown',
        prompt: 'Show my expense breakdown',
        description: 'Where money goes',
      },
    ],
  },
  {
    trigger: /\b(?:todo|task|checklist|to.do)\b/i,
    suggestions: [
      { label: 'Complete a todo', prompt: 'Mark my top todo done', description: 'Check it off' },
      { label: 'Create a todo', prompt: 'Create a todo', description: 'Add a new task' },
    ],
  },
]

export function suggestFollowUpActions(
  userMessage: string,
  remyResponse: string
): ActionSuggestion[] {
  const combined = `${userMessage} ${remyResponse}`
  const suggestions: ActionSuggestion[] = []

  for (const rule of ACTION_SUGGESTION_RULES) {
    if (rule.trigger.test(combined)) {
      for (const s of rule.suggestions) {
        // Don't suggest something the chef already asked about
        if (!new RegExp(s.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(userMessage)) {
          suggestions.push(s)
        }
      }
    }
    if (suggestions.length >= 2) break
  }

  return suggestions.slice(0, 2)
}
