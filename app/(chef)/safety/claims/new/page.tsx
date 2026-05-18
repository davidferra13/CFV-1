import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'New Claim | ChefFlow' }

export default function SafetyNewClaimRedirect() {
  redirect('/settings/compliance/claims/new')
}
