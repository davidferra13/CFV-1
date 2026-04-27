'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { submitGuestFeedback } from '@/lib/sharing/actions'

type GuestFeedbackDish = {
  id: string
  name: string
  course_name: string | null
}

type DishFeedbackState = {
  sentiment: 'liked' | 'neutral' | 'disliked' | null
  rating: number
  comment: string
}

const STAR = '\u2605'
const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']
const DISH_SENTIMENT_OPTIONS = [
  { value: 'liked', label: 'Like' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'disliked', label: 'Dislike' },
] as const

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const [hover, setHover] = useState(0)
  const activeValue = hover || value

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-stone-200" id={`star-label-${label.replace(/\s+/g, '-').toLowerCase()}`}>{label}</label>
      <div className="flex items-center gap-1" role="radiogroup" aria-labelledby={`star-label-${label.replace(/\s+/g, '-').toLowerCase()}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star ? 'true' : 'false'}
            aria-label={`Rate ${star} out of 5 stars, ${STAR_LABELS[star - 1]}`}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="text-2xl transition-colors"
            style={{ color: star <= activeValue ? '#e8b84b' : '#4a4540' }}
          >
            {STAR}
          </button>
        ))}
        {activeValue > 0 ? (
          <span className="ml-2 text-xs text-stone-400">{STAR_LABELS[activeValue - 1]}</span>
        ) : null}
      </div>
    </div>
  )
}

export function GuestFeedbackForm({
  token,
  dishes,
}: {
  token: string
  dishes: GuestFeedbackDish[]
}) {
  const [overall, setOverall] = useState(0)
  const [food, setFood] = useState(0)
  const [experience, setExperience] = useState(0)
  const [highlight, setHighlight] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [testimonial, setTestimonial] = useState(false)
  const [dishFeedback, setDishFeedback] = useState<Record<string, DishFeedbackState>>({})
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const successRef = useRef<HTMLDivElement>(null)

  function updateDishFeedback(dishId: string, patch: Partial<DishFeedbackState>) {
    setDishFeedback((current) => ({
      ...current,
      [dishId]: {
        sentiment: current[dishId]?.sentiment ?? null,
        rating: current[dishId]?.rating ?? 0,
        comment: current[dishId]?.comment ?? '',
        ...patch,
      },
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (overall === 0) {
      setError('Please rate your overall experience.')
      return
    }

    setError('')
    startTransition(async () => {
      try {
        await submitGuestFeedback({
          token,
          overall_rating: overall,
          food_rating: food || undefined,
          experience_rating: experience || undefined,
          highlight_text: highlight || undefined,
          suggestion_text: suggestion || undefined,
          testimonial_consent: testimonial,
          dish_feedback:
            dishes.length > 0
              ? dishes
                  .filter((dish) => {
                    const entry = dishFeedback[dish.id]
                    return Boolean(entry?.sentiment || entry?.rating || entry?.comment)
                  })
                  .map((dish) => ({
                    dish_id: dish.id,
                    dish_name: dish.name,
                    sentiment: dishFeedback[dish.id]?.sentiment ?? undefined,
                    rating: dishFeedback[dish.id]?.rating || undefined,
                    comment: dishFeedback[dish.id]?.comment || undefined,
                  }))
              : undefined,
        })
        setDone(true)
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Failed to submit feedback.')
      }
    })
  }

  useEffect(() => {
    if (done && successRef.current) {
      successRef.current.focus()
    }
  }, [done])

  if (done) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-2xl border border-stone-700 bg-stone-900 p-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-stone-100">Thank you!</h2>
        <p className="text-stone-400">
          Your feedback helps ChefFlow learn what worked in the real world.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5 rounded-2xl border border-stone-700 bg-stone-900 p-6">
        <StarRating label="Overall experience *" value={overall} onChange={setOverall} />
        <StarRating label="Food quality (optional)" value={food} onChange={setFood} />
        <StarRating
          label="Atmosphere and service (optional)"
          value={experience}
          onChange={setExperience}
        />
      </div>

      {dishes.length > 0 ? (
        <div className="rounded-2xl border border-stone-700 bg-stone-900 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-stone-100">Dish feedback</h3>
            <p className="text-sm text-stone-400">
              Quick sentiment first. Rating and notes are optional.
            </p>
          </div>

          <div className="space-y-3">
            {dishes.map((dish) => {
              const feedback = dishFeedback[dish.id]
              return (
                <div key={dish.id} className="space-y-3 rounded-xl bg-stone-800 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-100">{dish.name}</p>
                      {dish.course_name ? (
                        <p className="text-xs text-stone-500">{dish.course_name}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {DISH_SENTIMENT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateDishFeedback(dish.id, {
                              sentiment: feedback?.sentiment === option.value ? null : option.value,
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            feedback?.sentiment === option.value
                              ? 'border-amber-500 bg-amber-950 text-amber-200'
                              : 'border-stone-700 bg-stone-900 text-stone-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-stone-500" id={`dish-rating-label-${dish.id}`}>Optional rating</span>
                    <div className="flex gap-0.5" role="radiogroup" aria-labelledby={`dish-rating-label-${dish.id}`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={(feedback?.rating ?? 0) === star ? 'true' : 'false'}
                          aria-label={`Rate ${dish.name} ${star} out of 5 stars`}
                          onClick={() =>
                            updateDishFeedback(dish.id, {
                              rating: feedback?.rating === star ? 0 : star,
                            })
                          }
                          className={`text-lg ${
                            star <= (feedback?.rating ?? 0) ? 'text-amber-400' : 'text-stone-600'
                          }`}
                        >
                          {STAR}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={feedback?.comment ?? ''}
                    onChange={(event) =>
                      updateDishFeedback(dish.id, {
                        comment: event.target.value,
                      })
                    }
                    placeholder="Optional note"
                    className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-stone-700 bg-stone-900 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-200">
            What stood out most?
          </label>
          <textarea
            value={highlight}
            onChange={(event) => setHighlight(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="The pacing, a specific dish, the overall experience..."
            className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-200">
            Anything we should improve?
          </label>
          <textarea
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Optional suggestion"
            className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={testimonial}
            onChange={(event) => setTestimonial(event.target.checked)}
            className="rounded"
          />
          I consent to my feedback being used as a testimonial
        </label>
      </div>

      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-stone-100 disabled:opacity-55"
        style={{ background: 'linear-gradient(135deg, #2b5d39 0%, #3f8451 100%)' }}
      >
        {isPending ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}
