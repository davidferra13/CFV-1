import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Feedback Dashboard' }

export default async function FeedbackDashboardPage() {
  redirect('/surveys')
}
