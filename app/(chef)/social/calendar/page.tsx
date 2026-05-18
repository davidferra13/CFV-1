import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Calendar | ChefFlow' }

export default function SocialCalendarRedirect() {
  redirect('/marketing/social')
}
