import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Hub | ChefFlow' }

export default function HubOverviewRedirect() {
  redirect('/marketing/social')
}
