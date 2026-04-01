// Public Review Showcase - displays unified reviews and stats on chef profile
// No authentication required. Shows consented reviews from all platforms.
'use client'

import { useState } from 'react'
import { Star, ChevronDown, ExternalLink } from '@/components/ui/icons'
import type { PublicReviewItem, PublicReviewStats } from '@/lib/reviews/public-actions'

// ── Star Display ──

function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const rounded = Math.round(rating * 2) / 2 // round to nearest 0.5
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4.5 h-4.5'

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rounded)
        const half = !filled && star === Math.ceil(rounded) && rounded % 1 !== 0

        return (
          <svg
            key={star}
            className={`${sizeClass} ${filled || half ? 'text-amber-400' : 'text-stone-600'}`}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={half ? 0 : filled ? 0 : 1.5}
          >
            {half ? (
              <>
                <defs>
                  <clipPath id={`half-${star}`}>
                    <rect x="0" y="0" width="12" height="24" />
                  </clipPath>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="currentColor"
                  clipPath={`url(#half-${star})`}
                />
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </>
            ) : (
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? 'currentColor' : 'none'}
                stroke={filled ? 'none' : 'currentColor'}
                strokeWidth={filled ? 0 : 1.5}
              />
            )}
          </svg>
        )
      })}
    </div>
  )
}

// ── Stats Header ──

function ReviewStatsHeader({ stats }: { stats: PublicReviewStats }) {
  if (stats.totalReviews === 0) return null

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <Stars rating={stats.averageRating} size="lg" />
        <span className="text-3xl font-bold text-stone-100">{stats.averageRating.toFixed(1)}</span>
      </div>
      <p className="text-stone-400">
        {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'} across{' '}
        {stats.platformBreakdown.length}{' '}
        {stats.platformBreakdown.length === 1 ? 'platform' : 'platforms'}
      </p>

      {stats.platformBreakdown.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {stats.platformBreakdown.map((p) => (
            <span
              key={p.platform}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-800 text-stone-300 border border-stone-700"
            >
              {p.platform}
              <span className="text-stone-500">
                {p.count} &middot; {p.avgRating > 0 ? `${p.avgRating.toFixed(1)}★` : '--'}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Individual Review Card ──

function ReviewCard({ review }: { review: PublicReviewItem }) {
  const dateLabel = formatReviewDate(review.reviewDate)

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        review.isFeatured
          ? 'border-amber-700/50 bg-amber-950/20'
          : 'border-stone-700/50 bg-stone-800/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-stone-200 truncate">{review.reviewerName}</p>
            {review.isFeatured && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xxs font-semibold uppercase tracking-wider text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                Featured
              </span>
            )}
          </div>
          {dateLabel && <p className="text-xs text-stone-500 mt-0.5">{dateLabel}</p>}
        </div>

        <span className="flex-shrink-0 text-xs font-medium text-stone-500 bg-stone-800 border border-stone-700 rounded-full px-2.5 py-0.5">
          {review.sourceLabel}
        </span>
      </div>

      {review.rating !== null && (
        <div className="mb-2">
          <Stars rating={review.rating} size="sm" />
        </div>
      )}

      <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
        {review.reviewText}
      </p>

      {review.sourceUrl && (
        <a
          href={review.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 mt-3"
        >
          <ExternalLink className="w-3 h-3" />
          View on {review.sourceLabel}
        </a>
      )}
    </div>
  )
}

// ── Date Formatting ──

function formatReviewDate(dateStr: string): string | null {
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ── Main Component ──

const INITIAL_SHOW_COUNT = 6

export function ReviewShowcase({
  reviews,
  stats,
  compact = false,
  maxCompact = 2,
}: {
  reviews: PublicReviewItem[]
  stats: PublicReviewStats
  /** When true, shows a reduced card count with no stats header - for sidebar/inquiry contexts. */
  compact?: boolean
  /** How many cards to show in compact mode. Defaults to 2. */
  maxCompact?: number
}) {
  const [showAll, setShowAll] = useState(false)

  if (reviews.length === 0) return null

  if (compact) {
    const compactReviews = reviews.slice(0, maxCompact)
    return (
      <div className="space-y-3">
        {compactReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    )
  }

  const visibleReviews = showAll ? reviews : reviews.slice(0, INITIAL_SHOW_COUNT)
  const hasMore = reviews.length > INITIAL_SHOW_COUNT

  return (
    <div>
      <ReviewStatsHeader stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {hasMore && !showAll && (
        <div className="text-center mt-6">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-stone-300 bg-stone-800 border border-stone-700 rounded-lg hover:bg-stone-700 transition-colors"
          >
            View all {reviews.length} reviews
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
