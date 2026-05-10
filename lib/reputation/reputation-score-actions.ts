'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { subMonths, startOfMonth, format } from 'date-fns'

// ─── Weights ────────────────────────────────────────────────────

const WEIGHTS = {
  internalReviews: 0.35,
  guestTestimonials: 0.25,
  externalReviews: 0.2,
  surveys: 0.15,
  mentionSentiment: 0.05,
} as const

// ─── Types ──────────────────────────────────────────────────────

type SourceBreakdown = {
  avg: number
  count: number
  weight: number
}

type MentionBreakdown = {
  positiveRate: number
  count: number
  weight: number
}

export type AggregateReputationScore = {
  overallScore: number
  totalDataPoints: number
  breakdown: {
    internalReviews: SourceBreakdown
    guestTestimonials: SourceBreakdown
    externalReviews: SourceBreakdown
    surveys: SourceBreakdown
    mentionSentiment: MentionBreakdown
  }
  confidence: 'low' | 'medium' | 'high'
}

export type ReputationTrendMonth = {
  month: string
  score: number | null
  reviewCount: number
  sources: string[]
}

export type UnrespondedItem = {
  id: string
  type: string
  clientName: string
  rating: number
  excerpt: string
  createdAt: string
}

export type UnrespondedItems = {
  unrespondedReviews: UnrespondedItem[]
  unreviewedMentions: number
  totalNeedingAttention: number
}

