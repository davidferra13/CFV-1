import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Charity Hours | ChefFlow' }

export default function CharityHoursRedirect() {
  redirect('/events/charity/hours')
}
