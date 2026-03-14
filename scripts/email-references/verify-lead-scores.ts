/**
 * Verify lead scoring formula against real GOLDMINE thread outcomes.
 *
 * Reads thread-intelligence.json, scores each thread using the lead scoring
 * formula, and checks that booked/likely_booked threads score higher than
 * expired threads on average.
 *
 * Run: npx tsx scripts/email-references/verify-lead-scores.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname, '..', '..')
const GOLDMINE_DIR = join(ROOT, 'data', 'email-references', 'generated', 'goldmine')

// ── Inline lead scoring (mirrors lib/inquiries/goldmine-lead-score.ts) ──

const WEIGHTS = {
  has_date: 12,
  has_pricing_quoted: 12,
  multi_message: 12,
  has_budget: 8,
  has_location: 8,
  has_guest_count: 5,
  has_dietary: 5,
  has_occasion: 0,
  has_cannabis: 0,
  has_referral: 0,
  airbnb_referral: 0,
} as const

const MAX_RAW = (Object.values(WEIGHTS) as number[]).reduce((a, b) => a + b, 0)

function scoreThread(input: {
  has_date: boolean
  has_guest_count: boolean
  has_budget: boolean
  has_occasion: boolean
  has_dietary: boolean
  has_cannabis: boolean
  has_referral: boolean
  has_location: boolean
  has_pricing_quoted: boolean
  multi_message: boolean
}): { score: number; factors: string[]; tier: 'hot' | 'warm' | 'cold' } {
  let rawScore = 0
  const factors: string[] = []

  if (input.has_date) {
    rawScore += WEIGHTS.has_date
    factors.push('date')
  }
  if (input.has_pricing_quoted) {
    rawScore += WEIGHTS.has_pricing_quoted
    factors.push('pricing')
  }
  if (input.multi_message) {
    rawScore += WEIGHTS.multi_message
    factors.push('multi-msg')
  }
  if (input.has_budget) {
    rawScore += WEIGHTS.has_budget
    factors.push('budget')
  }
  if (input.has_location) {
    rawScore += WEIGHTS.has_location
    factors.push('location')
  }
  if (input.has_guest_count) {
    rawScore += WEIGHTS.has_guest_count
    factors.push('guests')
  }
  if (input.has_dietary) {
    rawScore += WEIGHTS.has_dietary
    factors.push('dietary')
  }

  const score = MAX_RAW > 0 ? Math.round((rawScore / MAX_RAW) * 100) : 0
  const tier = score >= 70 ? ('hot' as const) : score >= 40 ? ('warm' as const) : ('cold' as const)
  return { score, factors, tier }
}

// ── Load and score ──────────────────────────────────────────────────────

interface ThreadRecord {
  thread_id: string
  client_name: string | null
  outcome: string
  total_messages: number
  event_date: string | null
  guest_count: number | null
  budget_cents: number | null
  occasion: string | null
  dietary_restrictions: string[]
  cannabis_preference: string | null
  referral_source: string | null
  location: string | null
  quoted_amount_cents: number | null
}

const threadData = JSON.parse(readFileSync(join(GOLDMINE_DIR, 'thread-intelligence.json'), 'utf-8'))

const threads: ThreadRecord[] = Object.values(threadData.threads)

const scored = threads.map((t) => {
  const result = scoreThread({
    has_date: !!t.event_date,
    has_guest_count: (t.guest_count ?? 0) > 0,
    has_budget: (t.budget_cents ?? 0) > 0,
    has_occasion: !!t.occasion,
    has_dietary: (t.dietary_restrictions?.length ?? 0) > 0,
    has_cannabis: !!t.cannabis_preference,
    has_referral: !!t.referral_source,
    has_location: !!t.location,
    has_pricing_quoted: (t.quoted_amount_cents ?? 0) > 0,
    multi_message: t.total_messages >= 3,
  })
  return { ...t, ...result }
})

// ── Results ──────────────────────────────────────────────────────────────

const groups: Record<string, typeof scored> = {}
for (const s of scored) {
  if (!groups[s.outcome]) groups[s.outcome] = []
  groups[s.outcome].push(s)
}

console.log('=== GOLDMINE Lead Score Verification ===\n')

for (const [outcome, items] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
  const avg = Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length)
  const tiers = { hot: 0, warm: 0, cold: 0 }
  for (const i of items) tiers[i.tier]++

  console.log(
    `${outcome.padEnd(20)} n=${String(items.length).padStart(2)}  avg_score=${String(avg).padStart(3)}  hot=${tiers.hot} warm=${tiers.warm} cold=${tiers.cold}`
  )
}

const convertedScores = scored
  .filter((s) => s.outcome === 'booked' || s.outcome === 'likely_booked')
  .map((s) => s.score)
const expiredScores = scored.filter((s) => s.outcome === 'expired').map((s) => s.score)

const avgConverted = convertedScores.length
  ? Math.round(convertedScores.reduce((a, b) => a + b, 0) / convertedScores.length)
  : 0
const avgExpired = expiredScores.length
  ? Math.round(expiredScores.reduce((a, b) => a + b, 0) / expiredScores.length)
  : 0

console.log('\n=== Key Comparison ===')
console.log(`Converted avg score: ${avgConverted} (n=${convertedScores.length})`)
console.log(`Expired avg score:   ${avgExpired} (n=${expiredScores.length})`)
console.log(`Difference:          +${avgConverted - avgExpired} points`)

if (avgConverted > avgExpired) {
  console.log('\n✓ PASS — Converted threads score higher than expired threads')
} else {
  console.log('\n✗ FAIL — Converted threads do NOT score higher (formula needs tuning)')
}

console.log('\n=== Top 5 Booked/Likely-Booked Threads ===')
const topConverted = scored
  .filter((s) => s.outcome === 'booked' || s.outcome === 'likely_booked')
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)

for (const t of topConverted) {
  console.log(
    `  ${t.tier.toUpperCase().padEnd(5)} ${String(t.score).padStart(3)}/100  ${(t.client_name || t.thread_id).substring(0, 25).padEnd(25)}  [${t.factors.join(', ')}]`
  )
}

console.log('\n=== Bottom 5 Expired Threads ===')
const bottomExpired = scored
  .filter((s) => s.outcome === 'expired')
  .sort((a, b) => a.score - b.score)
  .slice(0, 5)

for (const t of bottomExpired) {
  console.log(
    `  ${t.tier.toUpperCase().padEnd(5)} ${String(t.score).padStart(3)}/100  ${(t.client_name || t.thread_id).substring(0, 25).padEnd(25)}  [${t.factors.join(', ')}]`
  )
}
