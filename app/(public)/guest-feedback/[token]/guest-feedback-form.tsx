'use client'

import { useState } from 'react'
import { submitGuestFeedback } from '@/lib/sharing/actions'

const starLabels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

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
    <div>
      <label className="block text-sm font-medium text-stone-200 mb-2">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="text-2xl transition-colors"
            style={{
              color: star <= (hover || value) ? '#e8b84b' : '#4a4540',
            }}
          >
            ★
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className="ml-2 text-xs text-stone-400">{starLabels[(hover || value) - 1]}</span>
        )}
      </div>
    </div>
  )
}

export function GuestFeedbackForm({ token }: { token: string }) {
  const [overall, setOverall] = useState(0)
  const [food, setFood] = useState(0)
  const [experience, setExperience] = useState(0)
  const [highlight, setHighlight] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [testimonial, setTestimonial] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (overall === 0) {
      setError('Please rate your overall experience.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await submitGuestFeedback({
        token,
        overall_rating: overall,
        food_rating: food || undefined,
        experience_rating: experience || undefined,
        highlight_text: highlight || undefined,
        suggestion_text: suggestion || undefined,
        testimonial_consent: testimonial,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-8 text-center">
        <h2 className="text-xl font-bold text-stone-100 mb-2">Thank you!</h2>
        <p className="text-stone-400">Your feedback means a lot. Enjoy the rest of your day!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6 space-y-5">
        <StarRating label="Overall experience *" value={overall} onChange={setOverall} />
        <StarRating label="Food quality (optional)" value={food} onChange={setFood} />
        <StarRating
          label="Atmosphere and service (optional)"
          value={experience}
          onChange={setExperience}
        />
      </div>

      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-2">
            What was the highlight of the evening?
          </label>
          <textarea
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="The seared scallops were incredible..."
            className="w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-200 mb-2">
            Any suggestions for improvement?
          </label>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Everything was great, just a thought..."
            className="w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={testimonial}
            onChange={(e) => setTestimonial(e.target.checked)}
            className="rounded"
          />
          I consent to my feedback being used as a testimonial
        </label>
      </div>

      {error && <p className="text-sm text-amber-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-stone-100 disabled:opacity-55"
        style={{ background: 'linear-gradient(135deg, #2b5d39 0%, #3f8451 100%)' }}
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}
