import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getContractSigningSummary,
  getContractSigners,
  getContractVersions,
} from '@/lib/contracts/advanced-contracts'
import { ContractHistory } from '@/components/contracts/contract-history'
import { AuditSummaryBadge } from '@/components/audit-trail/audit-summary-badge'
import { AuditTimeline } from '@/components/audit-trail/audit-timeline'
import { fetchEntityHistory } from '@/lib/audit-trail/surface-actions'

export const metadata: Metadata = { title: 'Contract History' }

interface ContractHistoryPageProps {
  params: {
    id: string
  }
}

export default async function ContractHistoryPage({ params }: ContractHistoryPageProps) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract } = await db
    .from('event_contracts')
    .select('id, event_id, status, created_at')
    .eq('id', params.id)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (!contract) {
    notFound()
  }

  const [versions, signers, summary, auditHistory] = await Promise.all([
    getContractVersions(params.id),
    getContractSigners(params.id),
    getContractSigningSummary(params.id),
    fetchEntityHistory('contract', params.id).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/events/${contract.event_id}`}
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          &larr; Back to event
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Contract History</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-stone-400">
            Contract ID: {contract.id} | Current status: {contract.status}
          </p>
          <Suspense fallback={null}>
            <AuditSummaryBadge entityType="contract" entityId={params.id} />
          </Suspense>
        </div>
      </div>

      <ContractHistory
        contractId={params.id}
        versions={versions}
        signers={signers}
        summary={summary}
      />

      {auditHistory.length > 0 && (
        <AuditTimeline entries={auditHistory} title="Contract Audit Trail" />
      )}
    </div>
  )
}
