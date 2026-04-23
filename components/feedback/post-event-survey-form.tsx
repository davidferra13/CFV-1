'use client'

import { useState, useTransition } from 'react'
import { submitSurveyResponse } from '@/lib/feedback/surveys-actions'

type Props = {
  token: string
  occasion: string
  dishes: { id: string; name: string; course_name: string | null }[]
  chefName: string
}

type DishFeedbackState = {
  sentiment: 'liked' | 'neutral' | 'disliked' | null
  rating: number
  comment: string
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-stone-300">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${
              star <= value ? 'text-amber-400' : 'text-stone-600 hover:text-stone-500'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export function PostEventSurveyForm({ token, occasion, dishes, chefName }: Props) {
  const [foodQuality, setFoodQuality] = useState(0)
  const [portionSize, setPortionSize] = useState(0)
  const [punctuality, setPunctuality] = useState(0)
  const [communication, setCommunication] = useState(0)
  const [presentation, setPresentation] = useState(0)
  const [cleanup, setCleanup] = useState(0)
  const [overall, setOverall] = useState(0)
  const [whatTheyLoved, setWhatTheyLoved] = useState('')
  const [whatCouldImprove, setWhatCouldImprove] = useState('')
  const [wouldBookAgain, setWouldBookAgain] = useState<boolean | null>(null)
  const [additionalComments, setAdditionalComments] = useState('')
  const [publicReviewText, setPublicReviewText] = useState('')
  const [publicReviewConsent, setPublicReviewConsent] = useState(false)
  const [dishFeedback, setDishFeedback] = useState<Record<string, DishFeedbackState>>({})
  const [submitted, setSubmitted] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!overall || wouldBookAgain === null) {
      setError('Please provide an overall rating and indicate if you would book again.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await submitSurveyResponse({
          token,
          food_quality: foodQuality || overall,
          portion_size: portionSize || overall,
          punctuality: punctuality || overall,
          communication_rating: communication || overall,
          presentation: presentation || overall,
          cleanup: cleanup || overall,
          overall,
          what_they_loved: whatTheyLoved || undefined,
          what_could_improve: whatCouldImprove || undefined,
          would_book_again: wouldBookAgain,
          additional_comments: additionalComments || undefined,
          public_review_text: publicReviewText || undefined,
          public_review_consent: publicReviewConsent,
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
                    sentiment: dishFeedback[dish.id].sentiment ?? undefined,
                    rating: dishFeedback[dish.id].rating || undefined,
                    comment: dishFeedback[dish.id].comment || undefined,
                  }))
              : undefined,
        })

        if (result.success) setSubmitted(true)
        else setError(result.error ?? 'Failed to submit feedback.')
      } catch {
        setError('An unexpected error occurred.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900 p-8 text-center">
        <div className="mb-4 text-4xl">🙏</div>
        <h2 className="mb-2 text-xl font-bold text-stone-100">Thank you for your feedback!</h2>
        <p className="text-stone-400">
          {chefName} will use your input to make future events even better.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-stone-800 bg-stone-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-stone-100">Overall Experience</h3>
        <StarRating
          value={overall}
          onChange={setOverall}
          label={`How was your ${occasion.toLowerCase()}?`}
        />

        <div className="mt-4">
          <label className="mb-2 block text-sm text-stone-300">
            Would you book {chefName} again?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWouldBookAgain(true)}
              className={`rounded border px-4 py-2 text-sm font-medium transition-colors ${
                wouldBookAgain === true
                  ? 'border-green-700 bg-green-900/50 text-green-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600'
              }`}
            >
              Yes, absolutely
            </button>
            <button
              type="button"
              onClick={() => setWouldBookAgain(false)}
              className={`rounded border px-4 py-2 text-sm font-medium transition-colors ${
                wouldBookAgain === false
                  ? 'border-red-700 bg-red-900/50 text-red-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600'
              }`}
            >
              Probably not
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-900 p-6">
        <h3 className="mb-4 text-lg font-semibold text-stone-100">Details (optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <StarRating value={foodQuality} onChange={setFoodQuality} label="Food quality" />
          <StarRating value={portionSize} onChange={setPortionSize} label="Portions" />
          <StarRating value={punctuality} onChange={setPunctuality} label="Punctuality" />
          <StarRating value={communication} onChange={setCommunication} label="Communication" />
          <StarRating value={presentation} onChange={setPresentation} label="Presentation" />
          <StarRating value={cleanup} onChange={setCleanup} label="Cleanup" />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-900 p-6">
        <div>
          <label className="mb-1 block text-sm text-stone-300">What did you love?</label>
          <textarea
            value={whatTheyLoved}
            onChange={(event) => setWhatTheyLoved(event.target.value)}
            rows={2}
            placeholder="Tell us what stood out..."
            className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-stone-300">What could be even better?</label>
          <textarea
            value={whatCouldImprove}
            onChange={(event) => setWhatCouldImprove(event.target.value)}
            rows={2}
            placeholder="Any suggestions for improvement..."
            className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-stone-300">Anything else? (optional)</label>
          <textarea
            value={additionalComments}
            onChange={(event) => setAdditionalComments(event.target.value)}
            rows={2}
            className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>
      </div>

      {overall >= 4 && (
        <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-900 p-6">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-stone-100">Optional public review</h3>
            <p className="text-sm text-stone-400">
              If you want, leave a short public note that may appear on {chefName}&apos;s profile.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-stone-300">Public review text</label>
            <textarea
              value={publicReviewText}
              onChange={(event) => setPublicReviewText(event.target.value)}
              rows={3}
              placeholder="The food was exceptional and the evening felt effortless..."
              className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
            />
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={publicReviewConsent}
              onChange={(event) => setPublicReviewConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-600"
            />
            <span className="text-sm text-stone-400">
              I consent to this note being used in ChefFlow&apos;s public review feed for {chefName}
              .
            </span>
          </label>
        </div>
      )}

      {dishes.length > 0 && (
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-6">
          <h3 className="mb-2 text-lg font-semibold text-stone-100">Dish Feedback (optional)</h3>
          <p className="mb-4 text-sm text-stone-400">
            Use the quick sentiment buttons first. Rating and notes are optional.
          </p>

          <div className="space-y-3">
            {dishes.map((dish) => {
              const feedback = dishFeedback[dish.id]
              return (
                <div key={dish.id} className="space-y-3 rounded bg-stone-800 p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-stone-200">{dish.name}</p>
                      {dish.course_name && (
                        <p className="text-xs text-stone-500">{dish.course_name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {[
                        { value: 'liked', label: 'Like' },
                        { value: 'neutral', label: 'Neutral' },
                        { value: 'disliked', label: 'Dislike' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateDishFeedback(dish.id, {
                              sentiment: option.value as DishFeedbackState['sentiment'],
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
                    <span className="text-xs text-stone-500">Optional rating</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => updateDishFeedback(dish.id, { rating: star })}
                          className={`text-lg ${
                            star <= (feedback?.rating ?? 0) ? 'text-amber-400' : 'text-stone-600'
                          }`}
                        >
                          ★
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
                    className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-amber-600 py-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}
