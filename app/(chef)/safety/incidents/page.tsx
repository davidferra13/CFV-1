import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Incidents | ChefFlow' }

export default function SafetyIncidentsRedirect() {
  redirect('/settings/compliance/incidents')
}
