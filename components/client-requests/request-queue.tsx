'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { convertRequestToEvent, declineRequest, confirmRequest } from '@/lib/client-requests/actions'
import type { QuickRequestWithClient } from '@/lib/client-requests/actions'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import {
  CalendarPlus, X, Check, User, Calendar, Users, MessageSquare, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

function formatTime(time: string | null) {
  if (!time) return null
  const labels: Record<string, string> = {
    morning: 'Morning',
    lunch: 'Lunch',
    afternoon: 'Afternoon',
    evening: 'Evening',
  }
  return labels[time] ?? time
}

interface RequestCardProps {
  request: QuickRequestWithClient
}

function RequestCard({ request }: RequestCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeclineInput, setShowDeclineInput] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [actionTaken, setActionTaken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const client = request.client
  const timeLabel = formatTime(request.requested_time)

  function handleConvert() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await convertRequestToEvent(request.id)
        router.push(`/events/${result.eventId}`)
      } catch (err: any) {
        setError(err.message || 'Failed to convert request')
      }
    })
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        await confirmRequest(request.id)
        setActionTaken('confirmed')
      } catch (err: any) {
        setError(err.message || 'Failed to confirm request')
      }
    })
  }

  function handleDecline() {
    setError(null)
    startTransition(async () => {
      try {
        await declineRequest(request.id, declineReason.trim() || undefined)
        setActionTaken('declined')
      } catch (err: any) {
        setError(err.message || 'Failed to decline request')
      }
    })
  }

  if (actionTaken) {
    return (
      <Card className="border-stone-200 opacity-60">
        <CardContent className="p-4 text-center text-sm text-stone-500">
          Request {actionTaken === 'confirmed' ? 'confirmed' : 'declined'}.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Client + date header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-stone-400" />
              <Link
                href={`/clients/${client.id}`}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                {client.full_name}
              </Link>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(request.requested_date), 'EEE, MMM d')}
              </span>
              {timeLabel && (
                <span className="text-stone-500">{timeLabel}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {request.guest_count} guest{request.guest_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <span className="text-xs text-stone-400">
            {format(new Date(request.created_at), 'MMM d, h:mm a')}
          </span>
        </div>

        {/* Notes */}
        {request.notes && (
          <div className="flex items-start gap-2 mb-3 p-2 bg-stone-50 rounded-lg">
            <MessageSquare className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
            <p className="text-sm text-stone-600">{request.notes}</p>
          </div>
        )}

        {/* Menu reference */}
        {request.preferred_menu_id && (
          <p className="text-xs text-stone-500 mb-3">
            Requested repeat of a previous menu
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-200 mb-3">
            {error}
          </div>
        )}

        {/* Decline input */}
        {showDeclineInput && (
          <div className="mb-3 space-y-2">
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason (optional, visible to client)"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDecline}
                disabled={isPending}
              >
                {isPending ? 'Declining...' : 'Confirm Decline'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowDeclineInput(false); setDeclineReason('') }}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showDeclineInput && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvert}
              disabled={isPending}
              className="flex items-center gap-1"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {isPending ? 'Creating...' : 'Convert to Event'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeclineInput(true)}
              disabled={isPending}
              className="flex items-center gap-1 text-stone-500"
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </Button>
            <div className="flex-1" />
            <Link
              href={`/clients/${client.id}`}
              className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
            >
              Profile <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface RequestQueueProps {
  requests: QuickRequestWithClient[]
}

export function RequestQueue({ requests }: RequestQueueProps) {
  const pending = requests.filter((r) => r.status === 'pending')

  if (pending.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {pending.map((req) => (
        <RequestCard key={req.id} request={req} />
      ))}
    </div>
  )
}
