import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Travel | ChefFlow' }

export default function TravelRedirect() {
  redirect('/events/travel')
}
