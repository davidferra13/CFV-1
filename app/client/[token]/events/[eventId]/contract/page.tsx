import Link from 'next/link'
import { headers } from 'next/headers'
import { format } from 'date-fns'
import { Alert } from '@/components/ui/alert'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { getClientPortalEventContract, recordClientPortalView } from '@/lib/contracts/actions'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { PortalContractSigningClient } from './portal-contract-signing-client'

type Props = {
  params: {
    token: string
    eventId: string
  }
  searchParams: {
    next?: string
  }
}

export const dynamic = 'force-dynamic'

export default async function ClientPortalContractSigningPage({ params, searchParams }: Props) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  const rl = await checkRateLimit(`portal-contract:${ip}`)
  if (!rl.success) {
    return (
      <div className="min-h-screen bg-stone-900 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <Alert variant="warning" title="Too many requests">
            Please wait a moment and try the contract link again.
          </Alert>
        </div>
      </div>
    )
  }

  const contractRaw = await getClientPortalEventContract(params.token, params.eventId)
  if (!contractRaw) {
    return <TokenExpiredPage reason="not_found" noun="contract" />
  }

  const contract = contractRaw as any
  const continueToPayment = searchParams.next === 'payment'

  if (contract.status === 'sent') {
    await recordClientPortalView(params.token, contract.id)
  }

  const signedAt = contract.signed_at ? format(new Date(contract.signed_at), 'MMMM d, yyyy') : null

  return (
    <div className="min-h-screen bg-stone-800 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">Service Agreement</h1>
            <p className="mt-1 text-sm text-stone-500">
              {continueToPayment
                ? 'Please read and sign the agreement below to unlock payment.'
                : 'Please read the full agreement below before signing.'}
            </p>
          </div>
          <Link
            href={`/client/${params.token}`}
            className="inline-flex items-center rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-900"
          >
            Back to Portal
          </Link>
        </div>

        {continueToPayment && contract.status !== 'signed' && (
          <Alert variant="info" title="Payment unlocks after signature">
            Once you sign the agreement, ChefFlow will take you straight to payment.
          </Alert>
        )}

        <PortalContractSigningClient
          token={params.token}
          contractId={contract.id}
          bodyMarkdown={contract.body_snapshot}
          status={contract.status as 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'}
          signedAt={signedAt}
          eventId={params.eventId}
          continueToPayment={continueToPayment}
        />
      </div>
    </div>
  )
}
