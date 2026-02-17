// Chef Reviews List — Displays all client reviews for the chef's dashboard
// Shows ratings, feedback, consent status, and aggregate stats

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { MessageSquare, Star, Eye, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface ReviewWithRelations {
  id: string
  rating: number
  feedback_text: string | null
  what_they_loved: string | null
  what_could_improve: string | null
  display_consent: boolean
  google_review_clicked: boolean
  created_at: string
  client: { id: string; full_name: string; email: string }
  event: { id: string; occasion: string | null; event_date: string }
}

interface ReviewStats {
  total: number
  averageRating: number
  consentCount: number
  googleClickCount: number
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${
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

export function ChefReviewsList({
  reviews,
  stats,
}: {
  reviews: ReviewWithRelations[]
  stats: ReviewStats
}) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Reviews"
          value={stats.total.toString()}
          icon={MessageSquare}
        />
        <StatCard
          label="Avg Rating"
          value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--'}
          icon={Star}
        />
        <StatCard
          label="Public Consent"
          value={stats.consentCount.toString()}
          icon={Eye}
        />
        <StatCard
          label="Google Clicks"
          value={stats.googleClickCount.toString()}
          icon={ExternalLink}
        />
      </div>

      {/* Reviews */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-500">No reviews yet. Reviews appear here after clients leave feedback on completed events.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-stone-900">{review.client.full_name}</p>
                    <p className="text-sm text-stone-500">
                      {review.event.occasion || 'Event'} - {format(new Date(review.event.event_date), 'PPP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.display_consent && (
                      <Badge variant="success">Public OK</Badge>
                    )}
                    {review.google_review_clicked && (
                      <Badge variant="info">Google</Badge>
                    )}
                  </div>
                </div>

                <StarDisplay rating={review.rating} />

                {review.feedback_text && (
                  <p className="text-stone-700 text-sm mt-3">{review.feedback_text}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {review.what_they_loved && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1">Loved</p>
                      <p className="text-sm text-stone-700">{review.what_they_loved}</p>
                    </div>
                  )}
                  {review.what_could_improve && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Could Improve</p>
                      <p className="text-sm text-stone-700">{review.what_could_improve}</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone-400 mt-3">
                  {format(new Date(review.created_at), 'PPP')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
