import { redirect } from 'next/navigation'

export default function SafetyClaimsRedirect() {
  redirect('/settings/compliance/claims')
}
