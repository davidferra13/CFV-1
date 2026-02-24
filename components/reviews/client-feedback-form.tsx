// Client Feedback Form — Inline on completed event detail page
// Collects star rating, written feedback, and display consent.
// After submission, shows Google Review CTA.

'use client'

import { useState, useTransition } from 'react'
import { submitClientReview, recordGoogleReviewClick } from '@/lib/reviews/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

interface ClientFeedbackFormProps {
  eventId: string
  googleReviewUrl: string | null
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5 transition-transform hover:scale-110"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            className={`w-8 h-8 ${
              star <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-stone-300 fill-stone-300'
            } transition-colors`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export function ClientFeedbackForm({ eventId, googleReviewUrl }: ClientFeedbackFormProps) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [rating, setRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [whatTheyLoved, setWhatTheyLoved] = useState('')
  const [whatCouldImprove, setWhatCouldImprove] = useState('')
  const [displayConsent, setDisplayConsent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        await submitClientReview({
          event_id: eventId,
          rating,
          feedback_text: feedbackText || null,
          what_they_loved: whatTheyLoved || null,
          what_could_improve: whatCouldImprove || null,
          display_consent: displayConsent,
        })
        setSubmitted(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit review')
      }
    })
  }

  const handleGoogleReviewClick = () => {
    // Fire-and-forget: record the click
    recordGoogleReviewClick(eventId)
  }

  // After submission: show thank you + Google Review CTA
  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-950/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">
              <svg
                className="w-12 h-12 mx-auto text-emerald-500"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-100">Thank you for your feedback!</h3>
              <p className="text-sm text-stone-400 mt-1">
                Your review helps us improve our service.
              </p>
            </div>

            {googleReviewUrl && (
              <div className="pt-4 border-t border-emerald-200">
                <p className="text-sm text-stone-300 mb-3">
                  Would you also leave us a review on Google? It really helps!
                </p>
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleGoogleReviewClick}
                  className="inline-flex items-center gap-2 bg-stone-900 border border-stone-600 rounded-lg px-5 py-2.5 font-medium text-stone-200 hover:bg-stone-800 hover:border-stone-400 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Leave a Google Review
                  <svg
                    className="w-4 h-4 text-stone-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How was your experience?</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Overall Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Written Feedback */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Tell us about your experience
            </label>
            <Textarea
              placeholder="How was the food? The service? We'd love to hear your thoughts..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />
          </div>

          {/* What they loved */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              What did you love? <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="A favorite dish, a special touch, anything that stood out..."
              value={whatTheyLoved}
              onChange={(e) => setWhatTheyLoved(e.target.value)}
              rows={2}
            />
          </div>

          {/* What could improve */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Anything we could improve?{' '}
              <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="Honest feedback helps us get better..."
              value={whatCouldImprove}
              onChange={(e) => setWhatCouldImprove(e.target.value)}
              rows={2}
            />
          </div>

          {/* Display Consent */}
          <div className="flex items-start gap-3 p-3 bg-stone-800 rounded-lg">
            <input
              type="checkbox"
              id="display-consent"
              checked={displayConsent}
              onChange={(e) => setDisplayConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="display-consent" className="text-sm text-stone-300">
              I&apos;m okay with my review being shared publicly (e.g., on the chef&apos;s website
              or social media). Your name and feedback may be displayed.
            </label>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" variant="primary" disabled={isPending || rating === 0}>
            {isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
