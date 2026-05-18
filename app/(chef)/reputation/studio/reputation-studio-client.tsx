'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type {
  ReputationOverview,
  ReviewEntry,
  TestimonialEntry,
  SocialProofConfig,
} from '@/lib/social/reputation-studio-types'
import {
  respondToReview,
  featureTestimonial,
  unfeatureTestimonial,
  updateSocialProofConfig,
} from '@/lib/social/reputation-studio-actions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function RatingDots({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            i < rating ? 'bg-amber-400' : 'bg-stone-600'
          }`}
        />
      ))}
    </span>
  )
}

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  if (direction === 'up') return <span className="text-green-400">&#9650;</span>
  if (direction === 'down') return <span className="text-red-400">&#9660;</span>
  return <span className="text-stone-500">&#9654;</span>
}

type Tab = 'reviews' | 'testimonials' | 'settings'
type ReviewFilter = 'all' | 'responded' | 'unresponded'

// ── Main Component ───────────────────────────────────────────────────────────

export function ReputationStudioClient({
  initialOverview,
  initialReviews,
  initialTestimonials,
  initialConfig,
}: {
  initialOverview: ReputationOverview
  initialReviews: ReviewEntry[]
  initialTestimonials: TestimonialEntry[]
  initialConfig: SocialProofConfig
}) {
  const [tab, setTab] = useState<Tab>('reviews')
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [reviews, setReviews] = useState(initialReviews)
  const [testimonials, setTestimonials] = useState(initialTestimonials)
  const [config, setConfig] = useState(initialConfig)
  const [overview, setOverview] = useState(initialOverview)

  // Respond state
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  // Feature state
  const [featuringId, setFeaturingId] = useState<string | null>(null)
  const [featureExcerpt, setFeatureExcerpt] = useState('')

  // Settings draft
  const [settingsDraft, setSettingsDraft] = useState({
    maxFeatured: config.maxFeatured,
    showOnProfile: config.showOnProfile,
    showOnPortal: config.showOnPortal,
  })

  const [isPending, startTransition] = useTransition()

  // ── Filtered reviews ───────────────────────────────────────────────────────

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'responded') return r.responded
    if (filter === 'unresponded') return !r.responded
    return true
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleRespond(reviewId: string) {
    if (!responseText.trim()) return
    startTransition(async () => {
      try {
        const result = await respondToReview(reviewId, responseText.trim())
        if (!result.success) {
          toast.error(result.error || 'Failed to save response')
          return
        }
        toast('Response saved')
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, responded: true, responseText: responseText.trim() } : r
          )
        )
        setOverview((prev) => ({
          ...prev,
          respondedCount: prev.respondedCount + 1,
          unrespondedCount: Math.max(0, prev.unrespondedCount - 1),
          responseRate: prev.totalReviews > 0 ? (prev.respondedCount + 1) / prev.totalReviews : 0,
        }))
        setRespondingTo(null)
        setResponseText('')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save response')
      }
    })
  }

  function handleFeature(review: ReviewEntry) {
    const excerpt = featureExcerpt.trim() || review.comment
    if (!excerpt) return
    startTransition(async () => {
      try {
        const result = await featureTestimonial(
          review.id,
          excerpt,
          review.clientName,
          review.rating
        )
        if (!result.success) {
          toast.error(result.error || 'Failed to feature testimonial')
          return
        }
        toast('Testimonial featured')
        setTestimonials((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            reviewId: review.id,
            excerpt,
            clientName: review.clientName,
            rating: review.rating,
            approved: true,
            featured: true,
            displayOrder: prev.length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
        setFeaturingId(null)
        setFeatureExcerpt('')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to feature testimonial')
      }
    })
  }

  function handleUnfeature(testimonialId: string) {
    startTransition(async () => {
      try {
        const result = await unfeatureTestimonial(testimonialId)
        if (!result.success) {
          toast.error(result.error || 'Failed to remove testimonial')
          return
        }
        toast('Testimonial removed')
        setTestimonials((prev) => prev.filter((t) => t.id !== testimonialId))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove testimonial')
      }
    })
  }

  function handleSaveSettings() {
    startTransition(async () => {
      try {
        const result = await updateSocialProofConfig(settingsDraft)
        if (!result.success) {
          toast.error(result.error || 'Failed to save settings')
          return
        }
        toast('Settings saved')
        setConfig((prev) => ({ ...prev, ...settingsDraft }))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save settings')
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'reviews', label: 'Reviews' },
    { key: 'testimonials', label: 'Testimonials' },
    { key: 'settings', label: 'Settings' },
  ]

  const filterPills: { key: ReviewFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'responded', label: 'Responded' },
    { key: 'unresponded', label: 'Unresponded' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* ── Overview Card ──────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-stone-100">
            {overview.aggregateScore.toFixed(1)}
          </span>
          <span className="text-sm text-stone-400">/ 5.0</span>
          <TrendArrow direction={overview.trendDirection} />
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-stone-400">
          <span>{overview.totalReviews} reviews</span>
          <span>{(overview.responseRate * 100).toFixed(0)}% responded</span>
          <span>{overview.unrespondedCount} awaiting response</span>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-4 border-b border-stone-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-amber-500 text-amber-400'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Reviews Tab ────────────────────────────────────────────────────── */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex gap-2">
            {filterPills.map((p) => (
              <button
                key={p.key}
                onClick={() => setFilter(p.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === p.key
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {filteredReviews.length === 0 && (
            <p className="py-8 text-center text-sm text-stone-500">No reviews match this filter.</p>
          )}

          {filteredReviews.map((review) => {
            const isAlreadyFeatured = testimonials.some((t) => t.reviewId === review.id)
            return (
              <div
                key={review.id}
                className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RatingDots rating={review.rating} />
                    <span className="text-sm font-medium text-stone-200">{review.clientName}</span>
                    <span className="text-xs text-stone-500">
                      {new Date(review.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400">
                    {review.source.replace(/_/g, ' ')}
                  </span>
                </div>

                {review.comment && <p className="text-sm text-stone-300">{review.comment}</p>}

                {review.eventContext && (
                  <p className="text-xs text-stone-500">{review.eventContext}</p>
                )}

                {/* Existing response */}
                {review.responded && review.responseText && (
                  <div className="mt-2 rounded border border-stone-700 bg-stone-800/50 p-3">
                    <p className="text-xs font-medium text-stone-400">Your response</p>
                    <p className="mt-1 text-sm text-stone-300">{review.responseText}</p>
                  </div>
                )}

                {/* Respond form */}
                {!review.responded && respondingTo === review.id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write your response..."
                      rows={3}
                      className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(review.id)}
                        disabled={isPending || !responseText.trim()}
                        className="rounded bg-amber-600 px-3 py-1.5 text-sm text-stone-100 hover:bg-amber-500 disabled:opacity-50"
                      >
                        {isPending ? 'Saving...' : 'Submit'}
                      </button>
                      <button
                        onClick={() => {
                          setRespondingTo(null)
                          setResponseText('')
                        }}
                        className="rounded bg-stone-800 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Feature excerpt form */}
                {featuringId === review.id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={featureExcerpt}
                      onChange={(e) => setFeatureExcerpt(e.target.value)}
                      placeholder="Edit the excerpt for the testimonial..."
                      rows={2}
                      className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeature(review)}
                        disabled={isPending}
                        className="rounded bg-amber-600 px-3 py-1.5 text-sm text-stone-100 hover:bg-amber-500 disabled:opacity-50"
                      >
                        {isPending ? 'Saving...' : 'Confirm Feature'}
                      </button>
                      <button
                        onClick={() => {
                          setFeaturingId(null)
                          setFeatureExcerpt('')
                        }}
                        className="rounded bg-stone-800 px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  {!review.responded && respondingTo !== review.id && (
                    <button
                      onClick={() => {
                        setRespondingTo(review.id)
                        setResponseText('')
                      }}
                      className="rounded bg-stone-800 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-700"
                    >
                      Respond
                    </button>
                  )}
                  {review.rating >= 4 && !isAlreadyFeatured && featuringId !== review.id && (
                    <button
                      onClick={() => {
                        setFeaturingId(review.id)
                        setFeatureExcerpt(review.comment)
                      }}
                      className="rounded bg-stone-800 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-700"
                    >
                      Feature
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Testimonials Tab ───────────────────────────────────────────────── */}
      {tab === 'testimonials' && (
        <div className="space-y-4">
          {testimonials.length === 0 && (
            <p className="py-8 text-center text-sm text-stone-500">
              No testimonials yet. Feature reviews from the Reviews tab.
            </p>
          )}

          {testimonials.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 space-y-2"
            >
              <p className="text-sm italic text-stone-300">&ldquo;{t.excerpt}&rdquo;</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-400">{t.clientName}</span>
                  {t.rating !== null && <RatingDots rating={t.rating} />}
                </div>
                <button
                  onClick={() => handleUnfeature(t.id)}
                  disabled={isPending}
                  className="rounded bg-stone-800 px-3 py-1.5 text-sm text-red-400 hover:bg-stone-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settings Tab ───────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 space-y-4">
            {/* Show on Profile */}
            <label className="flex items-center justify-between">
              <span className="text-sm text-stone-300">Show on profile</span>
              <input
                type="checkbox"
                checked={settingsDraft.showOnProfile}
                onChange={(e) =>
                  setSettingsDraft((d) => ({
                    ...d,
                    showOnProfile: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 accent-amber-500"
              />
            </label>

            {/* Show on Portal */}
            <label className="flex items-center justify-between">
              <span className="text-sm text-stone-300">Show on client portal</span>
              <input
                type="checkbox"
                checked={settingsDraft.showOnPortal}
                onChange={(e) =>
                  setSettingsDraft((d) => ({
                    ...d,
                    showOnPortal: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 accent-amber-500"
              />
            </label>

            {/* Max Featured */}
            <label className="flex items-center justify-between">
              <span className="text-sm text-stone-300">Max featured testimonials</span>
              <input
                type="number"
                min={1}
                max={20}
                value={settingsDraft.maxFeatured}
                onChange={(e) =>
                  setSettingsDraft((d) => ({
                    ...d,
                    maxFeatured: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="w-16 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-sm text-stone-200 focus:border-amber-500 focus:outline-none"
              />
            </label>

            <button
              onClick={handleSaveSettings}
              disabled={isPending}
              className="rounded bg-stone-800 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
