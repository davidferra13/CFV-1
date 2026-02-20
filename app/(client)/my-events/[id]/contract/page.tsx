// Client Contract Signing Page
// Loaded when client clicks the signing link in the contract email.
// Records the view, renders the contract body, and captures signature.

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventContract, recordClientView } from '@/lib/contracts/actions'
import { notFound } from 'next/navigation'
import { ContractSigningClient } from './contract-signing-client'
import { format } from 'date-fns'

export default async function ContractSigningPage({
  params,
}: {
  params: { id: string }
}) {
  await requireClient()

  const contractRaw = await getClientEventContract(params.id)

  if (!contractRaw) {
    notFound()
  }

  // Cast to any — contracts table added in migration 20260303000003 after last type generation
  const contract = contractRaw as any

  // Record that client viewed the contract (idempotent for signed/voided)
  if (contract.status === 'sent') {
    await recordClientView(contract.id)
  }

  const signedAt = contract.signed_at
    ? format(new Date(contract.signed_at), 'MMMM d, yyyy')
    : null

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Service Agreement</h1>
          <p className="mt-1 text-sm text-stone-500">
            Please read the full agreement below before signing.
          </p>
        </div>

        <ContractSigningClient
          contractId={contract.id}
          bodyMarkdown={contract.body_snapshot}
          status={contract.status as 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'}
          signedAt={signedAt}
          eventId={params.id}
        />
      </div>
    </div>
  )
}
