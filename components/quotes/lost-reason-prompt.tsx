'use client'

import { useState, useTransition } from 'react'
import { recordLostReason } from '@/lib/quotes/loss-analysis-actions'
import { X } from 'lucide-react'

interface LostReasonPromptProps {
  quoteId: string
  onDismiss: () => void
}

const REASON_OPTIONS = [
  { value: 'price_too_high', label: 'Price too high' },
  { value: 'chose_another_chef', label: 'Chose another chef' },
  { value: 'date_not_available', label: 'Date not available' },
  { value: 'cuisine_not_right_fit', label: 'Cuisine not right fit' },
  { value: 'client_lost_interest', label: 'Client lost interest' },
  { value: 'other', label: 'Other' },
]

export function LostReasonPrompt({ quoteId, onDismiss }: LostReasonPromptProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      try {
        await recordLostReason(quoteId, selected, notes.trim() || undefined)
        setSubmitted(true)
        setTimeout(onDismiss, 1500)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-950 px-4 py-3 text-sm text-green-800">
        Feedback recorded. Thanks for tracking this.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-stone-200">
          Quick feedback — why did this quote not convert?
          <span className="ml-1 font-normal text-stone-500">(optional)</span>
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 text-stone-400 hover:text-stone-400 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {REASON_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name={`lost-reason-${quoteId}`}
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-stone-300 group-hover:text-stone-100">{opt.label}</span>
          </label>
        ))}
      </div>

      {selected === 'other' && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Please describe..."
          className="w-full rounded-md border border-stone-600 px-3 py-2 text-sm text-stone-100 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!selected || isPending}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving…' : 'Submit'}
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md border border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-400 hover:bg-stone-700 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
