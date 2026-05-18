// Compose Contract from Clauses - Server Component
// Lets chef pick clauses and assemble a contract for a specific event.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getClauses } from '@/lib/contracts/clause-actions'
import { seedDefaultClauses } from '@/lib/contracts/default-clauses'
import { ComposeContractForm } from '@/components/contracts/compose-contract-form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Compose Contract | ChefFlow' }

export default async function ComposeContractPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>
}) {
  const user = await requireChef()
  const params = await searchParams
  const eventId = params.eventId

  if (!eventId) {
    redirect('/contracts')
  }

  let result = await getClauses()

  // Auto-seed defaults if no clauses exist
  if (result.success && result.data.length === 0 && user.tenantId) {
    await seedDefaultClauses(user.tenantId)
    result = await getClauses()
  }

  const clauses = result.success ? result.data : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Compose Contract</h1>
          <p className="text-stone-400 mt-1">
            Select clauses to include in this contract. Preview the assembled document before
            creating.
          </p>
        </div>
        <Link
          href="/contracts"
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          Back to Contracts
        </Link>
      </div>

      <ComposeContractForm eventId={eventId} clauses={clauses} />
    </div>
  )
}
