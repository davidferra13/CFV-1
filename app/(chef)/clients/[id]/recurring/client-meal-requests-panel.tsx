'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  fulfillClientMealRequest,
  updateClientMealRequestStatus,
  type ClientMealRequest,
  type ClientMealRequestStatus,
} from '@/lib/recurring/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'

interface ClientMealRequestsPanelProps {
  requests: ClientMealRequest[]
}

const REQUEST_TYPE_LABELS: Record<ClientMealRequest['request_type'], string> = {
  repeat_dish: 'Repeat Request',
  new_idea: 'New Idea',
  avoid_dish: 'Avoid Dish',
}

const STATUS_BADGES: Record<
  ClientMealRequest['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  requested: 'warning',
  reviewed: 'info',
  scheduled: 'info',
  fulfilled: 'success',
  declined: 'error',
  withdrawn: 'default',
}

const PRIORITY_BADGES: Record<
  ClientMealRequest['priority'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  low: 'default',
  normal: 'info',
  high: 'warning',
}

function toTitle(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}

export function ClientMealRequestsPanel({ requests }: ClientMealRequestsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fulfillRequestId, setFulfillRequestId] = useState<string | null>(null)
  const [servedDate, setServedDate] = useState(new Date().toISOString().slice(0, 10))
  const [reaction, setReaction] = useState('')
  const [notes, setNotes] = useState('')

  const pendingRequests = useMemo(
    () =>
      requests.filter((request) => ['requested', 'reviewed', 'scheduled'].includes(request.status)),
    [requests]
  )
  const closedRequests = useMemo(
    () =>
      requests.filter(
        (request) => !['requested', 'reviewed', 'scheduled'].includes(request.status)
      ),
    [requests]
  )
  const repeatLeaders = useMemo(() => {
    const counts = new Map<string, number>()
    for (const request of requests) {
      if (request.request_type !== 'repeat_dish') continue
      const key = request.dish_name.trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [requests])
  const avoidLeaders = useMemo(() => {
    const counts = new Map<string, number>()
    for (const request of requests) {
      if (request.request_type !== 'avoid_dish') continue
      if (request.status === 'withdrawn') continue
      const key = request.dish_name.trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [requests])

  function clearMessages() {
    setError(null)
    setSuccess(null)
  }

  function handleStatusUpdate(requestId: string, status: ClientMealRequestStatus) {
    clearMessages()
    startTransition(async () => {
      try {
        await updateClientMealRequestStatus(requestId, status)
        setSuccess(`Request ${status}.`)
        router.refresh()
      } catch (err: any) {
        const msg = err?.message || 'Could not update this request'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  function handleFulfill(requestId: string) {
    clearMessages()
    startTransition(async () => {
      try {
        await fulfillClientMealRequest({
          request_id: requestId,
          served_date: servedDate,
          client_reaction:
            (reaction as 'loved' | 'liked' | 'neutral' | 'disliked' | undefined) || undefined,
          notes: notes.trim() || undefined,
        })
        setSuccess('Request fulfilled and added to dish history.')
        toast.success('Request fulfilled')
        setFulfillRequestId(null)
        setReaction('')
        setNotes('')
        router.refresh()
      } catch (err: any) {
        const msg = err?.message || 'Could not fulfill this request'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client Meal Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <Alert variant="success" role="status" aria-live="polite">
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="error" role="alert" aria-live="assertive">
            {error}
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">Open: {pendingRequests.length}</Badge>
          <Badge variant="default">Total: {requests.length}</Badge>
        </div>

        {(repeatLeaders.length > 0 || avoidLeaders.length > 0) && (
          <div className="space-y-2">
            {repeatLeaders.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">Top repeats</span>
                {repeatLeaders.map(([dishName, count]) => (
                  <Badge key={`repeat-${dishName}`} variant="info">
                    {dishName} ({count})
                  </Badge>
                ))}
              </div>
            )}
            {avoidLeaders.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">Top avoids</span>
                {avoidLeaders.map(([dishName, count]) => (
                  <Badge key={`avoid-${dishName}`} variant="error">
                    {dishName} ({count})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {pendingRequests.length === 0 ? (
          <p className="text-sm text-stone-500">No open requests right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-stone-800 p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-stone-100">{request.dish_name}</p>
                    <p className="text-xs text-stone-500">
                      {REQUEST_TYPE_LABELS[request.request_type]} |{' '}
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                      {request.requested_for_week_start
                        ? ` | target week ${format(
                            new Date(`${request.requested_for_week_start}T00:00:00`),
                            'MMM d'
                          )}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={PRIORITY_BADGES[request.priority]}>
                      {toTitle(request.priority)}
                    </Badge>
                    <Badge variant={STATUS_BADGES[request.status]}>{toTitle(request.status)}</Badge>
                  </div>
                </div>

                {request.notes && <p className="text-xs text-stone-400">{request.notes}</p>}

                <div className="flex flex-wrap gap-2">
                  {request.status === 'requested' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => handleStatusUpdate(request.id, 'reviewed')}
                    >
                      Mark Reviewed
                    </Button>
                  )}
                  {(request.status === 'requested' || request.status === 'reviewed') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => handleStatusUpdate(request.id, 'scheduled')}
                    >
                      Mark Scheduled
                    </Button>
                  )}
                  {request.status !== 'declined' && request.status !== 'fulfilled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleStatusUpdate(request.id, 'declined')}
                    >
                      Decline
                    </Button>
                  )}
                  {(request.status === 'scheduled' || request.status === 'reviewed') && (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isPending}
                      onClick={() => {
                        setFulfillRequestId(request.id)
                        setServedDate(new Date().toISOString().slice(0, 10))
                        setReaction('')
                        setNotes('')
                      }}
                    >
                      Fulfill + Log Dish
                    </Button>
                  )}
                </div>

                {fulfillRequestId === request.id && (
                  <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        type="date"
                        label="Served Date"
                        value={servedDate}
                        onChange={(e) => setServedDate(e.target.value)}
                        required
                      />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-stone-300">
                          Client Reaction
                        </label>
                        <select
                          className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                          value={reaction}
                          onChange={(e) => setReaction(e.target.value)}
                        >
                          <option value="">Not recorded</option>
                          <option value="loved">Loved</option>
                          <option value="liked">Liked</option>
                          <option value="neutral">Neutral</option>
                          <option value="disliked">Disliked</option>
                        </select>
                      </div>
                    </div>
                    <Textarea
                      label="Fulfillment Notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isPending}
                        onClick={() => handleFulfill(request.id)}
                      >
                        Confirm Fulfilled
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => setFulfillRequestId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {closedRequests.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-stone-500">Recently closed</p>
            <div className="space-y-2">
              {closedRequests.slice(0, 8).map((request) => (
                <div key={request.id} className="rounded-lg border border-stone-800 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-stone-200">{request.dish_name}</p>
                    <Badge variant={STATUS_BADGES[request.status]}>{toTitle(request.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
