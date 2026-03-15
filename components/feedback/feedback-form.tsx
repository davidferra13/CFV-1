'use client'

import { useState } from 'react'
import { submitFeedback } from '@/lib/feedback/feedback-actions'

interface FeedbackFormProps {
  token: string
  eventTitle?: string
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 focus:outline-none"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              className={`h-8 w-8 transition-colors ${
                star <= (hover || value) ? 'text-amber-400' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

export function FeedbackForm({ token, eventTitle }: FeedbackFormProps) {
  const [overallRating, setOverallRating] = useState(0)
  const [foodRating, setFoodRating] = useState(0)
  const [serviceRating, setServiceRating] = useState(0)
  const [communicationRating, setCommunicationRating] = useState(0)
  const [favoriteDish, setFavoriteDish] = useState('')
  const [improvementSuggestions, setImprovementSuggestions] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [additionalComments, setAdditionalComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (overallRating === 0) {
      setError('Please provide an overall rating')
      return
    }

    setSubmitting(true)

    try {
      const result = await submitFeedback(token, {
        overallRating,
        foodRating: foodRating || overallRating,
        serviceRating: serviceRating || overallRating,
        communicationRating: communicationRating || overallRating,
        favoriteDish: favoriteDish || undefined,
        improvementSuggestions: improvementSuggestions || undefined,
        wouldRecommend: wouldRecommend ?? undefined,
        additionalComments: additionalComments || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Failed to submit feedback')
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error('[feedback] Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-lg bg-white p-8 text-center shadow-md">
        <svg
          className="mx-auto h-16 w-16 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Thank you!</h2>
        <p className="mt-2 text-gray-600">
          Your feedback has been submitted. We appreciate you taking the time to share your
          experience.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg space-y-6 rounded-lg bg-white p-8 shadow-md"
    >
      {eventTitle && (
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-gray-900">How was your experience?</h2>
          <p className="mt-1 text-sm text-gray-500">Event: {eventTitle}</p>
        </div>
      )}

      {!eventTitle && (
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-gray-900">How was your experience?</h2>
          <p className="mt-1 text-sm text-gray-500">We would love to hear your feedback</p>
        </div>
      )}

      <StarRating label="Overall Experience *" value={overallRating} onChange={setOverallRating} />
      <StarRating label="Food Quality" value={foodRating} onChange={setFoodRating} />
      <StarRating label="Service" value={serviceRating} onChange={setServiceRating} />
      <StarRating
        label="Communication"
        value={communicationRating}
        onChange={setCommunicationRating}
      />

      <div>
        <label htmlFor="favoriteDish" className="block text-sm font-medium text-gray-700">
          What was your favorite dish?
        </label>
        <input
          id="favoriteDish"
          type="text"
          value={favoriteDish}
          onChange={(e) => setFavoriteDish(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="e.g., The seared salmon was incredible"
        />
      </div>

      <div>
        <label htmlFor="improvements" className="block text-sm font-medium text-gray-700">
          Any suggestions for improvement?
        </label>
        <textarea
          id="improvements"
          value={improvementSuggestions}
          onChange={(e) => setImprovementSuggestions(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="We value honest feedback to keep improving"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Would you recommend us to others?
        </label>
        <div className="mt-2 flex gap-4">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              wouldRecommend === true
                ? 'bg-green-100 text-green-800 ring-2 ring-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
            Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              wouldRecommend === false
                ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
              />
            </svg>
            No
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
          Additional comments
        </label>
        <textarea
          id="comments"
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="Anything else you'd like to share?"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || overallRating === 0}
        className="w-full rounded-md bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}
