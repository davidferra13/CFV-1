// Reputation Hub Page
// Central hub linking to brand mentions, client reviews, and feedback.
// Hero section shows aggregate reputation score, growth loop health, and
// attention items. Stats stream in via Suspense so tiles render immediately.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getAggregateReputationScore,
  getUnrespondedItems,
} from '@/lib/reputation/reputation-score-actions'
import { getGrowthLoopHealth } from '@/lib/growth/actions'
import { getChefReviewStats } from '@/lib/reviews/actions'
import { getUnreviewedCount } from '@/lib/reputation/mention-actions'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Reputation' }

// ---------------------------------------------------------------------------
// Types for new data sources (defined inline; modules may not exist yet)
// ---------------------------------------------------------------------------

type ReputationScore = {
  overallScore: number
  totalDataPoints: number
  breakdown: {
    internalReviews: { avg: number; count: number; weight: number }
    guestTestimonials: { avg: number; count: number; weight: number }
    externalReviews: { avg: number; count: number; weight: number }
    surveys: { avg: number; count: number; weight: number }
    mentionSentiment: { positiveRate: number; count: number; weight: number }
  }
  confidence: 'low' | 'medium' | 'high'
}

type GrowthLoopHealth = {
  completedEventsLast90Days: number
  reviewsCollectedLast90Days: number
  reviewCollectionRate: number
  testimonialApprovalRate: number
  campaignsSentLast90Days: number
  avgCampaignOpenRate: number | null
  loopScore: number
}

type UnrespondedItems = {
  unrespondedReviews: {
    id: string
    rating: number
    clientName: string
    excerpt: string
    createdAt: string
  }[]
  unreviewedMentions: number
  totalNeedingAttention: number
}

// ---------------------------------------------------------------------------
// Stars renderer
// ---------------------------------------------------------------------------

