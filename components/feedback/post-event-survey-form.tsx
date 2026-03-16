'use client'

import { useState, useTransition } from 'react'
import { submitSurveyResponse } from '@/lib/feedback/surveys'

type Props = {
  token: string
  occasion: string
  dishes: { id: string; name: string; course_name: string | null }[]
  chefName: string
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
      <label className="block text-sm text-stone-300 mb-1">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${star <= value ? 'text-amber-400' : 'text-stone-600 hover:text-stone-500'}`}
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
  const [dishFeedback, setDishFeedback] = useState<
    Record<string, { rating: number; comment: string }>
  >({})
  const [submitted, setSubmitted] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
          dish_feedback:
            dishes.length > 0
              ? dishes
                  .filter((d) => dishFeedback[d.id]?.rating)
                  .map((d) => ({
                    dish_id: d.id,
                    dish_name: d.name,
                    rating: dishFeedback[d.id].rating,
                    comment: dishFeedback[d.id].comment || undefined,
                  }))
              : undefined,
        })

        if (result.success) {
          setSubmitted(true)
        } else {
          setError(result.error ?? 'Failed to submit feedback.')
        }
      } catch {
        setError('An unexpected error occurred.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">&#x1F64F;</div>
        <h2 className="text-xl font-bold text-stone-100 mb-2">Thank you for your feedback!</h2>
        <p className="text-stone-400">
          {chefName} will use your input to make future events even better.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Overall Rating */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-stone-100 mb-4">Overall Experience</h3>
        <StarRating
          value={overall}
          onChange={setOverall}
          label="How was your overall experience?"
        />

        <div className="mt-4">
          <label className="block text-sm text-stone-300 mb-2">
            Would you book {chefName} again?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWouldBookAgain(true)}
              className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                wouldBookAgain === true
                  ? 'bg-green-900/50 border-green-700 text-green-300'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              Yes, absolutely!
            </button>
            <button
              type="button"
              onClick={() => setWouldBookAgain(false)}
              className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                wouldBookAgain === false
                  ? 'bg-red-900/50 border-red-700 text-red-300'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
              }`}
            >
              Probably not
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-stone-100 mb-4">Details (optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <StarRating value={foodQuality} onChange={setFoodQuality} label="Food Quality" />
          <StarRating value={portionSize} onChange={setPortionSize} label="Portions" />
          <StarRating value={punctuality} onChange={setPunctuality} label="Punctuality" />
          <StarRating value={communication} onChange={setCommunication} label="Communication" />
          <StarRating value={presentation} onChange={setPresentation} label="Presentation" />
          <StarRating value={cleanup} onChange={setCleanup} label="Cleanup" />
        </div>
      </div>

      {/* Open Text */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm text-stone-300 mb-1">What did you love?</label>
          <textarea
            value={whatTheyLoved}
            onChange={(e) => setWhatTheyLoved(e.target.value)}
            rows={2}
            placeholder="Tell us what stood out..."
            className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm placeholder-stone-500"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-300 mb-1">What could be even better?</label>
          <textarea
            value={whatCouldImprove}
            onChange={(e) => setWhatCouldImprove(e.target.value)}
            rows={2}
            placeholder="Any suggestions for improvement..."
            className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm placeholder-stone-500"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-300 mb-1">Anything else? (optional)</label>
          <textarea
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            rows={2}
            className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-stone-100 text-sm placeholder-stone-500"
          />
        </div>
      </div>

      {/* Dish Feedback */}
      {dishes.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-stone-100 mb-4">Rate the Dishes (optional)</h3>
          <div className="space-y-3">
            {dishes.map((dish) => (
              <div key={dish.id} className="flex items-center gap-4 p-3 bg-stone-800 rounded">
                <div className="flex-1">
                  <p className="text-sm text-stone-200">{dish.name}</p>
                  {dish.course_name && <p className="text-xs text-stone-500">{dish.course_name}</p>}
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setDishFeedback((prev) => ({
                          ...prev,
                          [dish.id]: {
                            ...prev[dish.id],
                            rating: star,
                            comment: prev[dish.id]?.comment ?? '',
                          },
                        }))
                      }
                      className={`text-lg ${
                        star <= (dishFeedback[dish.id]?.rating ?? 0)
                          ? 'text-amber-400'
                          : 'text-stone-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}
