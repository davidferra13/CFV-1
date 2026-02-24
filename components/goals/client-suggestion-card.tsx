'use client'

import { useTransition } from 'react'
import { PhoneCall, X, CheckCircle, Clock } from 'lucide-react'
import type { ClientSuggestion } from '@/lib/goals/types'
import { updateSuggestionStatus } from '@/lib/goals/actions'

interface ClientSuggestionCardProps {
  suggestion: ClientSuggestion
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

const STATUS_LABELS: Record<ClientSuggestion['status'], string> = {
  pending: 'Reach out',
  contacted: 'Contacted',
  booked: 'Booked',
  declined: 'Declined',
  dismissed: 'Dismissed',
}

export function ClientSuggestionCard({ suggestion }: ClientSuggestionCardProps) {
  const [isPending, startTransition] = useTransition()
  const isActionable = suggestion.status === 'pending' && suggestion.suggestionId

  function handleContact() {
    if (!suggestion.suggestionId) return
    startTransition(async () => {
      await updateSuggestionStatus(suggestion.suggestionId!, 'contacted')
    })
  }

  function handleDismiss() {
    if (!suggestion.suggestionId) return
    startTransition(async () => {
      await updateSuggestionStatus(suggestion.suggestionId!, 'dismissed')
    })
  }

  if (suggestion.status === 'dismissed') return null

  return (
    <div
      className={`rounded-lg border p-3 flex items-start justify-between gap-3 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'} ${suggestion.status !== 'pending' ? 'border-stone-800 bg-stone-800' : 'border-stone-700 bg-surface'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-100 truncate">{suggestion.clientName}</p>
        <p className="text-xs text-stone-500 mt-0.5">{suggestion.reason}</p>
        {suggestion.avgSpendCents > 0 && (
          <p className="text-xs text-stone-400 mt-0.5">
            Lifetime value: {dollars(suggestion.lifetimeValueCents)}
          </p>
        )}
        {suggestion.status !== 'pending' && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-stone-500">
            {suggestion.status === 'contacted' && <Clock className="h-3 w-3" />}
            {suggestion.status === 'booked' && <CheckCircle className="h-3 w-3 text-emerald-600" />}
            {STATUS_LABELS[suggestion.status]}
          </span>
        )}
      </div>

      {isActionable && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleContact}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            title="Mark as contacted"
          >
            <PhoneCall className="h-3 w-3" />
            Contact
          </button>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="rounded-md p-1.5 text-stone-400 hover:text-stone-400 hover:bg-stone-700 disabled:opacity-50 transition-colors"
            title="Dismiss suggestion"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
