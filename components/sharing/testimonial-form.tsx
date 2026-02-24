'use client'

import { useState } from 'react'
import { submitTestimonial } from '@/lib/testimonials/actions'

type Props = {
  shareToken: string
  guestName?: string | null
  guestToken?: string | null
  chefName?: string | null
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-300">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === value ? 0 : star)}
            className="text-2xl transition-transform hover:scale-110 leading-none"
          >
            {star <= value ? (
              <span className="text-amber-400">&#9733;</span>
            ) : (
              <span className="text-stone-300">&#9733;</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TestimonialForm({ shareToken, guestName, guestToken, chefName }: Props) {
  const [name, setName] = useState(guestName || '')
  const [text, setText] = useState('')
  const [foodRating, setFoodRating] = useState<number>(0)
  const [chefRating, setChefRating] = useState<number>(0)
  const [foodHighlight, setFoodHighlight] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
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
        foodRating: foodRating > 0 ? foodRating : undefined,
        chefRating: chefRating > 0 ? chefRating : undefined,
        foodHighlight: foodHighlight.trim() || undefined,
        wouldRecommend: wouldRecommend ?? undefined,
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
        <div className="w-12 h-12 bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-stone-100 mb-1">Thank you!</p>
        <p className="text-sm text-stone-500">Your kind words mean a lot.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-red-950 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      {/* Dual star ratings */}
      <div className="space-y-3 bg-stone-800 rounded-xl p-4">
        <StarRow label="The Food" value={foodRating} onChange={setFoodRating} />
        <div className="border-t border-stone-700" />
        <StarRow
          label={chefName ? `${chefName}` : 'The Chef'}
          value={chefRating}
          onChange={setChefRating}
        />
      </div>

      {/* Would recommend */}
      <div>
        <p className="text-sm font-medium text-stone-300 mb-2">
          Would you recommend this experience?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldRecommend(wouldRecommend === true ? null : true)}
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              wouldRecommend === true
                ? 'border-emerald-500 bg-emerald-950 text-emerald-700'
                : 'border-stone-700 text-stone-500 hover:border-stone-600'
            }`}
          >
            Absolutely
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(wouldRecommend === false ? null : false)}
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              wouldRecommend === false
                ? 'border-stone-500 bg-stone-800 text-stone-300'
                : 'border-stone-700 text-stone-500 hover:border-stone-600'
            }`}
          >
            Not sure
          </button>
        </div>
      </div>

      {/* Name */}
      {!guestName && (
        <div>
          <label
            htmlFor="testimonial-name"
            className="block text-sm font-medium text-stone-300 mb-1"
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
            className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
          />
        </div>
      )}

      {/* Favorite dish */}
      <div>
        <label htmlFor="food-highlight" className="block text-sm font-medium text-stone-300 mb-1">
          Favorite dish? <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          id="food-highlight"
          type="text"
          value={foodHighlight}
          onChange={(e) => setFoodHighlight(e.target.value)}
          placeholder="e.g., The truffle risotto was unreal"
          maxLength={200}
          className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
        />
      </div>

      {/* Written review */}
      <div>
        <label htmlFor="testimonial-text" className="block text-sm font-medium text-stone-300 mb-1">
          Tell us about the experience
        </label>
        <textarea
          id="testimonial-text"
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What made the evening special..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 resize-none"
        />
        <p className="text-xs text-stone-400 mt-1 text-right">{text.length}/1000</p>
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || !text.trim()}
        className="w-full bg-brand-600 text-white px-4 py-3 rounded-lg font-semibold text-sm hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
