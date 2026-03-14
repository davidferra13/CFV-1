/**
 * Outbound (chef reply) email analyzer.
 *
 * Combines deterministic extraction (pricing, timing, sign-off) with
 * Ollama enrichment (menu items, tone) to analyze the chef's 146 replies.
 */

import type { OutboundAnalysis } from './extraction-types'
import { extractBudgetMentions, extractGuestCounts } from './deterministic-extractors'
import { ollamaExtractOutbound } from './ollama-extractors'

// ─── Response Latency ───────────────────────────────────────────────────

export function computeResponseLatency(
  outboundDate: string,
  previousInboundDate: string | null
): number | null {
  if (!previousInboundDate) return null

  const outTime = new Date(outboundDate).getTime()
  const inTime = new Date(previousInboundDate).getTime()

  if (isNaN(outTime) || isNaN(inTime)) return null
  if (outTime <= inTime) return null // Can't reply before receiving

  const diffMs = outTime - inTime
  return Math.round(diffMs / (1000 * 60)) // minutes
}

// ─── Pricing Extraction (deterministic) ─────────────────────────────────

function extractPricingFromReply(body: string): {
  contains_pricing: boolean
  quoted_amount_cents: number | null
  per_person_rate_cents: number | null
  guest_count_for_pricing: number | null
} {
  const budgets = extractBudgetMentions(body)
  const guests = extractGuestCounts(body)

  if (budgets.length === 0) {
    return {
      contains_pricing: false,
      quoted_amount_cents: null,
      per_person_rate_cents: null,
      guest_count_for_pricing: null,
    }
  }

  // Find the primary price (highest amount is typically the total quote)
  const sorted = [...budgets].sort((a, b) => (b.amount_cents || 0) - (a.amount_cents || 0))
  const primary = sorted[0]
  const guestCount = guests[0]?.number || null

  let perPerson: number | null = null
  let total: number | null = primary.amount_cents

  if (primary.per_person) {
    perPerson = primary.amount_cents
    total = guestCount && perPerson ? perPerson * guestCount : null
  } else if (guestCount && total) {
    perPerson = Math.round(total / guestCount)
  }

  return {
    contains_pricing: true,
    quoted_amount_cents: total,
    per_person_rate_cents: perPerson,
    guest_count_for_pricing: guestCount,
  }
}

// ─── Sign-Off Style (deterministic) ─────────────────────────────────────

export function detectSignOffStyle(body: string): string | null {
  // Look at the last 5 non-empty lines
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lastLines = lines.slice(-5)

  const signOffPatterns: [RegExp, string][] = [
    [/^(?:best|all the best),?\s*/i, 'Best'],
    [/^cheers[!,]?\s*/i, 'Cheers'],
    [/^thanks[!,]?\s*/i, 'Thanks'],
    [/^thank you[!,]?\s*/i, 'Thank you'],
    [/^looking forward/i, 'Looking forward'],
    [/^warm(?:est)?\s+regards/i, 'Warm regards'],
    [/^kind regards/i, 'Kind regards'],
    [/^regards/i, 'Regards'],
    [/^sincerely/i, 'Sincerely'],
    [/^talk soon/i, 'Talk soon'],
    [/^take care/i, 'Take care'],
    [/^can't wait/i, "Can't wait"],
    [/^see you/i, 'See you'],
  ]

  for (const line of lastLines) {
    for (const [regex, label] of signOffPatterns) {
      if (regex.test(line)) {
        // Try to capture the name after the sign-off (use original lines array index)
        const lineIdx = lines.lastIndexOf(line)
        const nameAfter =
          lineIdx >= 0 && lineIdx + 1 < lines.length ? lines[lineIdx + 1] : undefined
        if (nameAfter && nameAfter.length < 30 && /^[A-Z]/.test(nameAfter)) {
          return `${label}, ${nameAfter}`
        }
        return label
      }
    }
  }

  return null
}

// ─── Availability Confirm / Follow-Up Question (deterministic) ──────────

function detectAvailabilityConfirm(body: string): boolean {
  return /\b(?:i'?m\s+available|i\s+(?:can|could)\s+do|that\s+(?:works|date\s+works)|available\s+(?:on|for|that))\b/i.test(
    body
  )
}

function detectFollowUpQuestion(body: string): boolean {
  // Ends with a question? Or has explicit "let me know" / "would you prefer"
  return (
    /\?\s*$/m.test(body) ||
    /\b(?:let\s+me\s+know|would\s+you\s+(?:like|prefer)|what\s+(?:do\s+you|would\s+you)|any\s+(?:questions|preferences|allergies|dietary))\b/i.test(
      body
    )
  )
}

// ─── Main Analyzer ──────────────────────────────────────────────────────

export interface OutboundContext {
  previousInboundDate: string | null
  previousInboundMessageId: string | null
}

export async function analyzeOutboundEmail(
  body: string,
  date: string,
  context: OutboundContext,
  useOllama: boolean
): Promise<OutboundAnalysis> {
  const latency = computeResponseLatency(date, context.previousInboundDate)
  const pricing = extractPricingFromReply(body)
  const signOff = detectSignOffStyle(body)
  const availabilityConfirm = detectAvailabilityConfirm(body)
  const followUpQuestion = detectFollowUpQuestion(body)

  // Ollama enrichment for menu items and tone
  let menuItems: string[] = []
  let coursesOffered: number | null = null
  let tone: OutboundAnalysis['tone'] = null

  if (useOllama) {
    const ollamaResult = await ollamaExtractOutbound(body)
    if (ollamaResult) {
      menuItems = ollamaResult.menu_items
      coursesOffered = ollamaResult.courses_offered
      tone = ollamaResult.tone as OutboundAnalysis['tone']
    }
  }

  // Fallback tone detection (deterministic) if Ollama didn't provide it
  if (!tone) {
    const wordCount = body.split(/\s+/).length
    if (wordCount < 30) tone = 'brief'
    else if (/\bDear\b/.test(body)) tone = 'formal'
    else if (/\b(?:Hey|Hi)\b/.test(body) && /[!]/.test(body)) tone = 'warm'
    else if (/\b(?:Hey|Hi)\b/.test(body)) tone = 'casual'
  }

  // Deterministic course detection if Ollama missed it
  if (coursesOffered === null) {
    const courseMatch = body.match(/\b(\d)\s*[-–]?\s*course/i)
    if (courseMatch) coursesOffered = parseInt(courseMatch[1])
  }

  return {
    reply_to_message_id: context.previousInboundMessageId,
    latency_minutes: latency,
    contains_pricing: pricing.contains_pricing,
    quoted_amount_cents: pricing.quoted_amount_cents,
    per_person_rate_cents: pricing.per_person_rate_cents,
    guest_count_for_pricing: pricing.guest_count_for_pricing,
    menu_items_mentioned: menuItems,
    courses_offered: coursesOffered,
    tone,
    includes_availability_confirm: availabilityConfirm,
    includes_follow_up_question: followUpQuestion,
    sign_off_style: signOff,
  }
}
