'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  requestTestimonial,
  approveTestimonial,
  featureTestimonial,
  deleteTestimonial,
} from '@/lib/testimonials/testimonial-actions'
import type { TestimonialRow } from '@/lib/testimonials/testimonial-actions'

type Props = {
  initialTestimonials: TestimonialRow[]
  events: { id: string; occasion: string | null; event_date: string }[]
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= rating ? '#e8b84b' : '#4a4540' }}>
          ★
        </span>
      ))}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReviewRequestManager({ initialTestimonials, events }: Props) {
  const [testimonials, setTestimonials] = useState(initialTestimonials)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured' | 'requested'>(
    'all'
  )
  const [isPending, startTransition] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [requestEventId, setRequestEventId] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  // Submitted = has content
  const submitted = testimonials.filter((t) => t.submitted_at !== null)
  const requested = testimonials.filter((t) => t.submitted_at === null && t.request_token)

  const filtered = (() => {
    if (filter === 'pending') return submitted.filter((t) => !t.is_approved)
    if (filter === 'approved') return submitted.filter((t) => t.is_approved)
    if (filter === 'featured') return submitted.filter((t) => t.is_featured)
    if (filter === 'requested') return requested
    return testimonials
  })()

  const counts = {
    all: testimonials.length,
    pending: submitted.filter((t) => !t.is_approved).length,
    approved: submitted.filter((t) => t.is_approved).length,
    featured: submitted.filter((t) => t.is_featured).length,
    requested: requested.length,
  }

  function handleApprove(id: string) {
    const previous = [...testimonials]
    setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, is_approved: true } : t)))
    startTransition(async () => {
      try {
        await approveTestimonial(id)
      } catch {
        setTestimonials(previous)
      }
    })
  }

  function handleFeature(id: string) {
    const previous = [...testimonials]
    setTestimonials((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_featured: !t.is_featured } : t))
    )
    startTransition(async () => {
      try {
        await featureTestimonial(id)
      } catch {
        setTestimonials(previous)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this testimonial? This cannot be undone.')) return
    const previous = [...testimonials]
    setTestimonials((prev) => prev.filter((t) => t.id !== id))
    startTransition(async () => {
      try {
        await deleteTestimonial(id)
      } catch {
        setTestimonials(previous)
      }
    })
  }

  async function handleCopyLink(token: string, id: string) {
    const url = `${window.location.origin}/review/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback for insecure contexts
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  async function handleRequestReview() {
    if (!requestEventId) return
    setRequestLoading(true)
    setRequestError('')
    try {
      const result = await requestTestimonial(requestEventId)
      // Add to local state
      setTestimonials((prev) => [
        {
          id: crypto.randomUUID(), // temp ID, will be replaced on refresh
          tenant_id: '',
          client_id: null,
          event_id: requestEventId,
          client_name: 'Client',
          rating: null,
          content: '',
          is_approved: false,
          is_featured: false,
          is_public: false,
          request_token: result.token,
          request_sent_at: new Date().toISOString(),
          submitted_at: null,
          display_name: null,
          event_type: events.find((e) => e.id === requestEventId)?.occasion ?? null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      setRequestEventId('')
      // Auto-copy the link
      const url = `${window.location.origin}${result.url}`
      try {
        await navigator.clipboard.writeText(url)
        setCopiedId('new-request')
        setTimeout(() => setCopiedId(null), 3000)
      } catch {
        // clipboard may not be available
      }
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to create request')
    } finally {
      setRequestLoading(false)
    }
  }

  const eventMap = new Map(events.map((e) => [e.id, e]))

  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'approved', label: `Approved (${counts.approved})` },
    { key: 'featured', label: `Featured (${counts.featured})` },
    { key: 'requested', label: `Requested (${counts.requested})` },
  ]

  return (
    <div className="space-y-4">
      {/* Request Review */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-stone-200 mb-3">Request a Review</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <select
              value={requestEventId}
              onChange={(e) => setRequestEventId(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Select an event...</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.occasion || 'Event'} - {formatDate(e.event_date)}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRequestReview}
            disabled={!requestEventId || requestLoading}
          >
            {requestLoading ? 'Creating...' : 'Generate Link'}
          </Button>
        </div>
        {copiedId === 'new-request' && (
          <p className="text-xs text-green-400 mt-2">
            Review link copied to clipboard! Share it with your client.
          </p>
        )}
        {requestError && <p className="text-xs text-red-400 mt-2">{requestError}</p>}
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Testimonials list */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500">
            {filter === 'all'
              ? 'No review requests yet. Select an event above to generate a review link for your client.'
              : `No ${filter} reviews.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const evt = eventMap.get(t.event_id ?? '')
            const isSubmitted = t.submitted_at !== null

            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-stone-100">
                        {t.display_name || t.client_name}
                      </span>
                      {!isSubmitted && <Badge variant="default">Awaiting response</Badge>}
                      {isSubmitted && t.is_approved && <Badge variant="success">Approved</Badge>}
                      {isSubmitted && t.is_featured && <Badge variant="info">Featured</Badge>}
                      {isSubmitted && !t.is_approved && (
                        <Badge variant="warning">Pending approval</Badge>
                      )}
                      {t.is_public && <Badge variant="default">Public</Badge>}
                    </div>

                    {/* Event + date */}
                    <p className="text-xs text-stone-400 mb-2">
                      {t.event_type || evt?.occasion || 'Event'}
                      {' · '}
                      {isSubmitted
                        ? `Submitted ${formatDate(t.submitted_at!)}`
                        : t.request_sent_at
                          ? `Requested ${formatDate(t.request_sent_at)}`
                          : formatDate(t.created_at)}
                    </p>

                    {/* Rating */}
                    {isSubmitted && <Stars rating={t.rating} />}

                    {/* Review text */}
                    {isSubmitted && t.content && (
                      <p className="text-sm text-stone-300 leading-relaxed mt-1">
                        &ldquo;{t.content}&rdquo;
                      </p>
                    )}

                    {/* Not submitted yet - show copy link */}
                    {!isSubmitted && t.request_token && (
                      <button
                        onClick={() => handleCopyLink(t.request_token!, t.id)}
                        className="text-xs text-brand-500 hover:text-brand-400 mt-1"
                      >
                        {copiedId === t.id ? 'Copied!' : 'Copy review link'}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {isSubmitted && !t.is_approved && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(t.id)}
                        disabled={isPending}
                      >
                        Approve
                      </Button>
                    )}
                    {isSubmitted && t.is_approved && (
                      <Button
                        variant={t.is_featured ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={() => handleFeature(t.id)}
                        disabled={isPending}
                      >
                        {t.is_featured ? 'Unfeature' : 'Feature'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
