import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Cannabis RSVPs | ChefFlow' }

export default function ChefCannabisRsvpsAliasPage() {
  redirect('/cannabis/rsvps')
}
