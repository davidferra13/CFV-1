// File an insurance claim.
// Connects the existing claim action to the safety claims workflow.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'
import { ClaimFilingForm } from '../claim-filing-form'

export const metadata: Metadata = { title: 'File Insurance Claim' }

export default async function NewInsuranceClaimPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">File Insurance Claim</h1>
          <p className="mt-1 text-sm text-stone-500">
            Capture the incident, policy details, witness notes, and evidence links before sending
            the package to your insurer.
          </p>
        </div>
        <Link href="/safety/claims">
          <Button variant="secondary" size="sm">
            All Claims
          </Button>
        </Link>
      </div>

      <ClaimFilingForm />
    </div>
  )
}
