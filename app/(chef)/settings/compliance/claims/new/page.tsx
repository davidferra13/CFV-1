import type { Metadata } from 'next'
import ClaimFormClient from './claim-form-client'

export const metadata: Metadata = { title: 'New Compliance Claim | ChefFlow' }

export default function NewInsuranceClaimPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">File a New Claim</h1>
        <p className="mt-1 text-sm text-stone-400">
          Document the incident details below. You can add evidence and update the claim later.
        </p>
      </div>
      <ClaimFormClient />
    </div>
  )
}
