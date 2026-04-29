import type { Metadata } from 'next'
import { TicketReconciliationPanel } from '@/components/admin/ticket-reconciliation-panel'
import { ErrorState } from '@/components/ui/error-state'
import { RetryButton } from '@/components/ui/retry-button'
import { runTicketReconciliationAudit } from '@/lib/tickets/reconciliation-actions'

export const metadata: Metadata = {
  title: 'Ticket Reconciliation - Admin',
}

export default async function TicketReconciliationPage() {
  try {
    const audit = await runTicketReconciliationAudit()

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Ticket Reconciliation</h1>
          <p className="mt-1 text-stone-500">
            Read-only audit of ticket payment, ledger, and capacity release mismatches.
          </p>
        </div>

        <TicketReconciliationPanel audit={audit} />
      </div>
    )
  } catch (err) {
    console.error('[admin-ticket-reconciliation] Failed to load:', err)

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Ticket Reconciliation</h1>
          <p className="mt-1 text-stone-500">
            Read-only audit of ticket payment, ledger, and capacity release mismatches.
          </p>
        </div>

        <div>
          <ErrorState
            title="Could not load ticket reconciliation"
            description="The reconciliation audit failed. No mismatch counts are being inferred."
            size="sm"
          />
          <div className="flex justify-center">
            <RetryButton />
          </div>
        </div>
      </div>
    )
  }
}
