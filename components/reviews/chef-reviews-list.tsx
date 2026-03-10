'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/ui/icons'
import { format } from 'date-fns'
import { respondToReview } from '@/lib/reviews/response-actions'
import { toast } from 'sonner'
import type { UnifiedChefReviewItem } from '@/lib/reviews/actions'

function StarDisplay({ rating }: { rating: number }) {
  const rounded = Math.round(rating)

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${
            star <= rounded ? 'text-amber-400 fill-amber-400' : 'text-stone-300 fill-stone-300'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function safeFormatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'PPP')
}

function ReviewResponseSection({ review }: { review: UnifiedChefReviewItem }) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(review.chefResponse ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!text.trim()) return
    startTransition(async () => {
      try {
        await respondToReview(review.rawId, text)
        setIsEditing(false)
        toast.success('Response saved')
      } catch {
        toast.error('Failed to save response')
      }
    })
  }

  if (review.chefResponse && !isEditing) {
    return (
      <div className="mt-3 pl-4 border-l-2 border-stone-700">
        <p className="text-xs text-stone-500 mb-1">Your response</p>
        <p className="text-sm text-stone-300 whitespace-pre-wrap">{review.chefResponse}</p>
        <button
          onClick={() => {
            setText(review.chefResponse ?? '')
            setIsEditing(true)
          }}
          className="text-xs text-stone-500 hover:text-stone-300 mt-1"
        >
          Edit
        </button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full border border-stone-600 rounded px-3 py-2 text-sm bg-stone-900 text-stone-200"
          placeholder="Write your response..."
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending || !text.trim()}>
            {isPending ? 'Saving...' : 'Save Response'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setText(review.chefResponse ?? '')
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="mt-2 text-xs text-stone-500 hover:text-stone-300"
    >
      + Respond
    </button>
  )
}

export function ChefReviewsList({ reviews }: { reviews: UnifiedChefReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-stone-500">
            No reviews yet. Internal feedback and synced external reviews will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-medium text-stone-100">{review.reviewerName}</p>
                {review.contextLine && (
                  <p className="text-sm text-stone-500 mt-0.5">{review.contextLine}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="default">{review.sourceLabel}</Badge>
                {review.tags.map((tag) => (
                  <Badge key={`${review.id}_${tag}`} variant="info">
                    {tag}
                  </Badge>
                ))}
                {review.respondedAt && <Badge variant="success">Responded</Badge>}
              </div>
            </div>

            {typeof review.rating === 'number' && <StarDisplay rating={review.rating} />}

            <p className="text-stone-300 text-sm mt-3 whitespace-pre-wrap">{review.reviewText}</p>

            {review.sourceUrl && (
              <a
                href={review.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-400 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                View original source
              </a>
            )}

            {/* Response section (only for client reviews) */}
            {review.kind === 'client_review' && <ReviewResponseSection review={review} />}

            <p className="text-xs text-stone-400 mt-3">{safeFormatDate(review.reviewDate)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
