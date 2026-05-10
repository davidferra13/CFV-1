import { redirect } from 'next/navigation'

export default function SafetyNewIncidentRedirect() {
  redirect('/settings/compliance/incidents/new')
}
