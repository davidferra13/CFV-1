'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import {
  getFeedbackRequestByToken,
  submitPublicFeedback,
} from '@/lib/feedback/public-feedback-actions'

const TAGS = [
  { value: 'food_quality', label: 'Food Quality' },
  { value: 'service', label: 'Service' },
  { value: 'timing', label: 'Timing' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'value', label: 'Value' },
]

export default function PublicFeedbackPage() {
  const params = useParams()
  const token = params.token as string
  const [isPending, startTransition] = useTransition()

  const [request, setRequest] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    startTransition(async () => {
      try {
        const result = await getFeedbackRequestByToken(token)
        if (!result.found) {
          setNotFound(true)
        } else if (result.request?.status === 'completed') {
          setSubmitted(true)
          setRequest(result.request)
        } else {
          setRequest(result.request)
        }
      } catch {
        setNotFound(true)
      }
    })
  }, [token])

  function handleSubmit() {
    if (rating === 0) {
      setSubmitError('Please select a rating')
      return
    }

    setSubmitError(null)
    startTransition(async () => {
      try {
        const result = await submitPublicFeedback({
          token,
          rating,
          comment: comment || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          wouldRecommend: wouldRecommend ?? undefined,
        })

        if (result.success) {
          setSubmitted(true)
        } else {
          setSubmitError(result.error || 'Something went wrong')
        }
      } catch {
        setSubmitError('Failed to submit feedback. Please try again.')
      }
    })
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // Loading
  if (isPending && !request && !notFound && !submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Loading...</p>
      </div>
    )
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Link Not Found</h1>
          <p className="text-stone-600">
            This feedback link is invalid or has expired. Please contact your chef for a new link.
          </p>
        </div>
      </div>
    )
  }

  // Already submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Thank You!</h1>
          <p className="text-stone-600">
            Your feedback has been submitted. It means a lot and helps us continue to improve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">How was your experience?</h1>
          {request?.chefName && <p className="text-stone-500 mb-6">with {request.chefName}</p>}

          {/* Star Rating */}
          <div className="mb-6">
            <label className="text-sm font-medium text-stone-700 block mb-2">
              Rate your experience
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} star`}
                >
                  <span
                    className={
                      star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-stone-300'
                    }
                  >
                    {'\u2605'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="text-sm font-medium text-stone-700 block mb-2">
              Any comments? (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you loved, or what we could improve..."
              rows={4}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="text-sm font-medium text-stone-700 block mb-2">
              What stood out? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedTags.includes(tag.value)
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Would Recommend */}
          <div className="mb-8">
            <label className="text-sm font-medium text-stone-700 block mb-2">
              Would you recommend us?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  wouldRecommend === true
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  wouldRecommend === false
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Error */}
          {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || rating === 0}
            className="w-full py-3 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
