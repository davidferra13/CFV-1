'use client'

import { useState } from 'react'
import { submitTestimonial } from '@/lib/testimonials/actions'

type Props = {
  shareToken: string
  guestName?: string | null
  guestToken?: string | null
}

export function TestimonialForm({ shareToken, guestName, guestToken }: Props) {
  const [name, setName] = useState(guestName || '')
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !text.trim()) return

    setLoading(true)
    setError('')

    try {
      await submitTestimonial({
        shareToken,
        guestToken: guestToken || undefined,
        guestName: name.trim(),
        testimonial: text.trim(),
        rating: rating > 0 ? rating : undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-stone-900 mb-1">Thank you!</p>
        <p className="text-sm text-stone-500">Your kind words mean a lot.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      {/* Star rating */}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">How was the experience?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star === rating ? 0 : star)}
              className="text-2xl transition-transform hover:scale-110"
            >
              {star <= rating ? (
                <span className="text-amber-400">&#9733;</span>
              ) : (
                <span className="text-stone-300">&#9733;</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      {!guestName && (
        <div>
          <label
            htmlFor="testimonial-name"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Your Name
          </label>
          <input
            id="testimonial-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400"
          />
        </div>
      )}

      {/* Testimonial text */}
      <div>
        <label htmlFor="testimonial-text" className="block text-sm font-medium text-stone-700 mb-1">
          Share your thoughts
        </label>
        <textarea
          id="testimonial-text"
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="The food was incredible..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-900 placeholder:text-stone-400 resize-none"
        />
        <p className="text-xs text-stone-400 mt-1 text-right">{text.length}/1000</p>
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || !text.trim()}
        className="w-full bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Leave a Review'}
      </button>
    </form>
  )
}
