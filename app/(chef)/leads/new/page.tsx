import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

// New / unclaimed leads are shown on the main leads page

export const metadata: Metadata = { title: 'New Lead | ChefFlow' }

export default function LeadsNewPage() {
  redirect('/leads')
}
