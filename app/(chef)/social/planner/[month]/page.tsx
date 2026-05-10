import { redirect } from 'next/navigation'

export default function SocialMonthRedirect({ params }: { params: { month: string } }) {
  redirect(`/marketing/social/${params.month}`)
}
