// Client Contract Signing Page
// Loaded when client clicks the signing link in the contract email.
// Records the view, renders the contract body, and captures signature.

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventContract, recordClientView } from '@/lib/contracts/actions'
import { getClientEventById } from '@/lib/events/client-actions'
import { notFound } from 'next/navigation'
import { ContractSigningClient } from './contract-signing-client'
import { format } from 'date-fns'
import { Alert } from '@/components/ui/alert'
import { redirect } from 'next/navigation'

export default async function ContractSigningPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { next?: string }
}) {
  await requireClient()

  const [event, contractRaw] = await Promise.all([
    getClientEventById(params.id),
    getClientEventContract(params.id),
  ])

  if (!event || !contractRaw) {
    notFound()
  }

  if (event.status === 'proposed') {
    redirect(`/my-events/${params.id}/proposal`)
  }

  // Cast to any - contracts table added in migration 20260303000003 after last type generation
  const contract = contractRaw as any
  const continueToPayment = searchParams.next === 'payment'

  // Record that client viewed the contract (idempotent for signed/voided)
  if (contract.status === 'sent') {
    await recordClientView(contract.id)
  }

  const signedAt = contract.signed_at ? format(new Date(contract.signed_at), 'MMMM d, yyyy') : null

  return (
    <div className="min-h-screen bg-stone-800 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Service Agreement</h1>
          <p className="mt-1 text-sm text-stone-500">
            {continueToPayment
              ? 'Please read and sign the agreement below to unlock payment.'
              : 'Please read the full agreement below before signing.'}
          </p>
        </div>

        {continueToPayment && contract.status !== 'signed' && (
          <Alert variant="info">
            Once you sign the agreement, we&apos;ll take you straight to payment.
          </Alert>
        )}

        <ContractSigningClient
          contractId={contract.id}
          bodyMarkdown={contract.body_snapshot}
          status={contract.status as 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'}
          signedAt={signedAt}
          eventId={params.id}
          continueToPayment={continueToPayment}
        />
      </div>
    </div>
  )
}
