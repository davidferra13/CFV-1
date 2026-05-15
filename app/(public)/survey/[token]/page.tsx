import { redirect } from 'next/navigation'

export const metadata = { title: 'Event Feedback', robots: { index: false, follow: false } }

export default async function SurveyPage({ params }: { params: { token: string } }) {
  redirect(`/feedback/${params.token}`)
}
