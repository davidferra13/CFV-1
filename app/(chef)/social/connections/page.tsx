import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Connections | ChefFlow' }

export default function SocialConnectionsRedirect() {
  redirect('/marketing/social/connections')
}
