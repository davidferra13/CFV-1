import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAuditTrail } from '@/lib/protection/audit-trail-actions'
import { AuditTrailTable } from '@/components/protection/audit-trail-table'

export const metadata: Metadata = { title: 'Audit Trail' }

export default async function AuditTrailPage() {
  await requireChef()
  const entries = await getAuditTrail()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Audit Trail</h1>
          <p className="mt-1 text-sm text-stone-500">
            A permanent record of every important change in your account. These records can&apos;t
            be changed or deleted.
          </p>
        </div>
        <Link
          href="/activity/audit"
          className="rounded-lg px-3 py-1.5 text-sm font-medium bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
        >
          Full Audit Log
        </Link>
      </div>

      <AuditTrailTable entries={entries} />
    </div>
  )
}
