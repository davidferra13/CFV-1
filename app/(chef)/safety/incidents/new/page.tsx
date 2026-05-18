import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'New Incident | ChefFlow' }

export default function SafetyNewIncidentRedirect() {
  redirect('/settings/compliance/incidents/new')
}
