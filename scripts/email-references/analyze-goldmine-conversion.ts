/**
 * GOLDMINE Conversion Intelligence Analysis.
 *
 * Reads the corrected thread intelligence, extracted fields, and outbound
 * patterns to produce a comprehensive statistical analysis of what makes
 * a booking happen. Outputs conversion-intelligence.json with:
 *
 * - Dimension-by-dimension comparison (booked vs expired vs declined)
 * - Lead score weights derived from real outcome data
 * - Pricing benchmarks by guest count, occasion, and cannabis preference
 * - Response time targets
 *
 * All analysis is deterministic - formula > AI.
 *
 * Run:
 *   npx tsx scripts/email-references/analyze-goldmine-conversion.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

// ─── Types ──────────────────────────────────────────────────────────────

interface ThreadRecord {
  thread_id: string
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  event_date: string | null
  guest_count: number | null
  location: string | null
  occasion: string | null
  budget_cents: number | null
  dietary_restrictions: string[]
  cannabis_preference: string | null
  referral_source: string | null
  stages: { stage: string; entered_at: string; message_id: string }[]
  outcome: string
  outcome_confidence: string
  first_response_minutes: number | null
  total_messages: number
  inbound_count: number
  outbound_count: number
  duration_days: number | null
  quoted_amount_cents: number | null
  per_person_rate_cents: number | null
}

interface ThreadIntelligenceFile {
  generated_at: string
  threads: Record<string, ThreadRecord>
  aggregate_stats: {
    total_threads: number
    outcome_distribution: Record<string, number>
    avg_first_response_minutes: number | null
    median_first_response_minutes: number | null
    conversion_rate: number
  }
}

type OutcomeGroup = 'converted' | 'expired' | 'declined'

// ─── Helpers ────────────────────────────────────────────────────────────

function median(arr: number[]): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function pct(count: number, total: number): number {
  return total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
}

function rate(count: number, total: number): number {
  return total > 0 ? Number((count / total).toFixed(3)) : 0
}

function groupOutcome(outcome: string): OutcomeGroup {
  if (outcome === 'booked' || outcome === 'likely_booked') return 'converted'
  if (outcome === 'declined_by_client' || outcome === 'declined_by_chef') return 'declined'
  return 'expired' // expired + unknown
}

function furthestStage(stages: { stage: string }[]): string {
  if (stages.length === 0) return 'none'
  const order = [
    'initial_inquiry',
    'information_gathering',
    'negotiation',
    'confirmation',
    'pre_event_logistics',
    'post_event',
  ]
  let furthest = stages[0].stage
  let furthestIdx = order.indexOf(furthest)
  for (const s of stages) {
    const idx = order.indexOf(s.stage)
    if (idx > furthestIdx) {
      furthest = s.stage
      furthestIdx = idx
    }
  }
  return furthest
}

function guestBucket(count: number | null): string {
  if (count === null) return 'unknown'
  if (count <= 2) return '1-2'
  if (count <= 6) return '3-6'
  if (count <= 12) return '7-12'
  return '13+'
}

// ─── Dimension Analyzers ────────────────────────────────────────────────

function analyzeResponseTime(threads: ThreadRecord[]) {
  const groups: Record<OutcomeGroup, number[]> = { converted: [], expired: [], declined: [] }
  for (const t of threads) {
    if (t.first_response_minutes !== null && t.first_response_minutes > 0) {
      groups[groupOutcome(t.outcome)].push(t.first_response_minutes)
    }
  }

  // Find sweet spot - response time window with highest conversion rate
  const allWithResponse = threads.filter(
    (t) => t.first_response_minutes !== null && t.first_response_minutes > 0
  )
  const windows = [
    { label: '<1hr', min: 0, max: 60 },
    { label: '1-4hr', min: 60, max: 240 },
    { label: '4-24hr', min: 240, max: 1440 },
    { label: '1-3d', min: 1440, max: 4320 },
    { label: '>3d', min: 4320, max: Infinity },
  ]

  const windowStats = windows.map((w) => {
    const inWindow = allWithResponse.filter(
      (t) => t.first_response_minutes! >= w.min && t.first_response_minutes! < w.max
    )
    const converted = inWindow.filter(
      (t) => t.outcome === 'booked' || t.outcome === 'likely_booked'
    ).length
    return {
      window: w.label,
      total: inWindow.length,
      converted,
      conversion_rate: rate(converted, inWindow.length),
    }
  })

  return {
    converted: {
      avg: avg(groups.converted),
      median: median(groups.converted),
      count: groups.converted.length,
    },
    expired: {
      avg: avg(groups.expired),
      median: median(groups.expired),
      count: groups.expired.length,
    },
    declined: {
      avg: avg(groups.declined),
      median: median(groups.declined),
      count: groups.declined.length,
    },
    response_windows: windowStats,
  }
}

function analyzeMessaging(threads: ThreadRecord[]) {
  const groups: Record<
    OutcomeGroup,
    { total: number[]; inbound: number[]; outbound: number[]; duration: number[] }
  > = {
    converted: { total: [], inbound: [], outbound: [], duration: [] },
    expired: { total: [], inbound: [], outbound: [], duration: [] },
    declined: { total: [], inbound: [], outbound: [], duration: [] },
  }

  for (const t of threads) {
    const g = groupOutcome(t.outcome)
    groups[g].total.push(t.total_messages)
    groups[g].inbound.push(t.inbound_count)
    groups[g].outbound.push(t.outbound_count)
    if (t.duration_days !== null) groups[g].duration.push(t.duration_days)
  }

  const summarize = (g: OutcomeGroup) => ({
    avg_total_messages: avg(groups[g].total),
    avg_inbound: avg(groups[g].inbound),
    avg_outbound: avg(groups[g].outbound),
    avg_duration_days: avg(groups[g].duration),
    median_duration_days: median(groups[g].duration),
    count: groups[g].total.length,
  })

  return {
    converted: summarize('converted'),
    expired: summarize('expired'),
    declined: summarize('declined'),
  }
}

function analyzePricing(threads: ThreadRecord[]) {
  const withPricing = threads.filter(
    (t) => t.quoted_amount_cents !== null && t.quoted_amount_cents > 0
  )
  const convertedPricing = withPricing.filter(
    (t) => t.outcome === 'booked' || t.outcome === 'likely_booked'
  )
  const expiredPricing = withPricing.filter((t) => groupOutcome(t.outcome) === 'expired')

  const amounts = withPricing.map((t) => t.quoted_amount_cents!)
  const perPerson = withPricing
    .filter((t) => t.per_person_rate_cents !== null)
    .map((t) => t.per_person_rate_cents!)

  // By guest count bucket
  const byGuestBucket: Record<string, { amounts: number[]; per_person: number[] }> = {}
  for (const t of withPricing) {
    const bucket = guestBucket(t.guest_count)
    if (!byGuestBucket[bucket]) byGuestBucket[bucket] = { amounts: [], per_person: [] }
    byGuestBucket[bucket].amounts.push(t.quoted_amount_cents!)
    if (t.per_person_rate_cents) byGuestBucket[bucket].per_person.push(t.per_person_rate_cents)
  }

  const bucketStats: Record<string, any> = {}
  for (const [bucket, data] of Object.entries(byGuestBucket)) {
    bucketStats[bucket] = {
      count: data.amounts.length,
      avg_total_cents: avg(data.amounts),
      median_total_cents: median(data.amounts),
      avg_per_person_cents: avg(data.per_person),
      median_per_person_cents: median(data.per_person),
    }
  }

  // Cannabis premium
  const cannabisPricing = withPricing.filter((t) => t.cannabis_preference)
  const nonCannabisPricing = withPricing.filter((t) => !t.cannabis_preference)
  const cannabisAvg = avg(cannabisPricing.map((t) => t.quoted_amount_cents!))
  const nonCannabisAvg = avg(nonCannabisPricing.map((t) => t.quoted_amount_cents!))
  const cannabisPremium =
    cannabisAvg && nonCannabisAvg && nonCannabisAvg > 0
      ? Number((((cannabisAvg - nonCannabisAvg) / nonCannabisAvg) * 100).toFixed(1))
      : null

  return {
    total_with_pricing: withPricing.length,
    converted_with_pricing: convertedPricing.length,
    expired_with_pricing: expiredPricing.length,
    overall: {
      avg_total_cents: avg(amounts),
      median_total_cents: median(amounts),
      avg_per_person_cents: avg(perPerson),
      median_per_person_cents: median(perPerson),
      range_cents: amounts.length > 0 ? [Math.min(...amounts), Math.max(...amounts)] : [],
    },
    by_guest_count: bucketStats,
    cannabis_premium_percent: cannabisPremium,
    cannabis: {
      count: cannabisPricing.length,
      avg_cents: cannabisAvg,
    },
    non_cannabis: {
      count: nonCannabisPricing.length,
      avg_cents: nonCannabisAvg,
    },
  }
}

function analyzeReferralSources(threads: ThreadRecord[]) {
  const sources: Record<
    string,
    { total: number; converted: number; expired: number; declined: number }
  > = {}

  for (const t of threads) {
    const source = t.referral_source || 'unknown'
    if (!sources[source]) sources[source] = { total: 0, converted: 0, expired: 0, declined: 0 }
    sources[source].total++
    const group = groupOutcome(t.outcome)
    if (group === 'converted') sources[source].converted++
    else if (group === 'expired') sources[source].expired++
    else sources[source].declined++
  }

  const result: Record<string, any> = {}
  for (const [source, counts] of Object.entries(sources)) {
    result[source] = {
      ...counts,
      conversion_rate: rate(counts.converted, counts.total),
    }
  }
  return result
}

function analyzeDimension(
  threads: ThreadRecord[],
  predicate: (t: ThreadRecord) => boolean,
  label: string
) {
  const withField = threads.filter(predicate)
  const withoutField = threads.filter((t) => !predicate(t))

  const convertedWith = withField.filter(
    (t) => t.outcome === 'booked' || t.outcome === 'likely_booked'
  ).length
  const convertedWithout = withoutField.filter(
    (t) => t.outcome === 'booked' || t.outcome === 'likely_booked'
  ).length

  return {
    label,
    with_field: {
      total: withField.length,
      converted: convertedWith,
      rate: rate(convertedWith, withField.length),
    },
    without_field: {
      total: withoutField.length,
      converted: convertedWithout,
      rate: rate(convertedWithout, withoutField.length),
    },
    lift:
      withField.length > 0 && withoutField.length > 0
        ? Number(
            (
              (convertedWith / withField.length - convertedWithout / withoutField.length) *
              100
            ).toFixed(1)
          )
        : null,
  }
}

// ─── Lead Score Weight Derivation ───────────────────────────────────────

function deriveLeadScoreWeights(threads: ThreadRecord[]) {
  const dimensions = [
    { key: 'has_date', pred: (t: ThreadRecord) => t.event_date !== null },
    {
      key: 'has_guest_count',
      pred: (t: ThreadRecord) => t.guest_count !== null && t.guest_count > 0,
    },
    { key: 'has_budget', pred: (t: ThreadRecord) => t.budget_cents !== null && t.budget_cents > 0 },
    { key: 'has_occasion', pred: (t: ThreadRecord) => t.occasion !== null },
    { key: 'has_dietary', pred: (t: ThreadRecord) => t.dietary_restrictions.length > 0 },
    { key: 'has_cannabis', pred: (t: ThreadRecord) => t.cannabis_preference !== null },
    { key: 'has_referral', pred: (t: ThreadRecord) => t.referral_source !== null },
    { key: 'has_location', pred: (t: ThreadRecord) => t.location !== null },
    { key: 'has_pricing_quoted', pred: (t: ThreadRecord) => t.quoted_amount_cents !== null },
    { key: 'multi_message', pred: (t: ThreadRecord) => t.total_messages >= 3 },
    { key: 'airbnb_referral', pred: (t: ThreadRecord) => t.referral_source === 'airbnb_host' },
  ]

  const weights: Record<string, { weight: number; lift_pct: number; rationale: string }> = {}

  // Base conversion rate
  const totalConverted = threads.filter(
    (t) => t.outcome === 'booked' || t.outcome === 'likely_booked'
  ).length
  const baseRate = totalConverted / threads.length

  for (const dim of dimensions) {
    const analysis = analyzeDimension(threads, dim.pred, dim.key)

    // Weight = lift scaled to 0-15 range
    // Positive lift = field presence increases conversion
    const lift = analysis.lift || 0
    const absLift = Math.abs(lift)

    // Scale: 0-5% lift = 2pts, 5-15% = 5pts, 15-30% = 8pts, 30%+ = 12pts
    let weight: number
    if (absLift >= 30) weight = 12
    else if (absLift >= 15) weight = 8
    else if (absLift >= 5) weight = 5
    else weight = 2

    // Negative lift means the field hurts conversion - set weight to 0
    if (lift < 0) weight = 0

    // Bonus for fields present in most converted threads
    const withRate = analysis.with_field.rate
    if (withRate >= 0.7) weight = Math.min(weight + 3, 15)

    weights[dim.key] = {
      weight,
      lift_pct: lift,
      rationale: `${analysis.with_field.converted}/${analysis.with_field.total} converted with field (${(withRate * 100).toFixed(0)}%), lift: ${lift > 0 ? '+' : ''}${lift.toFixed(1)}%`,
    }
  }

  return weights
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  const baseDir = path.resolve(process.cwd(), 'data/email-references/generated/goldmine')
  const threadIntelPath = path.join(baseDir, 'thread-intelligence.json')
  const outboundPath = path.join(baseDir, 'outbound-patterns.json')

  if (!existsSync(threadIntelPath)) {
    console.error(`Thread intelligence file not found: ${threadIntelPath}`)
    console.error('Run: npm run email:build:goldmine:dry')
    process.exit(1)
  }

  const threadIntel: ThreadIntelligenceFile = JSON.parse(readFileSync(threadIntelPath, 'utf-8'))
  const threads = Object.values(threadIntel.threads)

  console.log(`Loaded ${threads.length} threads`)

  // ── Outcome Summary ──
  const outcomeCounts: Record<string, number> = {}
  for (const t of threads) {
    outcomeCounts[t.outcome] = (outcomeCounts[t.outcome] || 0) + 1
  }

  const booked = threads.filter((t) => t.outcome === 'booked').length
  const likelyBooked = threads.filter((t) => t.outcome === 'likely_booked').length
  const expired = threads.filter((t) => t.outcome === 'expired' || t.outcome === 'unknown').length
  const declinedClient = outcomeCounts['declined_by_client'] || 0
  const declinedChef = outcomeCounts['declined_by_chef'] || 0
  const declined = declinedClient + declinedChef

  const confirmedRate = rate(booked, threads.length - declined)
  const effectiveRate = rate(booked + likelyBooked, threads.length - declined)

  console.log(`Outcomes: ${JSON.stringify(outcomeCounts)}`)
  console.log(`Confirmed conversion: ${(confirmedRate * 100).toFixed(1)}%`)
  console.log(`Effective conversion (incl. likely): ${(effectiveRate * 100).toFixed(1)}%`)

  // ── Dimension Analysis ──
  console.log('\nAnalyzing dimensions...')

  const responseTime = analyzeResponseTime(threads)
  const messaging = analyzeMessaging(threads)
  const pricing = analyzePricing(threads)
  const referralSources = analyzeReferralSources(threads)

  // Individual field analysis
  const fieldAnalysis = {
    has_date: analyzeDimension(threads, (t) => t.event_date !== null, 'Event date mentioned'),
    has_guest_count: analyzeDimension(
      threads,
      (t) => t.guest_count !== null && t.guest_count > 0,
      'Guest count provided'
    ),
    has_occasion: analyzeDimension(threads, (t) => t.occasion !== null, 'Occasion specified'),
    has_dietary: analyzeDimension(
      threads,
      (t) => t.dietary_restrictions.length > 0,
      'Dietary restrictions mentioned'
    ),
    has_cannabis: analyzeDimension(
      threads,
      (t) => t.cannabis_preference !== null,
      'Cannabis preference'
    ),
    has_location: analyzeDimension(threads, (t) => t.location !== null, 'Location provided'),
    has_referral: analyzeDimension(
      threads,
      (t) => t.referral_source !== null,
      'Has referral source'
    ),
    has_pricing: analyzeDimension(threads, (t) => t.quoted_amount_cents !== null, 'Pricing quoted'),
  }

  // ── Lead Score Weights ──
  console.log('Deriving lead score weights...')
  const leadScoreWeights = deriveLeadScoreWeights(threads)

  // Print weights
  for (const [key, w] of Object.entries(leadScoreWeights)) {
    console.log(
      `  ${key}: weight=${w.weight}, lift=${w.lift_pct > 0 ? '+' : ''}${w.lift_pct.toFixed(1)}%`
    )
  }

  // ── Occasion Breakdown ──
  const occasionStats: Record<string, { total: number; converted: number }> = {}
  for (const t of threads) {
    const occ = t.occasion || 'unspecified'
    if (!occasionStats[occ]) occasionStats[occ] = { total: 0, converted: 0 }
    occasionStats[occ].total++
    if (t.outcome === 'booked' || t.outcome === 'likely_booked') {
      occasionStats[occ].converted++
    }
  }
  const occasionAnalysis: Record<string, any> = {}
  for (const [occ, stats] of Object.entries(occasionStats)) {
    occasionAnalysis[occ] = {
      ...stats,
      conversion_rate: rate(stats.converted, stats.total),
    }
  }

  // ── Guest Count Buckets ──
  const guestBucketStats: Record<string, { total: number; converted: number }> = {}
  for (const t of threads) {
    const bucket = guestBucket(t.guest_count)
    if (!guestBucketStats[bucket]) guestBucketStats[bucket] = { total: 0, converted: 0 }
    guestBucketStats[bucket].total++
    if (t.outcome === 'booked' || t.outcome === 'likely_booked') {
      guestBucketStats[bucket].converted++
    }
  }
  const guestAnalysis: Record<string, any> = {}
  for (const [bucket, stats] of Object.entries(guestBucketStats)) {
    guestAnalysis[bucket] = {
      ...stats,
      conversion_rate: rate(stats.converted, stats.total),
    }
  }

  // ── Response Time Targets ──
  const convertedResponseTimes = threads
    .filter(
      (t) =>
        (t.outcome === 'booked' || t.outcome === 'likely_booked') &&
        t.first_response_minutes !== null
    )
    .map((t) => t.first_response_minutes!)
    .filter((m) => m > 0)

  const responseTargets = {
    converted_avg_minutes: avg(convertedResponseTimes),
    converted_median_minutes: median(convertedResponseTimes),
    converted_p90_minutes:
      convertedResponseTimes.length > 0
        ? convertedResponseTimes.sort((a, b) => a - b)[
            Math.floor(convertedResponseTimes.length * 0.9)
          ]
        : null,
    recommendation:
      responseTime.response_windows
        .filter((w) => w.total >= 2)
        .sort((a, b) => b.conversion_rate - a.conversion_rate)[0]?.window || 'N/A',
  }

  // ── Build Output ──
  const output = {
    generated_at: new Date().toISOString(),
    dataset: {
      total_threads: threads.length,
      booked,
      likely_booked: likelyBooked,
      expired,
      declined_by_client: declinedClient,
      declined_by_chef: declinedChef,
    },
    conversion_rates: {
      confirmed_only: confirmedRate,
      including_likely: effectiveRate,
      base_rate_all_threads: rate(booked + likelyBooked, threads.length),
    },
    dimension_analysis: {
      response_time: responseTime,
      messaging,
      pricing,
      referral_sources: referralSources,
      field_presence: fieldAnalysis,
      occasion: occasionAnalysis,
      guest_count_buckets: guestAnalysis,
    },
    lead_score_weights: leadScoreWeights,
    pricing_benchmarks: {
      overall: pricing.overall,
      by_guest_count: pricing.by_guest_count,
      cannabis_premium_percent: pricing.cannabis_premium_percent,
    },
    response_time_targets: responseTargets,
  }

  // ── Write Output ──
  const outputPath = path.join(baseDir, 'conversion-intelligence.json')
  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nConversion intelligence written to: ${outputPath}`)

  // ── Print Summary ──
  console.log('\n═══ GOLDMINE Conversion Intelligence ═══')
  console.log(
    `Threads: ${threads.length} | Booked: ${booked} | Likely booked: ${likelyBooked} | Expired: ${expired} | Declined: ${declined}`
  )
  console.log(
    `Confirmed conversion: ${(confirmedRate * 100).toFixed(1)}% | Effective: ${(effectiveRate * 100).toFixed(1)}%`
  )
  console.log(
    `\nPricing: avg $${((pricing.overall.avg_total_cents || 0) / 100).toFixed(0)} | median $${((pricing.overall.median_total_cents || 0) / 100).toFixed(0)} | per-person avg $${((pricing.overall.avg_per_person_cents || 0) / 100).toFixed(0)}`
  )
  console.log(
    `Response: converted avg ${responseTargets.converted_avg_minutes ?? 'N/A'} min | median ${responseTargets.converted_median_minutes ?? 'N/A'} min`
  )
  console.log(`\nTop lead score factors:`)
  const sortedWeights = Object.entries(leadScoreWeights).sort((a, b) => b[1].weight - a[1].weight)
  for (const [key, w] of sortedWeights.slice(0, 8)) {
    console.log(`  ${w.weight}pts - ${key} (${w.rationale})`)
  }
}

main()
