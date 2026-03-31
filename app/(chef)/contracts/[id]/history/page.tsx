import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  getContractSigningSummary,
  getContractSigners,
  getContractVersions,
} from '@/lib/contracts/advanced-contracts'
import { ContractHistory } from '@/components/contracts/contract-history'

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

  const [versions, signers, summary] = await Promise.all([
    getContractVersions(params.id),
    getContractSigners(params.id),
    getContractSigningSummary(params.id),
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
        <p className="mt-1 text-stone-400">
          Contract ID: {contract.id} | Current status: {contract.status}
        </p>
      </div>

      <ContractHistory
        contractId={params.id}
        versions={versions}
        signers={signers}
        summary={summary}
      />
    </div>
  )
}
