import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { ExternalLink, Link2, MessageSquare, Star } from '@/components/ui/icons'
import { format } from 'date-fns'
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

export function ChefReviewsList({ reviews }: { reviews: UnifiedChefReviewItem[] }) {
  const rated = reviews.filter((review) => typeof review.rating === 'number')
  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, review) => sum + Number(review.rating), 0) / rated.length
      : 0
  const externalCount = reviews.filter((review) => review.kind === 'external_review').length
  const linkedCount = reviews.filter((review) => !!review.sourceUrl).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Entries" value={reviews.length.toString()} icon={MessageSquare} />
        <StatCard
          label="Avg Rating"
          value={averageRating > 0 ? averageRating.toFixed(1) : '--'}
          icon={Star}
        />
        <StatCard label="External Sync" value={externalCount.toString()} icon={Link2} />
        <StatCard label="Source Links" value={linkedCount.toString()} icon={ExternalLink} />
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-500">
              No reviews yet. Internal feedback and synced external reviews will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                  </div>
                </div>

                {typeof review.rating === 'number' && <StarDisplay rating={review.rating} />}

                <p className="text-stone-300 text-sm mt-3 whitespace-pre-wrap">
                  {review.reviewText}
                </p>

                {review.sourceUrl && (
                  <a
                    href={review.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View original source
                  </a>
                )}

                <p className="text-xs text-stone-400 mt-3">{safeFormatDate(review.reviewDate)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
