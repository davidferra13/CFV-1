import { redirect } from 'next/navigation'

export default function SocialPostRedirect({ params }: { params: { id: string } }) {
  redirect(`/marketing/social/posts/${params.id}`)
}
