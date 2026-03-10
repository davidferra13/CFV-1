import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { FeedbackDashboard } from '@/components/feedback/feedback-dashboard'

export const metadata: Metadata = { title: 'Customer Feedback - ChefFlow' }

export default async function CustomerFeedbackPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Customer Feedback</h1>
        <p className="text-stone-500 mt-1">
          Collect ratings, comments, and NPS scores from your clients after every service.
        </p>
      </div>
      <FeedbackDashboard />
    </div>
  )
}
