import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAuditTrail } from '@/lib/protection/audit-trail-actions'
import { AuditTrailTable } from '@/components/protection/audit-trail-table'

export const metadata: Metadata = { title: 'Audit Trail' }

export default async function AuditTrailPage() {
  await requireChef()
  const entries = await getAuditTrail()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Audit Trail</h1>
        <p className="mt-1 text-sm text-stone-500">
          Immutable record of all event transitions, quote state changes, and financial ledger
          entries. These records cannot be altered or deleted.
        </p>
      </div>

      <AuditTrailTable entries={entries} />
    </div>
  )
}
