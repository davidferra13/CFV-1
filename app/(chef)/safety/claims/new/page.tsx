import { redirect } from 'next/navigation'

export default function SafetyNewClaimRedirect() {
  redirect('/settings/compliance/claims/new')
}
