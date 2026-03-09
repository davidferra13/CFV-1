// Submitted Review Display — Shows when client has already left feedback
// Read-only view of their review with optional Google Review CTA

'use client'

import { recordGoogleReviewClick } from '@/lib/reviews/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TipAfterReviewCard } from '@/components/reviews/tip-after-review-card'

interface SubmittedReviewProps {
  review: {
    rating: number
    food_quality_rating: number | null
    presentation_rating: number | null
    communication_rating: number | null
    punctuality_rating: number | null
    cleanup_rating: number | null
    would_book_again: boolean | null
    feedback_text: string | null
    what_they_loved: string | null
    what_could_improve: string | null
    display_consent: boolean
    google_review_clicked: boolean
    created_at: string
  }
  eventId: string
  googleReviewUrl: string | null
  tipAmountCents?: number
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${
            star <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300 fill-stone-300'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewMetric({ label, value }: { label: string; value: number | null }) {
  if (!value) return null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <StarDisplay rating={value} />
        <span className="text-sm font-medium text-stone-200">{value}/5</span>
      </div>
    </div>
  )
}

export function SubmittedReview({
  review,
  eventId,
  googleReviewUrl,
  tipAmountCents = 0,
}: SubmittedReviewProps) {
  const handleGoogleReviewClick = () => {
    recordGoogleReviewClick(eventId)
  }

  return (
    <Card className="border-stone-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Your Feedback</CardTitle>
          <Badge variant="success">Submitted</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <StarDisplay rating={review.rating} />

        <div className="grid gap-3 md:grid-cols-2">
          <ReviewMetric label="Food quality" value={review.food_quality_rating} />
          <ReviewMetric label="Presentation" value={review.presentation_rating} />
          <ReviewMetric label="Communication" value={review.communication_rating} />
          <ReviewMetric label="Punctuality" value={review.punctuality_rating} />
          <ReviewMetric label="Cleanup" value={review.cleanup_rating} />
        </div>

        {review.would_book_again !== null && (
          <div className="flex items-center gap-2">
            <Badge variant={review.would_book_again ? 'success' : 'warning'}>
              {review.would_book_again ? 'Would Book Again' : 'Would Not Book Again Yet'}
            </Badge>
          </div>
        )}

        {review.feedback_text && <p className="text-stone-300 text-sm">{review.feedback_text}</p>}

        {review.what_they_loved && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Loved</p>
            <p className="text-stone-300 text-sm">{review.what_they_loved}</p>
          </div>
        )}

        {review.what_could_improve && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Could Improve
            </p>
            <p className="text-stone-300 text-sm">{review.what_could_improve}</p>
          </div>
        )}

        {review.display_consent && (
          <p className="text-xs text-stone-400">You consented to public display of this review.</p>
        )}

        {tipAmountCents > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="success">Tip Added</Badge>
            <span className="text-sm text-stone-300">${(tipAmountCents / 100).toFixed(2)}</span>
          </div>
        )}

        {/* Show Google Review CTA if they haven't clicked yet */}
        {googleReviewUrl && !review.google_review_clicked && (
          <div className="pt-3 border-t border-stone-700">
            <p className="text-sm text-stone-400 mb-2">
              Haven&apos;t left a Google review yet? It really helps!
            </p>
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleGoogleReviewClick}
              className="inline-flex items-center gap-2 bg-stone-900 border border-stone-600 rounded-lg px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
            </a>
          </div>
        )}

        {review.rating >= 4 && tipAmountCents <= 0 && (
          <div className="pt-3 border-t border-stone-700">
            <TipAfterReviewCard eventId={eventId} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
