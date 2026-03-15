'use client'

import { useState, useEffect } from 'react'
import {
  getAllFeedback,
  getFeedbackStats,
  toggleFeedbackPublic,
} from '@/lib/feedback/feedback-actions'

interface FeedbackItem {
  id: string
  overall_rating: number | null
  food_rating: number | null
  service_rating: number | null
  communication_rating: number | null
  favorite_dish: string | null
  improvement_suggestions: string | null
  would_recommend: boolean | null
  additional_comments: string | null
  is_public: boolean
  submitted_at: string
  events?: { title: string; event_date: string } | null
  clients?: { first_name: string; last_name: string } | null
}

interface FeedbackStatsData {
  totalResponses: number
  avgOverall: number
  avgFood: number
  avgService: number
  avgCommunication: number
  npsScore: number
  responseRate: number
}

function RatingDisplay({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-amber-600">
        {value > 0 ? value.toFixed(1) : 'N/A'}
      </div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
      <div className="mt-1 flex justify-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-4 w-4 ${star <= Math.round(value) ? 'text-amber-400' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    </div>
  )
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-400">No rating</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export function FeedbackDashboard() {
  const [stats, setStats] = useState<FeedbackStatsData | null>(null)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const filters: { dateRange?: { from: string; to: string } } = {}
      if (dateFrom || dateTo) {
        filters.dateRange = { from: dateFrom, to: dateTo }
      }

      const [statsResult, feedbackResult] = await Promise.all([
        getFeedbackStats(),
        getAllFeedback(filters),
      ])

      if (statsResult.error) {
        setError(statsResult.error)
        return
      }

      if (feedbackResult.error) {
        setError(feedbackResult.error)
        return
      }

      setStats(statsResult.data)
      setFeedback((feedbackResult.data as FeedbackItem[]) || [])
    } catch (err) {
      setError('Failed to load feedback data')
      console.error('[feedback] Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleTogglePublic(id: string) {
    const result = await toggleFeedbackPublic(id)
    if (result.success) {
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_public: result.isPublic ?? f.is_public } : f))
      )
    }
  }

  function handleFilterApply() {
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-8 w-8 animate-spin text-amber-600" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <RatingDisplay value={stats.avgOverall} label="Overall" />
          <RatingDisplay value={stats.avgFood} label="Food" />
          <RatingDisplay value={stats.avgService} label="Service" />
          <RatingDisplay value={stats.avgCommunication} label="Communication" />
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${stats.npsScore >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {stats.npsScore}
            </div>
            <div className="mt-1 text-xs text-gray-500">NPS Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.responseRate}%</div>
            <div className="mt-1 text-xs text-gray-500">Response Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.totalResponses}</div>
            <div className="mt-1 text-xs text-gray-500">Total Responses</div>
          </div>
        </div>
      )}

      {/* Date filter */}
      <div className="flex items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div>
          <label htmlFor="dateFrom" className="block text-xs font-medium text-gray-600">
            From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="block text-xs font-medium text-gray-600">
            To
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={handleFilterApply}
          className="rounded-md bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Filter
        </button>
      </div>

      {/* Feedback list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>

        {feedback.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No feedback received yet</p>
        )}

        {feedback
          .filter((f) => f.overall_rating !== null)
          .map((f) => (
            <div key={f.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Stars rating={f.overall_rating} />
                    <span className="text-sm text-gray-500">
                      {f.clients ? `${f.clients.first_name} ${f.clients.last_name}` : 'Anonymous'}
                    </span>
                  </div>
                  {f.events && (
                    <p className="mt-1 text-sm text-gray-600">
                      {f.events.title} - {new Date(f.events.event_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePublic(f.id)}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      f.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                    title={
                      f.is_public ? 'Public (click to hide)' : 'Private (click to make public)'
                    }
                  >
                    {f.is_public ? 'Public' : 'Private'}
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(f.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-gray-500">Food: </span>
                  <span className="font-medium">{f.food_rating || '-'}/5</span>
                </div>
                <div>
                  <span className="text-gray-500">Service: </span>
                  <span className="font-medium">{f.service_rating || '-'}/5</span>
                </div>
                <div>
                  <span className="text-gray-500">Comms: </span>
                  <span className="font-medium">{f.communication_rating || '-'}/5</span>
                </div>
              </div>

              {f.favorite_dish && (
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Favorite dish:</span> {f.favorite_dish}
                </p>
              )}

              {f.improvement_suggestions && (
                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-medium">Suggestions:</span> {f.improvement_suggestions}
                </p>
              )}

              {f.additional_comments && (
                <p className="mt-1 text-sm text-gray-600 italic">{f.additional_comments}</p>
              )}

              {f.would_recommend !== null && (
                <p className="mt-2 text-xs">
                  {f.would_recommend ? (
                    <span className="text-green-600">Would recommend</span>
                  ) : (
                    <span className="text-red-600">Would not recommend</span>
                  )}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
