import { redirect } from 'next/navigation'

export default function SocialComposeRedirect({ params }: { params: { eventId: string } }) {
  redirect(`/marketing/social/compose/${params.eventId}`)
}
