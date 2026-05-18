import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Journey | ChefFlow' }

export default async function JourneyPage() {
  redirect('/settings/journal')
}