export type ReputationDashboard = {
  score: AggregateReputationScore
  trend: ReputationTrendMonth[]
  needsAttention: UnrespondedItems
  highlights: {
    bestMonth: string | null
    worstMonth: string | null
    improvingTrend: boolean
    topStrength: string | null
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function safeAvg(ratings: number[]): number {
  if (ratings.length === 0) return 0
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
}

function toConfidence(total: number): 'low' | 'medium' | 'high' {
  if (total < 5) return 'low'
  if (total <= 20) return 'medium'
  return 'high'
}

function positiveRateToScore(rate: number): number {
  return rate * 5
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

// ─── 1. getAggregateReputationScore ─────────────────────────────

export async function getAggregateReputationScore(): Promise<AggregateReputationScore> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Fetch all sources in parallel
  const [internalResult, testimonialResult, externalResult, surveyResult, mentionResult] =
    await Promise.all([
      // Internal reviews (client_reviews)
      db.from('client_reviews').select('rating').eq('tenant_id', tenantId),

      // Guest testimonials
      db.from('guest_testimonials').select('rating').eq('tenant_id', tenantId),

      // External reviews (wrapped for schema safety)
      db
        .from('external_reviews')
        .select('rating')
        .eq('tenant_id', tenantId)
        .then((res: any) => res)
        .catch(() => ({ data: null, error: { message: 'table not found' } })),

      // Post-event surveys
      db
        .from('post_event_surveys')
        .select('overall')
        .eq('tenant_id', tenantId)
        .not('completed_at', 'is', null)
        .then((res: any) => res)
        .catch(() => ({ data: null, error: { message: 'table not found' } })),

      // Brand mentions
      db.from('chef_brand_mentions').select('sentiment').eq('tenant_id', tenantId),
    ])

  // Internal reviews
  const internalRatings: number[] = []
  if (!internalResult.error && internalResult.data) {
    for (const row of internalResult.data) {
      const r = Number(row.rating)
      if (Number.isFinite(r) && r > 0) internalRatings.push(r)
    }
  } else if (internalResult.error) {
    console.error('[getAggregateReputationScore] client_reviews error:', internalResult.error)
  }

  // Guest testimonials
  const testimonialRatings: number[] = []
  if (!testimonialResult.error && testimonialResult.data) {
    for (const row of testimonialResult.data) {
      const r = Number(row.rating)
      if (Number.isFinite(r) && r > 0) testimonialRatings.push(r)
    }
  } else if (testimonialResult.error) {
    console.error(
      '[getAggregateReputationScore] guest_testimonials error:',
      testimonialResult.error
    )
  }

  // External reviews
  const externalRatings: number[] = []
  if (!externalResult.error && externalResult.data) {
    for (const row of externalResult.data) {
      const r = Number(row.rating)
      if (Number.isFinite(r) && r > 0) externalRatings.push(r)
    }
  } else if (externalResult.error) {
    console.error('[getAggregateReputationScore] external_reviews error:', externalResult.error)
  }

  // Surveys
  const surveyRatings: number[] = []
  if (!surveyResult.error && surveyResult.data) {
    for (const row of surveyResult.data) {
      const r = Number(row.overall)
      if (Number.isFinite(r) && r > 0) surveyRatings.push(r)
    }
  } else if (surveyResult.error) {
    console.error('[getAggregateReputationScore] post_event_surveys error:', surveyResult.error)
  }

  // Mentions
  let mentionTotal = 0
  let mentionPositive = 0
  if (!mentionResult.error && mentionResult.data) {
    mentionTotal = mentionResult.data.length
    mentionPositive = mentionResult.data.filter((row: any) => row.sentiment === 'positive').length
  } else if (mentionResult.error) {
    console.error('[getAggregateReputationScore] chef_brand_mentions error:', mentionResult.error)
  }

  const positiveRate = mentionTotal > 0 ? mentionPositive / mentionTotal : 0

  // Build breakdown
  const breakdown = {
    internalReviews: {
      avg: safeAvg(internalRatings),
      count: internalRatings.length,
      weight: WEIGHTS.internalReviews,
    },
    guestTestimonials: {
      avg: safeAvg(testimonialRatings),
      count: testimonialRatings.length,
      weight: WEIGHTS.guestTestimonials,
    },
    externalReviews: {
      avg: safeAvg(externalRatings),
      count: externalRatings.length,
      weight: WEIGHTS.externalReviews,
    },
    surveys: {
      avg: safeAvg(surveyRatings),
      count: surveyRatings.length,
      weight: WEIGHTS.surveys,
    },
    mentionSentiment: {
      positiveRate,
      count: mentionTotal,
      weight: WEIGHTS.mentionSentiment,
    },
  }

  // Weighted average: only include sources that have data
  let weightedSum = 0
  let weightTotal = 0

  if (breakdown.internalReviews.count > 0) {
    weightedSum += breakdown.internalReviews.avg * breakdown.internalReviews.weight
    weightTotal += breakdown.internalReviews.weight
  }
  if (breakdown.guestTestimonials.count > 0) {
    weightedSum += breakdown.guestTestimonials.avg * breakdown.guestTestimonials.weight
    weightTotal += breakdown.guestTestimonials.weight
  }
  if (breakdown.externalReviews.count > 0) {
    weightedSum += breakdown.externalReviews.avg * breakdown.externalReviews.weight
    weightTotal += breakdown.externalReviews.weight
  }
  if (breakdown.surveys.count > 0) {
    weightedSum += breakdown.surveys.avg * breakdown.surveys.weight
    weightTotal += breakdown.surveys.weight
  }
  if (breakdown.mentionSentiment.count > 0) {
    weightedSum += positiveRateToScore(positiveRate) * breakdown.mentionSentiment.weight
    weightTotal += breakdown.mentionSentiment.weight
  }

  const overallScore = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : 0

  const totalDataPoints =
    internalRatings.length +
    testimonialRatings.length +
    externalRatings.length +
    surveyRatings.length +
    mentionTotal

  return {
    overallScore,
    totalDataPoints,
    breakdown,
    confidence: toConfidence(totalDataPoints),
  }
}

// ─── 2. getReputationTrend ──────────────────────────────────────

export async function getReputationTrend(months: number = 6): Promise<ReputationTrendMonth[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const now = new Date()
  const cutoff = startOfMonth(subMonths(now, months - 1))
  const cutoffIso = cutoff.toISOString()

  // Fetch all sources with dates, in parallel
  const [internalResult, testimonialResult, externalResult, surveyResult] = await Promise.all([
    db
      .from('client_reviews')
      .select('rating, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', cutoffIso),

    db
      .from('guest_testimonials')
      .select('rating, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', cutoffIso),

    db
      .from('external_reviews')
      .select('rating, review_date, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', cutoffIso)
      .then((res: any) => res)
      .catch(() => ({ data: null, error: true })),

    db
      .from('post_event_surveys')
      .select('overall, completed_at')
      .eq('tenant_id', tenantId)
      .not('completed_at', 'is', null)
      .gte('completed_at', cutoffIso)
      .then((res: any) => res)
      .catch(() => ({ data: null, error: true })),
  ])

  // Build month buckets
  type MonthBucket = {
    ratings: number[]
    sources: Set<string>
  }
  const buckets = new Map<string, MonthBucket>()

  // Initialize all month slots
  for (let i = 0; i < months; i++) {
    const monthDate = startOfMonth(subMonths(now, months - 1 - i))
    const key = format(monthDate, 'yyyy-MM')
    buckets.set(key, { ratings: [], sources: new Set() })
  }

  function addToBucket(dateStr: string | null, rating: number, source: string) {
    if (!dateStr) return
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return
    const key = format(parsed, 'yyyy-MM')
    const bucket = buckets.get(key)
    if (!bucket) return
    if (Number.isFinite(rating) && rating > 0) {
      bucket.ratings.push(rating)
      bucket.sources.add(source)
    }
  }

  // Internal reviews
  if (!internalResult.error && internalResult.data) {
    for (const row of internalResult.data) {
      addToBucket(row.created_at, Number(row.rating), 'internal_reviews')
    }
  }

  // Guest testimonials
  if (!testimonialResult.error && testimonialResult.data) {
    for (const row of testimonialResult.data) {
      addToBucket(row.created_at, Number(row.rating), 'guest_testimonials')
    }
  }

  // External reviews
  if (!externalResult.error && externalResult.data) {
    for (const row of externalResult.data) {
      const dateField = row.review_date || row.created_at
      addToBucket(dateField, Number(row.rating), 'external_reviews')
    }
  }

  // Surveys
  if (!surveyResult.error && surveyResult.data) {
    for (const row of surveyResult.data) {
      addToBucket(row.completed_at, Number(row.overall), 'surveys')
    }
  }

  const result: ReputationTrendMonth[] = []
  buckets.forEach((bucket, month) => {
    result.push({
      month,
      score: bucket.ratings.length > 0 ? Math.round(safeAvg(bucket.ratings) * 100) / 100 : null,
      reviewCount: bucket.ratings.length,
      sources: Array.from(bucket.sources),
    })
  })

  return result
}

// ─── 3. getUnrespondedItems ─────────────────────────────────────

export async function getUnrespondedItems(): Promise<UnrespondedItems> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const thirtyDaysAgo = subMonths(new Date(), 1).toISOString()

  // Fetch low-rated recent reviews and unreviewed mention count in parallel
  const [reviewsResult, mentionCountResult] = await Promise.all([
    db
      .from('client_reviews')
      .select(
        'id, rating, what_could_improve, feedback_text, created_at, client:clients(full_name)'
      )
      .eq('tenant_id', tenantId)
      .lte('rating', 3)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false }),

    db
      .from('chef_brand_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_reviewed', false),
  ])

  const unrespondedReviews: UnrespondedItem[] = []
  if (!reviewsResult.error && reviewsResult.data) {
    for (const row of reviewsResult.data) {
      const excerptSource = row.what_could_improve || row.feedback_text || ''
      unrespondedReviews.push({
        id: row.id,
        type: 'client_review',
        clientName: row.client?.full_name ?? 'Unknown client',
        rating: Number(row.rating),
        excerpt: truncate(excerptSource, 120),
        createdAt: row.created_at,
      })
    }
  } else if (reviewsResult.error) {
    console.error('[getUnrespondedItems] client_reviews error:', reviewsResult.error)
  }

  let unreviewedMentions = 0
  if (!mentionCountResult.error) {
    unreviewedMentions = mentionCountResult.count ?? 0
  } else {
    console.error('[getUnrespondedItems] chef_brand_mentions error:', mentionCountResult.error)
  }

  return {
    unrespondedReviews,
    unreviewedMentions,
    totalNeedingAttention: unrespondedReviews.length + unreviewedMentions,
  }
}

