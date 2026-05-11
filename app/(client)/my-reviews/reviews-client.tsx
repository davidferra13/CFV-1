'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Star, MessageCircle, Calendar } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  submitReview,
  type ClientReview,
  type ReviewableEvent,
} from '@/lib/reviews/client-review-actions'

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`w-6 h-6 ${n <= value ? 'text-amber-400' : 'text-stone-600 hover:text-stone-400'}`}
            weight={n <= value ? 'fill' : 'regular'}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewsClient({
  reviews,
  reviewableEvents,
}: {
  reviews: ClientReview[]
  reviewableEvents: ReviewableEvent[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loved, setLoved] = useState('')
  const [improve, setImprove] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit() {
    if (!selectedEvent || rating === 0) {
      toast.error('Select an event and rating')
      return
    }
    startTransition(async () => {
      try {
        await submitReview(selectedEvent, rating, feedback, loved, improve)
        toast.success('Review submitted')
        setShowForm(false)
        setSelectedEvent('')
        setRating(0)
        setFeedback('')
        setLoved('')
        setImprove('')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Write Review CTA */}
      {reviewableEvents.length > 0 && !showForm && (
        <Card className="border-brand-600/30 bg-brand-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-100">
                {reviewableEvents.length} event{reviewableEvents.length !== 1 ? 's' : ''} awaiting
                your feedback
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Share what you thought of your experience
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Write Review
            </button>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-stone-500">Event</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Select an event</option>
                {reviewableEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({formatDate(evt.eventDate)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-stone-500 block mb-1">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div>
              <label className="text-xs text-stone-500">What did you love?</label>
              <textarea
                value={loved}
                onChange={(e) => setLoved(e.target.value)}
                rows={2}
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                placeholder="The food, presentation, service..."
              />
            </div>

            <div>
              <label className="text-xs text-stone-500">What could be improved?</label>
              <textarea
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
                rows={2}
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="text-xs text-stone-500">Additional feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                className="w-full mt-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                placeholder="Anything else you want your chef to know"
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !selectedEvent || rating === 0}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Reviews */}
      {reviews.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No reviews yet.</p>
            <p className="text-stone-500 text-xs mt-1">
              After your events are completed, you can leave feedback here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {review.eventName || 'Event'}
                    </p>
                    {review.eventDate && (
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(review.eventDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 ${n <= review.rating ? 'text-amber-400' : 'text-stone-700'}`}
                        weight={n <= review.rating ? 'fill' : 'regular'}
                      />
                    ))}
                  </div>
                </div>

                {review.whatTheyLoved && (
                  <p className="text-xs text-stone-300">
                    <span className="text-emerald-500 font-medium">Loved: </span>
                    {review.whatTheyLoved}
                  </p>
                )}
                {review.whatCouldImprove && (
                  <p className="text-xs text-stone-300">
                    <span className="text-amber-500 font-medium">Improve: </span>
                    {review.whatCouldImprove}
                  </p>
                )}
                {review.feedbackText && (
                  <p className="text-xs text-stone-400">{review.feedbackText}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
