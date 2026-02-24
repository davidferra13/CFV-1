// Contract Section — Chef Event Detail Page
// Server Component that shows the current contract state for an event.
// Renders different UI based on contract status (no contract, draft, sent, signed, voided).
// Client interactions (generate, send, void) are handled by the existing SendContractButton.

import { getEventContract } from '@/lib/contracts/actions'
import { listContractTemplates } from '@/lib/contracts/actions'
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge'
import { SendContractButton } from '@/components/contracts/send-contract-button'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'

type Props = {
  eventId: string
  eventStatus: string
}

export async function ContractSection({ eventId, eventStatus }: Props) {
  // Do not render for cancelled events
  if (eventStatus === 'cancelled') {
    return null
  }

  const [contract, templates] = await Promise.all([
    getEventContract(eventId).catch(() => null),
    listContractTemplates().catch(() => []),
  ])

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Service Contract</h2>
          {contract && (
            <ContractStatusBadge
              status={contract.status as 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'}
            />
          )}
        </div>
        {/* PDF download link for signed contracts */}
        {contract?.status === 'signed' && (
          <a
            href={`/api/documents/contract/${contract.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-400 underline hover:text-stone-100"
          >
            Download PDF
          </a>
        )}
      </div>

      {/* Contract body preview — shown for draft contracts */}
      {contract?.status === 'draft' && contract.body_snapshot && (
        <div className="mb-4 rounded-lg border border-stone-700 bg-stone-800 p-3">
          <p className="text-xs text-stone-500 mb-1 font-medium">Contract preview</p>
          <pre className="whitespace-pre-wrap text-xs text-stone-300 leading-relaxed line-clamp-6 overflow-hidden">
            {contract.body_snapshot.slice(0, 200)}
            {contract.body_snapshot.length > 200 ? '…' : ''}
          </pre>
        </div>
      )}

      {/* Signed date detail */}
      {contract?.status === 'signed' && contract.signed_at && (
        <p className="text-sm text-emerald-700 mb-4">
          Signed on {format(new Date(contract.signed_at), 'MMMM d, yyyy')}
        </p>
      )}

      {/* Void reason — shown for voided contracts */}
      {contract?.status === 'voided' && (contract as any).void_reason && (
        <p className="text-sm text-stone-500 mb-4">Reason: {(contract as any).void_reason}</p>
      )}

      {/* No contract yet */}
      {!contract && <p className="text-sm text-stone-500 mb-4">No contract generated yet.</p>}

      {/* Interactive buttons — delegated to the existing client component */}
      <SendContractButton
        eventId={eventId}
        templates={templates}
        contract={
          contract
            ? {
                id: contract.id,
                status: contract.status as 'draft' | 'sent' | 'viewed' | 'signed' | 'voided',
                sent_at: (contract as any).sent_at ?? null,
                signed_at: (contract as any).signed_at ?? null,
                viewed_at: (contract as any).viewed_at ?? null,
              }
            : null
        }
      />
    </Card>
  )
}
