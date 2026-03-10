'use client'

import { useState, useTransition } from 'react'
import { submitMealFeedback } from '@/lib/meal-prep/client-portal-actions'

type Rating = 'loved' | 'liked' | 'neutral' | 'disliked'

const RATING_EMOJIS: Record<Rating, { emoji: string; label: string; activeColor: string }> = {
  loved: { emoji: '\u2764\uFE0F', label: 'Loved', activeColor: 'text-emerald-400' },
  liked: { emoji: '\uD83D\uDC4D', label: 'Liked', activeColor: 'text-sky-400' },
  neutral: { emoji: '\uD83D\uDE10', label: 'Neutral', activeColor: 'text-stone-300' },
  disliked: { emoji: '\uD83D\uDC4E', label: 'Disliked', activeColor: 'text-red-400' },
}

interface MealHistoryFeedbackProps {
  weekId: string
  dishName: string
}

export function MealHistoryFeedback({ weekId, dishName }: MealHistoryFeedbackProps) {
  const [selected, setSelected] = useState<Rating | null>(null)
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  function handleRate(rating: Rating) {
    if (submitted) return
    const prev = selected
    setSelected(rating)
    startTransition(async () => {
      try {
        const result = await submitMealFeedback(weekId, dishName, rating)
        if (result.success) {
          setSubmitted(true)
        } else {
          setSelected(prev)
        }
      } catch {
        setSelected(prev)
      }
    })
  }

  return (
    <div className="flex gap-1">
      {(Object.entries(RATING_EMOJIS) as [Rating, (typeof RATING_EMOJIS)[Rating]][]).map(
        ([rating, config]) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRate(rating)}
            disabled={isPending || submitted}
            title={config.label}
            className={`text-lg p-1 rounded transition-opacity ${
              selected === rating
                ? 'opacity-100 scale-110'
                : selected
                  ? 'opacity-30'
                  : 'opacity-60 hover:opacity-100'
            } ${isPending ? 'cursor-wait' : submitted ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {config.emoji}
          </button>
        )
      )}
    </div>
  )
}
