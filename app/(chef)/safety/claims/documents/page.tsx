import { redirect } from 'next/navigation'

export default function SafetyClaimDocumentsRedirect() {
  redirect('/settings/compliance/claims/documents')
}
