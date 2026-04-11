import type { RemyTaskResult } from '@/lib/ai/remy-types'

interface StreamEvent {
  type: 'token' | 'tasks' | 'nav' | 'memories' | 'done' | 'error' | 'intent'
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
 * 3 minutes - the 30b MoE model with partial GPU offload (9/49 layers)
 * regularly takes 40-74s per response. Under load or with long context,
 * it can exceed 90s. This only fires if Ollama is truly stuck.
 */
export const OLLAMA_STREAM_TIMEOUT_MS = 180_000 // 3 min - 30b MoE model on 6GB VRAM can take 40-90s per response

/**
 * Max tokens for streaming conversational responses.
 * Prevents Ollama from generating megabytes of output and ballooning memory.
 * 2048 tokens ~ ~1500 words - more than enough for a chat reply.
 */
export const OLLAMA_STREAM_MAX_TOKENS = 2048

/**
 * Operator-mode response budgets by context scope.
 * Keeps narrow questions tight while leaving enough headroom for true strategy work.
 */
export function getOperatorResponseTokenBudget(
  scope: 'full' | 'minimal' | 'focused',
  intent: 'question' | 'mixed' | 'command' = 'question'
): number {
  let budget = 220

  if (scope === 'minimal') {
    budget = intent === 'mixed' ? 160 : 120
  } else if (scope === 'focused') {
    budget = intent === 'mixed' ? 280 : 220
  } else {
    budget = intent === 'mixed' ? 520 : 420
  }

  return Math.min(budget, OLLAMA_STREAM_MAX_TOKENS)
}

export function buildGreetingFastPath(now = new Date()): string {
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return `${greeting}, chef!\n\nI'm here. Ask me about events, clients, menus, costs, drafts, or what needs attention today.`
}

/**
 * Filters out <think>...</think> blocks from qwen3 streaming output.
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
  } catch {
    return []
  }
}