function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  const full = Math.floor(rating)
  const partial = rating - full
  const empty = 5 - full - (partial > 0 ? 1 : 0)

  return (
    <span
      className={`inline-flex gap-0.5 ${className}`}
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="text-amber-400">
          ★
        </span>
      ))}
      {partial > 0 && (
        <span className="relative">
          <span className="text-stone-600">★</span>
          <span
            className="absolute inset-0 overflow-hidden text-amber-400"
            style={{ width: `${Math.round(partial * 100)}%` }}
          >
            ★
          </span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="text-stone-600">
          ★
        </span>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Confidence badge
// ---------------------------------------------------------------------------

const confidenceColors: Record<string, string> = {
  low: 'text-stone-400 bg-stone-700/50',
  medium: 'text-amber-400 bg-amber-900/30',
  high: 'text-emerald-400 bg-emerald-900/30',
}

function ConfidenceBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const label = level.charAt(0).toUpperCase() + level.slice(1)
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceColors[level]}`}>
      {label} confidence
    </span>
  )
}

// ---------------------------------------------------------------------------
// Source breakdown bar
// ---------------------------------------------------------------------------

type SourceStat = { label: string; avg: number; count: number; color: string }

function SourceBreakdown({ sources }: { sources: SourceStat[] }) {
  const maxAvg = 5
  return (
    <div className="grid gap-2">
      {sources
        .filter((s) => s.count > 0)
        .map((src) => (
          <div key={src.label} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 text-stone-400 truncate">{src.label}</span>
            <div className="flex-1 h-2 rounded-full bg-stone-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${src.color}`}
                style={{ width: `${(src.avg / maxAvg) * 100}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-stone-500 text-xs">
              {src.avg.toFixed(1)} avg ({src.count})
            </span>
          </div>
        ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reputation Score Card (async, streamed)
// ---------------------------------------------------------------------------

async function ReputationScoreCard() {
  const score = await getAggregateReputationScore().catch(
    (): ReputationScore => ({
      overallScore: 0,
      totalDataPoints: 0,
      breakdown: {
        internalReviews: { avg: 0, count: 0, weight: 0 },
        guestTestimonials: { avg: 0, count: 0, weight: 0 },
        externalReviews: { avg: 0, count: 0, weight: 0 },
        surveys: { avg: 0, count: 0, weight: 0 },
        mentionSentiment: { positiveRate: 0, count: 0, weight: 0 },
      },
      confidence: 'low',
    })
  )

  if (score.totalDataPoints === 0) {
    return (
      <Card className="border-stone-700/40">
        <CardContent className="py-6 text-center">
          <p className="text-stone-500">
            No reputation data yet. Collect reviews and feedback to see your score.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { breakdown } = score
  const sourceCount = [
    breakdown.internalReviews.count,
    breakdown.guestTestimonials.count,
    breakdown.externalReviews.count,
    breakdown.surveys.count,
    breakdown.mentionSentiment.count,
  ].filter((c) => c > 0).length

  const sources: SourceStat[] = [
    {
      label: 'Internal Reviews',
      avg: breakdown.internalReviews.avg,
      count: breakdown.internalReviews.count,
      color: 'bg-purple-500',
    },
    {
      label: 'Guest Testimonials',
      avg: breakdown.guestTestimonials.avg,
      count: breakdown.guestTestimonials.count,
      color: 'bg-sky-500',
    },
    {
      label: 'External Reviews',
      avg: breakdown.externalReviews.avg,
      count: breakdown.externalReviews.count,
      color: 'bg-amber-500',
    },
    {
      label: 'Surveys',
      avg: breakdown.surveys.avg,
      count: breakdown.surveys.count,
      color: 'bg-emerald-500',
    },
  ]

  return (
    <Card className="border-stone-700/40 overflow-hidden">
      <CardContent className="py-6 space-y-5">
        {/* Score headline */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl font-bold text-stone-100 tabular-nums">
              {score.overallScore.toFixed(1)}
            </span>
            <div className="space-y-1">
              <Stars rating={score.overallScore} className="text-xl" />
              <ConfidenceBadge level={score.confidence} />
            </div>
          </div>
          <p className="text-sm text-stone-500 sm:ml-auto">
            Based on {score.totalDataPoints} data points across {sourceCount}{' '}
            {sourceCount === 1 ? 'source' : 'sources'}
          </p>
        </div>

        {/* Source breakdown */}
        <SourceBreakdown sources={sources} />

        {/* Mention sentiment (separate display since it's not a 1-5 scale) */}
        {breakdown.mentionSentiment.count > 0 && (
          <div className="flex items-center gap-3 text-sm pt-1 border-t border-stone-700/30">
            <span className="w-36 shrink-0 text-stone-400">Mention Sentiment</span>
            <div className="flex-1 h-2 rounded-full bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${breakdown.mentionSentiment.positiveRate * 100}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-stone-500 text-xs">
              {Math.round(breakdown.mentionSentiment.positiveRate * 100)}% positive (
              {breakdown.mentionSentiment.count})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReputationScoreSkeleton() {
  return (
    <Card className="border-stone-700/40">
      <CardContent className="py-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-16 rounded-lg bg-stone-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-stone-800 animate-pulse" />
            <div className="h-4 w-24 rounded bg-stone-800 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-36 rounded bg-stone-800 animate-pulse" />
              <div className="flex-1 h-2 rounded-full bg-stone-800 animate-pulse" />
              <div className="h-3 w-20 rounded bg-stone-800 animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Needs Attention Card (async, streamed)
// ---------------------------------------------------------------------------

async function NeedsAttentionCard() {
  const items = await getUnrespondedItems().catch(
    (): UnrespondedItems => ({
      unrespondedReviews: [],
      unreviewedMentions: 0,
      totalNeedingAttention: 0,
    })
  )

  if (items.totalNeedingAttention === 0) return null

  const lowRatedCount = items.unrespondedReviews.length
  const parts: string[] = []
  if (lowRatedCount > 0) {
    parts.push(`${lowRatedCount} low-rated ${lowRatedCount === 1 ? 'review' : 'reviews'}`)
  }
  if (items.unreviewedMentions > 0) {
    parts.push(
      `${items.unreviewedMentions} unreviewed ${items.unreviewedMentions === 1 ? 'mention' : 'mentions'}`
    )
  }

  return (
    <Card className="border-amber-700/40 bg-amber-950/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-lg shrink-0">&#9888;</span>
          <div>
            <p className="text-sm font-medium text-stone-100">
              {items.totalNeedingAttention}{' '}
              {items.totalNeedingAttention === 1 ? 'item needs' : 'items need'} your attention
            </p>
            {parts.length > 0 && (
              <p className="text-xs text-stone-500 mt-0.5">{parts.join(' \u00b7 ')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NeedsAttentionSkeleton() {
  return (
    <Card className="border-stone-700/40">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-stone-800 animate-pulse" />
          <div className="h-4 w-48 rounded bg-stone-800 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Growth Loop Health Card (async, streamed)
// ---------------------------------------------------------------------------

async function GrowthLoopCard() {
  const health = await getGrowthLoopHealth().catch(
    (): GrowthLoopHealth => ({
      completedEventsLast90Days: 0,
      reviewsCollectedLast90Days: 0,
      reviewCollectionRate: 0,
      testimonialApprovalRate: 0,
      campaignsSentLast90Days: 0,
      avgCampaignOpenRate: null,
      loopScore: 0,
    })
  )

  if (health.completedEventsLast90Days === 0 && health.loopScore === 0) {
    return null
  }

  const scoreColor =
    health.loopScore >= 70
      ? 'text-emerald-400'
      : health.loopScore >= 40
        ? 'text-amber-400'
        : 'text-stone-400'

  const scoreBg =
    health.loopScore >= 70
      ? 'bg-emerald-500'
      : health.loopScore >= 40
        ? 'bg-amber-500'
        : 'bg-stone-500'

  const steps = [
    { label: 'Events', value: String(health.completedEventsLast90Days) },
    { label: 'Reviews', value: `${Math.round(health.reviewCollectionRate * 100)}%` },
    { label: 'Approved', value: `${Math.round(health.testimonialApprovalRate * 100)}%` },
    { label: 'Campaigns', value: String(health.campaignsSentLast90Days) },
  ]

  return (
    <Card className="border-stone-700/40">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-400">Growth Loop Health</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
                {health.loopScore}
              </span>
              <span className="text-sm text-stone-500">/ 100</span>
            </div>
          </div>
          {/* Score bar */}
          <div className="w-32 space-y-1">
            <div className="h-2 rounded-full bg-stone-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreBg} transition-all`}
                style={{ width: `${Math.min(health.loopScore, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-600 text-right">Last 90 days</p>
          </div>
        </div>

        {/* Funnel steps */}
        <div className="flex items-center gap-1 text-xs">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-stone-600 px-1">&rarr;</span>}
              <div className="rounded-md bg-stone-800/60 border border-stone-700/40 px-2.5 py-1.5 text-center">
                <p className="font-semibold text-stone-100 tabular-nums">{step.value}</p>
                <p className="text-stone-500 mt-0.5">{step.label}</p>
              </div>
            </div>
          ))}
        </div>

        {health.avgCampaignOpenRate !== null && (
          <p className="text-xs text-stone-500">
            Avg campaign open rate: {Math.round(health.avgCampaignOpenRate * 100)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function GrowthLoopSkeleton() {
  return (
    <Card className="border-stone-700/40">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-stone-800 animate-pulse" />
            <div className="h-8 w-16 rounded bg-stone-800 animate-pulse" />
          </div>
          <div className="h-2 w-32 rounded-full bg-stone-800 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 flex-1 rounded-md bg-stone-800 animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Tile config
// ---------------------------------------------------------------------------

type TileConfig = {
  href: string
  label: string
  description: string
  icon: string
  statKey: 'mentions' | 'reviews' | null
  gradient: string
  accentBorder: string
}

const tiles: TileConfig[] = [
  {
    href: '/reputation/mentions',
    label: 'Brand Mentions',
    description: 'Monitor where your name appears online and respond to reviews',
    icon: '🔔',
    statKey: 'mentions',
    gradient: 'from-amber-950/40 via-stone-900/20 to-stone-900/0',
    accentBorder: 'hover:border-amber-700/40',
  },
  {
    href: '/reviews',
    label: 'Client Reviews',
    description: 'Unified feed of internal and external reviews with ratings',
    icon: '⭐',
    statKey: 'reviews',
    gradient: 'from-purple-950/30 via-stone-900/20 to-stone-900/0',
    accentBorder: 'hover:border-purple-700/40',
  },
  {
    href: '/feedback/requests',
    label: 'Feedback Requests',
    description: 'Manage outbound review requests sent to clients',
    icon: '📩',
    statKey: null,
    gradient: 'from-sky-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-sky-700/40',
  },
  {
    href: '/feedback/dashboard',
    label: 'Feedback Dashboard',
    description: 'Trends, sentiment breakdown, and response rates',
    icon: '📊',
    statKey: null,
    gradient: 'from-emerald-950/30 via-stone-900/10 to-stone-900/0',
    accentBorder: 'hover:border-emerald-700/40',
  },
]

// ---------------------------------------------------------------------------
// Feature tile component
// ---------------------------------------------------------------------------

function FeatureTile({
  tile,
  stat,
}: {
  tile: TileConfig
  stat?: { value: string; label: string } | null
}) {
  return (
    <Link href={tile.href} className="group block h-full">
      <Card
        interactive
        className={`h-full relative overflow-hidden transition-all duration-200 ${tile.accentBorder}`}
      >
        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
        />

        <CardContent className="relative z-10 pt-5 pb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{tile.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-stone-100 group-hover:text-brand-400 transition-colors">
                {tile.label}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">{tile.description}</p>

              {/* Stat badge */}
              {stat && (
                <div className="mt-3 inline-flex items-baseline gap-1.5 rounded-lg bg-stone-800/60 px-3 py-1.5 border border-stone-700/40">
                  <span className="text-lg font-bold text-stone-100">{stat.value}</span>
                  <span className="text-xs text-stone-500">{stat.label}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Corner decoration */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors duration-300" />
      </Card>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Stats-integrated tiles (streamed via Suspense)
// ---------------------------------------------------------------------------

async function TilesWithStats() {
  const [reviewStats, unreviewedMentions] = await Promise.all([
    getChefReviewStats().catch(() => ({ total: 0, averageRating: 0 })),
    getUnreviewedCount().catch(() => 0),
  ])

  const statsMap: Record<'mentions' | 'reviews', { value: string; label: string }> = {
    mentions: {
      value: String(unreviewedMentions),
      label: unreviewedMentions === 1 ? 'unreviewed' : 'unreviewed',
    },
    reviews: {
      value: reviewStats.total > 0 ? `${reviewStats.averageRating.toFixed(1)}` : '0',
      label: reviewStats.total > 0 ? `avg across ${reviewStats.total} reviews` : 'reviews',
    },
  }

  return (
    <>
      {tiles.map((tile) => (
        <FeatureTile
          key={tile.href}
          tile={tile}
          stat={tile.statKey ? statsMap[tile.statKey] : null}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Skeleton tiles for Suspense fallback
// ---------------------------------------------------------------------------

function TileSkeletons() {
  return (
    <>
      {tiles.map((tile) => (
        <FeatureTile key={tile.href} tile={tile} stat={tile.statKey ? undefined : null} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReputationHubPage() {
  await requireChef()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Reputation</h1>
        <p className="text-stone-500 mt-1">
          Reviews, brand mentions, and client feedback in one place
        </p>
      </div>

      {/* Hero: Reputation Score */}
      <Suspense fallback={<ReputationScoreSkeleton />}>
        <ReputationScoreCard />
      </Suspense>

      {/* Needs Attention alert */}
      <Suspense fallback={<NeedsAttentionSkeleton />}>
        <NeedsAttentionCard />
      </Suspense>

      {/* Growth Loop Health */}
      <Suspense fallback={<GrowthLoopSkeleton />}>
        <GrowthLoopCard />
      </Suspense>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Suspense fallback={<TileSkeletons />}>
          <TilesWithStats />
        </Suspense>
      </div>
    </div>
  )
}
