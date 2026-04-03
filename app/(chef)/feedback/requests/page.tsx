import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Send Feedback Requests' }

export default async function FeedbackRequestsPage() {
  redirect('/surveys')
}
