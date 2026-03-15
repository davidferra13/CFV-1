'use client'

import { useState } from 'react'
import { submitTestimonialByToken } from '@/lib/testimonials/submit-testimonial'

const starLabels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)

  return (
    <div>
      <label className="block text-sm font-medium text-stone-200 mb-2">
        Overall Rating <span className="text-red-400">*</span>
      </label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="text-3xl transition-colors"
            style={{
              color: star <= (hover || value) ? '#e8b84b' : '#4a4540',
            }}
          >
            ★
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className="ml-2 text-sm text-stone-400">{starLabels[(hover || value) - 1]}</span>
        )}
      </div>
    </div>
  )
}

export function ReviewForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [displayName, setDisplayName] = useState(defaultName)
  const [allowPublic, setAllowPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating.')
      return
    }
    if (!content.trim()) {
      setError('Please share your experience.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await submitTestimonialByToken({
        token,
        rating,
        content: content.trim(),
        displayName: displayName.trim() || undefined,
        allowPublicDisplay: allowPublic,
      })

      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
      } else {
        setDone(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-xl font-bold text-stone-100 mb-2">Thank you!</h2>
        <p className="text-stone-400">
          Your review has been submitted. We appreciate you taking the time to share your
          experience.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-6 space-y-5"
    >
      {/* Star Rating */}
      <StarRating value={rating} onChange={setRating} />

      {/* Review Content */}
      <div>
        <label htmlFor="review-content" className="block text-sm font-medium text-stone-200 mb-2">
          Your Review <span className="text-red-400">*</span>
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={5}
          maxLength={2000}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
        />
        <p className="text-xs text-stone-500 mt-1">{content.length}/2000</p>
      </div>

      {/* Display Name */}
      <div>
        <label htmlFor="display-name" className="block text-sm font-medium text-stone-200 mb-2">
          Display Name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <p className="text-xs text-stone-500 mt-1">
          This is the name that will be shown with your review.
        </p>
      </div>

      {/* Public Display Consent */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={allowPublic}
          onChange={(e) => setAllowPublic(e.target.checked)}
          className="mt-0.5 rounded border-stone-600 bg-stone-800 text-brand-600 focus:ring-brand-600"
        />
        <span className="text-sm text-stone-300">
          Allow this review to be displayed publicly on the chef&apos;s website
        </span>
      </label>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