// ─── 4. getReputationDashboard ──────────────────────────────────

export async function getReputationDashboard(): Promise<ReputationDashboard> {
  const [score, trend, needsAttention] = await Promise.all([
    getAggregateReputationScore(),
    getReputationTrend(),
    getUnrespondedItems(),
  ])

  // Compute highlights from trend data
  let bestMonth: string | null = null
  let worstMonth: string | null = null
  let bestScore = -1
  let worstScore = 6

  const scoredMonths = trend.filter((m) => m.score !== null)

  for (const m of scoredMonths) {
    if (m.score! > bestScore) {
      bestScore = m.score!
      bestMonth = m.month
    }
    if (m.score! < worstScore) {
      worstScore = m.score!
      worstMonth = m.month
    }
  }

  // Improving trend: compare the last two scored months
  let improvingTrend = false
  if (scoredMonths.length >= 2) {
    const last = scoredMonths[scoredMonths.length - 1]
    const prev = scoredMonths[scoredMonths.length - 2]
    if (last.score !== null && prev.score !== null) {
      improvingTrend = last.score > prev.score
    }
  }

  // Top strength: find highest-rated sub-rating from surveys
  let topStrength: string | null = null
  try {
    const chef = await requireChef()
    const tenantId = chef.tenantId!
    const db: any = createServerClient()

    const { data: surveyRows, error: surveyError } = await db
      .from('post_event_surveys')
      .select('food_quality, communication_rating, presentation, punctuality, cleanup')
      .eq('tenant_id', tenantId)
      .not('completed_at', 'is', null)

    if (!surveyError && surveyRows && surveyRows.length > 0) {
      const categories: { key: string; label: string }[] = [
        { key: 'food_quality', label: 'food_quality' },
        { key: 'communication_rating', label: 'communication' },
        { key: 'presentation', label: 'presentation' },
        { key: 'punctuality', label: 'punctuality' },
        { key: 'cleanup', label: 'cleanup' },
      ]

      let highestAvg = -1

      for (const cat of categories) {
        const vals: number[] = []
        for (const row of surveyRows) {
          const v = Number(row[cat.key])
          if (Number.isFinite(v) && v > 0) vals.push(v)
        }
        if (vals.length > 0) {
          const avg = safeAvg(vals)
          if (avg > highestAvg) {
            highestAvg = avg
            topStrength = cat.label
          }
        }
      }
    }
  } catch (err) {
    console.error('[getReputationDashboard] topStrength error:', err)
  }

  return {
    score,
    trend,
    needsAttention,
    highlights: {
      bestMonth,
      worstMonth,
      improvingTrend,
      topStrength,
    },
  }
}
