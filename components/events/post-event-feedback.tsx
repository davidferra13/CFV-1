'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { recordPostEventFeedback, type PreferenceRating } from '@/lib/clients/preference-actions'

type DishFeedback = {
  dishName: string
  rating: PreferenceRating | null
  notes: string
}

const RATING_OPTIONS: {
  value: PreferenceRating
  icon: string
  label: string
  activeClass: string
}[] = [
  {
    value: 'loved',
    icon: '♥',
    label: 'Loved',
    activeClass: 'bg-rose-900/60 text-rose-300 border-rose-700',
  },
  {
    value: 'liked',
    icon: '👍',
    label: 'Liked',
    activeClass: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  },
  {
    value: 'neutral',
    icon: '-',
    label: 'Neutral',
    activeClass: 'bg-stone-700 text-stone-300 border-stone-600',
  },
  {
    value: 'disliked',
    icon: '👎',
    label: 'Disliked',
    activeClass: 'bg-amber-900/60 text-amber-300 border-amber-700',
  },
]

export function PostEventFeedback({
  eventId,
  clientId,
  dishes,
}: {
  eventId: string
  clientId: string
  dishes: string[]
}) {
  const [feedback, setFeedback] = useState<DishFeedback[]>([])
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())

  useEffect(() => {
    setFeedback(dishes.map((name) => ({ dishName: name, rating: null, notes: '' })))
  }, [dishes])

  function setRating(index: number, rating: PreferenceRating) {
    setFeedback((prev) => prev.map((item, i) => (i === index ? { ...item, rating } : item)))
  }

  function setNotes(index: number, notes: string) {
    setFeedback((prev) => prev.map((item, i) => (i === index ? { ...item, notes } : item)))
  }

  function toggleNotes(index: number) {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function handleSave() {
    const rated = feedback.filter((f) => f.rating !== null)
    if (rated.length === 0) return

    setError(null)
    startTransition(async () => {
      try {
        await recordPostEventFeedback(
          eventId,
          clientId,
          rated.map((f) => ({
            dishName: f.dishName,
            rating: f.rating!,
            notes: f.notes.trim() || null,
          }))
        )
        setSaved(true)
      } catch (err) {
        setError('Failed to save feedback. Please try again.')
      }
    })
  }

  const ratedCount = feedback.filter((f) => f.rating !== null).length

  if (dishes.length === 0) {
    return (
      <Card className="bg-stone-900 border-stone-800">
        <CardContent className="py-6">
          <p className="text-sm text-stone-500">
            No dishes found for this event. Add a menu with dishes to collect feedback.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (saved) {
    return (
      <Card className="bg-stone-900 border-stone-800">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-emerald-400 font-medium">
            Feedback saved. {ratedCount} dish{ratedCount !== 1 ? 'es' : ''} rated.
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Preferences have been added to the client's culinary signal history.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-stone-100">Post-Event Feedback</CardTitle>
        <p className="text-xs text-stone-500">
          Rate each dish to build the client's culinary signal history over time.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {feedback.map((item, index) => (
          <div key={index} className="p-3 rounded bg-stone-800/40 border border-stone-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-stone-100 truncate">{item.dishName}</span>
              <button
                type="button"
                onClick={() => toggleNotes(index)}
                className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
              >
                {expandedNotes.has(index) ? 'Hide notes' : 'Add note'}
              </button>
            </div>

            {/* Rating buttons */}
            <div className="flex gap-1.5">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRating(index, opt.value)}
                  title={opt.label}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                    item.rating === opt.value
                      ? opt.activeClass
                      : 'bg-stone-900 text-stone-500 border-stone-700 hover:border-stone-600'
                  }`}
                >
                  <span className="block text-sm">{opt.icon}</span>
                  <span className="block mt-0.5 text-xxs">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Notes (expandable) */}
            {expandedNotes.has(index) && (
              <Textarea
                placeholder="Optional notes about this dish..."
                value={item.notes}
                onChange={(e) => setNotes(index, e.target.value)}
                rows={2}
                className="mt-2 bg-stone-900 text-xs"
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={ratedCount === 0 || isPending}
          className="w-full"
        >
          {isPending
            ? 'Saving...'
            : `Save Feedback (${ratedCount} dish${ratedCount !== 1 ? 'es' : ''} rated)`}
        </Button>
      </CardContent>
    </Card>
  )
}
