'use client'

// Survey Form — client component for the public satisfaction survey page
// Handles all form state and calls submitSurveyResponse on submit

import { useState } from 'react'
import { submitSurveyResponse } from '@/lib/surveys/actions'
import { Button } from '@/components/ui/button'

type Props = {
  token: string
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
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-stone-300">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${star <= value ? 'text-amber-400' : 'text-stone-300 hover:text-amber-300'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export function SurveyForm({ token }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [overallRating, setOverallRating] = useState(0)
  const [foodQualityRating, setFoodQualityRating] = useState(0)
  const [serviceRating, setServiceRating] = useState(0)
  const [valueRating, setValueRating] = useState(0)
  const [presentationRating, setPresentationRating] = useState(0)
  const [wouldRebook, setWouldRebook] = useState<boolean | null>(null)
  const [highlightText, setHighlightText] = useState('')
  const [improvementText, setImprovementText] = useState('')
  const [testimonialText, setTestimonialText] = useState('')
  const [consentToDisplay, setConsentToDisplay] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (npsScore === null || overallRating === 0 || wouldRebook === null) {
      setError('Please answer all required questions.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await submitSurveyResponse({
      token,
      npsScore,
      overallRating,
      foodQualityRating,
      serviceRating,
      valueRating,
      presentationRating,
      wouldRebook,
      highlightText,
      improvementText,
      testimonialText,
      consentToDisplay,
    })
    setLoading(false)
    if (result.ok) {
      setSubmitted(true)
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm border border-stone-700 p-8 text-center">
        <div className="text-4xl mb-4">🙏</div>
        <h2 className="text-xl font-bold text-stone-100 mb-2">Thank you!</h2>
        <p className="text-stone-400">
          Your feedback means a great deal. See you at the table again soon.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-2xl shadow-sm border border-stone-700 p-6 space-y-6"
    >
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* NPS */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-300">
          How likely are you to recommend this chef to a friend?{' '}
          <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNpsScore(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                npsScore === i
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-surface text-stone-300 border-stone-700 hover:border-stone-400'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-stone-400 pt-1">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>
      </div>

      {/* Star ratings */}
      <div className="space-y-4">
        <StarRating
          label="Overall experience *"
          value={overallRating}
          onChange={setOverallRating}
        />
        <StarRating
          label="Food quality"
          value={foodQualityRating}
          onChange={setFoodQualityRating}
        />
        <StarRating label="Service" value={serviceRating} onChange={setServiceRating} />
        <StarRating label="Value for money" value={valueRating} onChange={setValueRating} />
        <StarRating
          label="Presentation"
          value={presentationRating}
          onChange={setPresentationRating}
        />
      </div>

      {/* Would rebook */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-300">
          Would you book again? <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {(
            [
              { label: 'Yes', value: true },
              { label: 'No', value: false },
            ] as const
          ).map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => setWouldRebook(value)}
              className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                wouldRebook === value
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-surface text-stone-300 border-stone-700 hover:border-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Open text */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-300">
            What was the highlight of the evening?
          </label>
          <textarea
            value={highlightText}
            onChange={(e) => setHighlightText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-600"
            placeholder="The lamb was extraordinary..."
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-300">
            Anything we could improve?
          </label>
          <textarea
            value={improvementText}
            onChange={(e) => setImprovementText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-600"
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-300">
            Leave a short testimonial (optional)
          </label>
          <textarea
            value={testimonialText}
            onChange={(e) => setTestimonialText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-600"
            placeholder="This was the most memorable dinner party..."
          />
        </div>
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consentToDisplay}
          onChange={(e) => setConsentToDisplay(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-stone-600 text-stone-100"
        />
        <span className="text-sm text-stone-400">
          I consent to this feedback being displayed on the chef&apos;s profile (anonymised if
          preferred).
        </span>
      </label>

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        Submit feedback
      </Button>
    </form>
  )
}
