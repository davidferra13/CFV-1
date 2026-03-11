// Feedback History - Client Portal
// Shows submitted feedback and pending feedback requests.

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientFeedbackHistory } from '@/lib/client-portal/portal-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'My Feedback - ChefFlow' }

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-stone-200'}>
          ★
        </span>
      ))}
    </div>
  )
}

const ENTITY_LABELS: Record<string, string> = {
  event: 'Event',
  order: 'Order',
  meal_prep: 'Meal Prep',
  reservation: 'Reservation',
  general: 'General',
}

export default async function MyFeedbackPage() {
  await requireClient()

  const { submitted, pending } = await getClientFeedbackHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Feedback</h1>
        <p className="text-stone-400 mt-1">Your feedback history and pending requests</p>
      </div>

      {/* Pending Feedback Requests */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Pending Feedback</h2>
          {pending.map((item) => (
            <Card key={item.id} className="p-4 border-l-4 border-l-brand-500">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-100">
                      {ENTITY_LABELS[item.entity_type] || item.entity_type} Feedback
                    </span>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">
                    Requested {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className="text-sm text-brand-400">We would love to hear from you</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {submitted.length === 0 && pending.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-stone-500">No feedback history yet.</p>
        </Card>
      )}

      {/* Submitted Feedback */}
      {submitted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Submitted Feedback</h2>
          {submitted.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      {ENTITY_LABELS[item.entity_type] || item.entity_type}
                    </Badge>
                    {item.rating && <StarRating rating={item.rating} />}
                  </div>
                  {item.comment && <p className="text-sm text-stone-300 mt-1">{item.comment}</p>}
                </div>
                <p className="text-xs text-stone-600 whitespace-nowrap ml-4">
                  {item.submitted_at ? format(new Date(item.submitted_at), 'MMM d, yyyy') : ''}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ActivityTracker eventType="feedback_page_viewed" />
    </div>
  )
}
