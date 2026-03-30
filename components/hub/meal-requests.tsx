'use client'

import { useState, useEffect, useTransition } from 'react'
import type { MealRequest, MealRequestStatus } from '@/lib/hub/types'
import {
  getMealRequests,
  createMealRequest,
  resolveMealRequest,
} from '@/lib/hub/meal-board-actions'

interface MealRequestsProps {
  groupId: string
  profileToken: string | null
  isChefOrAdmin: boolean
}

const STATUS_CONFIG: Record<MealRequestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  planned: { label: 'Planned', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  declined: { label: 'Declined', color: 'text-stone-500', bg: 'bg-stone-700/50' },
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function MealRequests({ groupId, profileToken, isChefOrAdmin }: MealRequestsProps) {
  const [requests, setRequests] = useState<MealRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMealRequests({ groupId })
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const handleSubmit = () => {
    if (!profileToken || !title.trim()) return

    const prevRequests = [...requests]
    const optimistic: MealRequest = {
      id: `temp-${Date.now()}`,
      group_id: groupId,
      requested_by_profile_id: '',
      title: title.trim(),
      notes: notes.trim() || null,
      status: 'pending',
      resolved_meal_id: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
      requested_by: { display_name: 'You' } as any,
    }

    setRequests((prev) => [optimistic, ...prev])
    setTitle('')
    setNotes('')
    setShowForm(false)
    setError(null)

    startTransition(async () => {
      try {
        const result = await createMealRequest({
          groupId,
          profileToken,
          title: optimistic.title,
          notes: optimistic.notes,
        })
        if (!result.success) {
          setRequests(prevRequests)
          setError(result.error ?? 'Failed to submit request')
        } else if (result.request) {
          setRequests((prev) => prev.map((r) => (r.id === optimistic.id ? result.request! : r)))
        }
      } catch {
        setRequests(prevRequests)
        setError('Failed to submit request')
      }
    })
  }

  const handleResolve = (requestId: string, status: 'planned' | 'declined') => {
    if (!profileToken) return

    const prevRequests = [...requests]
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status, resolved_at: new Date().toISOString() } : r
      )
    )

    startTransition(async () => {
      try {
        const result = await resolveMealRequest({
          requestId,
          profileToken,
          status,
        })
        if (!result.success) {
          setRequests(prevRequests)
          setError(result.error ?? 'Failed to resolve request')
        }
      } catch {
        setRequests(prevRequests)
        setError('Failed to resolve request')
      }
    })
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-300">Meal Requests</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              {pendingCount} pending
            </span>
          )}
        </div>
        <span className="text-[10px] text-stone-600">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-stone-800 p-3 space-y-2.5">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-[10px] text-red-300">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-400">
                ✕
              </button>
            </div>
          )}

          {/* Submit request form (available to all members) */}
          {profileToken && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full rounded-lg border border-dashed border-stone-700 py-2 text-xs text-stone-500 hover:border-stone-500 hover:text-stone-300"
            >
              + Request a dish
            </button>
          )}

          {showForm && (
            <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-2.5 space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What would you like? (e.g. Lobster mac and cheese)"
                className="w-full rounded bg-stone-700 px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                maxLength={200}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) handleSubmit()
                  if (e.key === 'Escape') {
                    setShowForm(false)
                    setTitle('')
                    setNotes('')
                  }
                }}
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details? (optional)"
                className="w-full rounded bg-stone-700 px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                maxLength={500}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!title.trim() || isPending}
                  className="rounded bg-[var(--hub-primary,#e88f47)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setTitle('')
                    setNotes('')
                  }}
                  className="rounded bg-stone-700 px-3 py-1 text-xs text-stone-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Request list */}
          {requests.length === 0 ? (
            <p className="py-2 text-center text-xs text-stone-600">
              No requests yet. Family members can suggest dishes here.
            </p>
          ) : (
            <div className="space-y-1.5">
              {requests.map((req) => {
                const sc = STATUS_CONFIG[req.status]
                return (
                  <div
                    key={req.id}
                    className={`rounded-lg bg-stone-800/50 px-3 py-2 ${
                      req.status !== 'pending' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-stone-200 truncate">{req.title}</p>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${sc.bg} ${sc.color}`}
                          >
                            {sc.label}
                          </span>
                        </div>
                        {req.notes && (
                          <p className="mt-0.5 text-[10px] text-stone-500">{req.notes}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-stone-600">
                          {req.requested_by?.display_name ?? 'Unknown'} · {timeAgo(req.created_at)}
                        </p>
                      </div>

                      {/* Chef actions for pending requests */}
                      {isChefOrAdmin && req.status === 'pending' && profileToken && (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleResolve(req.id, 'planned')}
                            disabled={isPending}
                            className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/30"
                            title="Accept and plan this dish"
                          >
                            Plan it
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolve(req.id, 'declined')}
                            disabled={isPending}
                            className="rounded bg-stone-700/50 px-2 py-0.5 text-[10px] text-stone-500 hover:bg-stone-700"
                            title="Decline this request"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
