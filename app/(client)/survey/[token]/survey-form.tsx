'use client'

import { useState, useTransition } from 'react'
import { submitSurveyResponse } from '@/lib/surveys/actions'
import { Button } from '@/components/ui/button'

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div>
      <p className="text-sm font-medium text-stone-700 mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-transform hover:scale-110"
          >
            {star <= (hovered || value) ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── NPS Helpers ──────────────────────────────────────────────────────────────

function npsLabel(score: number): string {
  if (score <= 6) return 'Detractor'
  if (score <= 8) return 'Passive'
  return 'Promoter'
}

function npsEmoji(score: number): string {
  if (score <= 4) return '😞'
  if (score <= 6) return '😐'
  if (score <= 8) return '🙂'
  return '😍'
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function SurveyForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nps, setNps] = useState(-1)
  const [overall, setOverall] = useState(0)
  const [foodQuality, setFoodQuality] = useState(0)
  const [service, setService] = useState(0)
  const [value, setValue] = useState(0)
  const [presentation, setPresentation] = useState(0)
  const [wouldRebook, setWouldRebook] = useState<boolean | null>(null)
  const [highlight, setHighlight] = useState('')
  const [improvement, setImprovement] = useState('')
  const [testimonial, setTestimonial] = useState('')
  const [consent, setConsent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nps < 0) { setError('Please select your likelihood to recommend score.'); return }
    if (overall === 0) { setError('Please rate your overall experience.'); return }
    setError(null)

    startTransition(async () => {
      const result = await submitSurveyResponse({
        token,
        npsScore: nps,
        overallRating: overall,
        foodQualityRating: foodQuality || overall,
        serviceRating: service || overall,
        valueRating: value || overall,
        presentationRating: presentation || overall,
        wouldRebook: wouldRebook ?? true,
        highlightText: highlight,
        improvementText: improvement,
        testimonialText: testimonial,
        consentToDisplay: testimonial ? consent : false,
      })
      if (result.ok) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Thank you so much!</h2>
        <p className="text-stone-600">Your feedback means a lot. It helps create better experiences for every guest.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* NPS */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h2 className="font-semibold text-stone-900 mb-1">
          How likely are you to recommend this chef to a friend or family member?
        </h2>
        <p className="text-xs text-stone-500 mb-4">0 = Not at all likely · 10 = Extremely likely</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNps(i)}
              className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${
                nps === i
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        {nps >= 0 && (
          <p className="mt-3 text-sm text-stone-500">
            {npsEmoji(nps)} {npsLabel(nps)}
          </p>
        )}
      </div>

      {/* Star ratings */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-5">
        <h2 className="font-semibold text-stone-900">Rate your experience</h2>
        <StarRating label="Overall experience *" value={overall} onChange={setOverall} />
        <StarRating label="Food quality" value={foodQuality} onChange={setFoodQuality} />
        <StarRating label="Service" value={service} onChange={setService} />
        <StarRating label="Presentation" value={presentation} onChange={setPresentation} />
        <StarRating label="Value for money" value={value} onChange={setValue} />
      </div>

      {/* Would rebook */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h2 className="font-semibold text-stone-900 mb-3">Would you book again?</h2>
        <div className="flex gap-3">
          {(['Yes, definitely', 'Maybe', 'No'] as const).map((label) => {
            const val = label === 'No' ? false : true
            const selected = wouldRebook === val && (label !== 'Maybe' || wouldRebook === null)
            // Simplify: Yes = true, No = false, Maybe = null stays null
            const actualVal = label === 'No' ? false : label === 'Maybe' ? null : true
            const isSelected = wouldRebook === actualVal
            return (
              <button
                key={label}
                type="button"
                onClick={() => setWouldRebook(actualVal)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Open-ended */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">In your own words</h2>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            What was the highlight of your experience?
          </label>
          <textarea
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            rows={3}
            placeholder="The food, the atmosphere, a specific dish..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Is there anything that could be improved?
          </label>
          <textarea
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            rows={3}
            placeholder="Honest feedback helps us grow..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Would you like to leave a testimonial?
          </label>
          <textarea
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            rows={3}
            placeholder="Feel free to write something we could share (optional)..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
          />
        </div>

        {testimonial.trim().length > 0 && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300"
            />
            <span className="text-sm text-stone-600">
              I give permission to share my testimonial publicly (name will not be included without separate consent).
            </span>
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? 'Submitting…' : 'Submit Feedback'}
      </Button>
    </form>
  )
}
