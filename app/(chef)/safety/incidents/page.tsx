import { redirect } from 'next/navigation'

export default function SafetyIncidentsRedirect() {
  redirect('/settings/compliance/incidents')
}
