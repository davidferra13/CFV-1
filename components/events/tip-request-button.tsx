'use client'

// Tip Request Button - shown on completed events.
// Creates a tip request link that can be sent to the client (Uber-style post-service tip).

import { useState, useTransition } from 'react'
import { HandCoins, Check, Clock, Copy, Send } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { createTipRequest, markTipRequestSent, type TipRequest } from '@/lib/finance/tip-actions'

interface Props {
  eventId: string
  clientName?: string
  existingRequest?: TipRequest | null
}

export function TipRequestButton({ eventId, clientName, existingRequest }: Props) {
  const [request, setRequest] = useState<TipRequest | null>(existingRequest ?? null)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tipUrl = request
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/tip/${request.requestToken}`
    : null

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createTipRequest(eventId)
        setRequest(result)
      } catch (err: any) {
        setError(err?.message || 'Failed to create tip request')
      }
    })
  }

  async function handleCopyLink() {
    if (!tipUrl) return
    try {
      await navigator.clipboard.writeText(tipUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy link')
    }
  }

  function handleMarkSent() {
    if (!request) return
    startTransition(async () => {
      try {
        await markTipRequestSent(request.id)
        setRequest((prev) =>
          prev ? { ...prev, status: 'sent', sentAt: new Date().toISOString() } : null
        )
      } catch {
        setError('Failed to update status')
      }
    })
  }

  // Already completed
  if (request?.status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-emerald-400">
          Tip received: {formatCurrency(request.tipAmountCents ?? 0)}
          {request.tipMethod ? ` (${request.tipMethod})` : ''}
        </span>
      </div>
    )
  }

  // Request exists but not yet completed
  if (request) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-stone-300">
            Tip request {request.status === 'sent' ? 'sent' : 'created'}
            {clientName ? ` for ${clientName}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-stone-800 text-stone-200 rounded hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {request.status === 'pending' && (
            <button
              onClick={handleMarkSent}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Mark as Sent
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  // No request yet
  return (
    <div className="space-y-1">
      <button
        onClick={handleCreate}
        disabled={isPending}
        className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-400 transition-colors disabled:opacity-50"
      >
        <HandCoins className="h-4 w-4" />
        {isPending ? 'Creating...' : 'Request Tip'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
