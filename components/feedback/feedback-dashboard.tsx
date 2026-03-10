'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getOverallRatings,
  getNPSScore,
  getFeedbackRequests,
  getFeedbackTrend,
  getTagBreakdown,
  createFeedbackRequest,
} from '@/lib/feedback/customer-feedback-actions'

const TAG_LABELS: Record<string, string> = {
  food_quality: 'Food Quality',
  service: 'Service',
  timing: 'Timing',
  presentation: 'Presentation',
  value: 'Value',
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-500">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < Math.round(rating) ? '\u2605' : '\u2606'}</span>
      ))}
    </span>
  )
}

export function FeedbackDashboard() {
  const [isPending, startTransition] = useTransition()
  const [ratings, setRatings] = useState<any>(null)
  const [nps, setNps] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [trend, setTrend] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Send request form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    entityType: 'event',
    entityId: '',
    clientName: '',
    clientEmail: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    startTransition(async () => {
      try {
        setLoadError(null)
        const [ratingsData, npsData, requestsData, trendData, tagData] = await Promise.all([
          getOverallRatings(),
          getNPSScore(),
          getFeedbackRequests(),
          getFeedbackTrend(90),
          getTagBreakdown(),
        ])
        setRatings(ratingsData)
        setNps(npsData)
        setRequests(requestsData)
        setTrend(trendData)
        setTags(tagData)
      } catch (err) {
        console.error('[FeedbackDashboard] Load error:', err)
        setLoadError('Could not load feedback data. Please refresh the page.')
      }
    })
  }

  function handleSendRequest() {
    if (!formData.entityId || !formData.clientName) {
      setFormError('Entity ID and client name are required')
      return
    }

    setFormError(null)
    setFormSuccess(null)

    startTransition(async () => {
      try {
        const result = await createFeedbackRequest({
          entityType: formData.entityType,
          entityId: formData.entityId,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail || undefined,
        })

        if (result.success) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
          setFormSuccess(`Feedback link created: ${baseUrl}/feedback/${result.token}`)
          setFormData({ entityType: 'event', entityId: '', clientName: '', clientEmail: '' })
          loadData()
        } else {
          setFormError(result.error || 'Failed to create request')
        }
      } catch (err) {
        setFormError('Failed to create feedback request')
      }
    })
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-center">
        <p className="text-sm text-red-400">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Average Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-stone-100">{ratings?.averageRating ?? '-'}</p>
            {ratings && <StarDisplay rating={ratings.averageRating} />}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">NPS Score</p>
          <p
            className={`text-2xl font-bold ${
              (nps?.score ?? 0) >= 50
                ? 'text-green-500'
                : (nps?.score ?? 0) >= 0
                  ? 'text-yellow-500'
                  : 'text-red-500'
            }`}
          >
            {nps?.score ?? '-'}
          </p>
          {nps && nps.total > 0 && (
            <p className="text-xs text-stone-500 mt-1">
              {nps.promoters}P / {nps.passives}N / {nps.detractors}D
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Total Responses</p>
          <p className="text-2xl font-bold text-stone-100">{ratings?.totalResponses ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-stone-500 mb-1">Response Rate</p>
          <p className="text-2xl font-bold text-stone-100">{ratings?.responseRate ?? 0}%</p>
        </Card>
      </div>

      {/* Rating Distribution */}
      {ratings && ratings.totalResponses > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratings.distribution[star] || 0
              const pct =
                ratings.totalResponses > 0 ? Math.round((count / ratings.totalResponses) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm text-stone-400 w-12">{star} star</span>
                  <div className="flex-1 bg-stone-800 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-stone-500 w-12 text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Trend */}
      {trend.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">Rating Trend (Weekly)</h3>
          <div className="flex items-end gap-2 h-24">
            {trend.map((week, i) => {
              const height = (week.averageRating / 5) * 100
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  title={`Week of ${week.weekStart}: ${week.averageRating} avg (${week.count} responses)`}
                >
                  <div
                    className="bg-brand-600 rounded-t min-h-[4px]"
                    style={{ height: `${height}%` }}
                  />
                  <p className="text-[10px] text-stone-500 mt-1 text-center truncate">
                    {week.weekStart.slice(5)}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Tag Breakdown */}
      {tags.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">Feedback Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3 py-1 text-sm text-stone-300"
              >
                {TAG_LABELS[t.tag] || t.tag}
                <span className="text-xs text-stone-500">({t.count})</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Send Feedback Request */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-stone-300">Send Feedback Request</h3>
          <Button variant="ghost" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close' : 'New Request'}
          </Button>
        </div>

        {showForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Entity Type</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
                  className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="event">Event</option>
                  <option value="bakery_order">Bakery Order</option>
                  <option value="delivery">Delivery</option>
                  <option value="wholesale_order">Wholesale Order</option>
                  <option value="preorder">Preorder</option>
                  <option value="tasting">Tasting</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Entity ID</label>
                <input
                  type="text"
                  value={formData.entityId}
                  onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                  placeholder="UUID of the event/order"
                  className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Client Name</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Client Email (optional)</label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-400">{formError}</p>}
            {formSuccess && <p className="text-sm text-green-400">{formSuccess}</p>}

            <Button variant="primary" onClick={handleSendRequest} disabled={isPending}>
              Create Feedback Link
            </Button>
          </div>
        )}
      </Card>

      {/* Recent Feedback */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-3">Recent Feedback</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-4">
            No feedback requests yet. Create your first one above.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 20).map((req: any) => {
              const response = req.feedback_responses?.[0]
              return (
                <div
                  key={req.id}
                  className="border-b border-stone-800 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-200">{req.client_name}</p>
                      <p className="text-xs text-stone-500">
                        {req.entity_type} - {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        req.status === 'completed'
                          ? 'bg-green-900 text-green-400'
                          : req.status === 'sent'
                            ? 'bg-blue-900 text-blue-400'
                            : req.status === 'expired'
                              ? 'bg-stone-800 text-stone-500'
                              : 'bg-yellow-900 text-yellow-400'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  {response && (
                    <div className="mt-2 pl-4 border-l-2 border-stone-700">
                      <div className="flex items-center gap-2 mb-1">
                        <StarDisplay rating={response.rating} />
                        {response.would_recommend !== null && (
                          <span className="text-xs text-stone-500">
                            {response.would_recommend ? 'Would recommend' : 'Would not recommend'}
                          </span>
                        )}
                      </div>
                      {response.comment && (
                        <p className="text-sm text-stone-400">{response.comment}</p>
                      )}
                      {response.tags && response.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {response.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded"
                            >
                              {TAG_LABELS[tag] || tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Empty state */}
      {!isPending && ratings?.totalResponses === 0 && requests.length === 0 && (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm text-stone-400">
            No feedback collected yet. After completing a service, send a feedback request link to
            your client. Their rating and comments will appear here.
          </p>
        </Card>
      )}
    </div>
  )
}
