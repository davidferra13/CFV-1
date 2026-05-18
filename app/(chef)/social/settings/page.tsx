import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Settings | ChefFlow' }

export default function SocialSettingsRedirect() {
  redirect('/marketing/social/settings')
}
