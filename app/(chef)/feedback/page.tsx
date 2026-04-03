import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Client Feedback' }

export default async function FeedbackPage() {
  redirect('/surveys')
}
