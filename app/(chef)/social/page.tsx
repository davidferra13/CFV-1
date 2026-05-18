import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social | ChefFlow' }

export default function SocialRootPage() {
  redirect('/marketing/social')
}
