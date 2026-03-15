'use client'

import { useState, useEffect } from 'react'
import { getFeedbackStats, getAllFeedback } from '@/lib/feedback/feedback-actions'
import Link from 'next/link'

interface LatestFeedback {
  overall_rating: number | null
  additional_comments: string | null
  favorite_dish: string | null
  submitted_at: string
  clients?: { first_name: string; last_name: string } | null
}

export function FeedbackWidget() {
  const [avgRating, setAvgRating] = useState<number>(0)
  const [totalResponses, setTotalResponses] = useState<number>(0)
  const [latest, setLatest] = useState<LatestFeedback | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsResult, feedbackResult] = await Promise.all([
          getFeedbackStats(),
          getAllFeedback(),
        ])

        if (statsResult.data) {
          setAvgRating(statsResult.data.avgOverall)
          setTotalResponses(statsResult.data.totalResponses)
        }

        if (feedbackResult.data && feedbackResult.data.length > 0) {
          const submitted = feedbackResult.data.find(
            (f: Record<string, unknown>) => f.overall_rating !== null
          )
          if (submitted) {
            setLatest(submitted as LatestFeedback)
          }
        }
      } catch (err) {
        console.error('[feedback-widget] Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Client Feedback</h3>
        <Link href="/feedback" className="text-xs font-medium text-amber-600 hover:text-amber-700">
          View all
        </Link>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <div className="flex items-center gap-1">
          <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-2xl font-bold text-gray-900">
            {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {totalResponses} response{totalResponses !== 1 ? 's' : ''}
        </span>
      </div>

      {latest && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">Latest feedback</p>
          <div className="mt-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-3 w-3 ${
                  star <= (latest.overall_rating || 0) ? 'text-amber-400' : 'text-gray-200'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            {latest.clients && (
              <span className="ml-1 text-xs text-gray-500">
                {latest.clients.first_name} {latest.clients.last_name}
              </span>
            )}
          </div>
          {(latest.favorite_dish || latest.additional_comments) && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-600 italic">
              {latest.favorite_dish
                ? `Favorite: ${latest.favorite_dish}`
                : latest.additional_comments}
            </p>
          )}
        </div>
      )}

      {totalResponses === 0 && (
        <p className="mt-3 text-xs text-gray-400">
          No feedback collected yet. Send feedback requests after events to start gathering reviews.
        </p>
      )}
    </div>
  )
}
