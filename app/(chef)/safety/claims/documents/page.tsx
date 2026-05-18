import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Claims Documents | ChefFlow' }

export default function SafetyClaimDocumentsRedirect() {
  redirect('/settings/compliance/claims/documents')
}
