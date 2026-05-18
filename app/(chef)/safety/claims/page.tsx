import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Claims | ChefFlow' }

export default function SafetyClaimsRedirect() {
  redirect('/settings/compliance/claims')
}
