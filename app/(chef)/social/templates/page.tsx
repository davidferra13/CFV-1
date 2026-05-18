import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Templates | ChefFlow' }

export default function SocialTemplatesRedirect() {
  redirect('/marketing/social/templates')
}
