import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Guest Leads | ChefFlow' }

export default function GuestLeadsPage() {
  redirect('/leads')
}
