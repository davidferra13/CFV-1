import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Guest Analytics | ChefFlow' }

export default function GuestAnalyticsPage() {
  redirect('/clients/insights')
}
