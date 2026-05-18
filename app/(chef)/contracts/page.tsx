// Contracts Hub - Server Component
// Lists all event contracts for the current chef with status filtering.
// Contracts are generated from event pages; this page provides the overview.

import type { Metadata } from 'next'
import { getContracts } from '@/lib/contracts/actions'
import { ContractList } from '@/components/contracts/contract-list'
import { CountersignPanel } from '@/components/contracts/countersign-panel'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Contracts | ChefFlow' }

export default async function ContractsPage() {
  let contracts: any[]
  let fetchError = false

  try {
    contracts = await getContracts()
  } catch (err) {
    console.error('[ContractsPage] Failed to load contracts:', err)
    fetchError = true
    contracts = []
  }

  const awaitingCountersign = contracts.filter(
    (contract) => contract.status === 'signed' && !contract.chef_signed_at
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Contracts</h1>
          <p className="text-stone-400 mt-1">Manage service agreements across all your events.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/contracts/new">
            <Button variant="primary" size="sm">
              New Contract
            </Button>
          </Link>
          <Link href="/contracts/clauses">
            <Button variant="secondary" size="sm">
              Clause Library
            </Button>
          </Link>
          <Link href="/settings/contracts">
            <Button variant="secondary" size="sm">
              Templates
            </Button>
          </Link>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 text-center">
          <p className="text-red-300 font-medium">Could not load contracts</p>
          <p className="text-red-400 text-sm mt-1">
            There was an error fetching your contracts. Please try refreshing the page.
          </p>
        </div>
      ) : (
        <>
          {awaitingCountersign.length > 0 && (
            <section className="space-y-3 rounded-lg border border-amber-800/70 bg-amber-950/10 p-4">
              <div>
                <h2 className="text-base font-semibold text-amber-200">
                  Ready for Countersignature
                </h2>
                <p className="mt-1 text-sm text-stone-400">
                  Client-signed contracts that need your final signature.
                </p>
              </div>
              <div className="space-y-3">
                {awaitingCountersign.map((contract) => (
                  <div
                    key={contract.id}
                    className="rounded-lg border border-stone-700 bg-stone-900/60 p-4"
                  >
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-stone-100">
                          {contract.event_occasion || 'Untitled Event'}
                        </p>
                        <p className="text-sm text-stone-400">
                          {contract.client_name || 'No client'}
                        </p>
                      </div>
                      <a
                        href={`/api/documents/contract/${contract.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-stone-400 underline hover:text-stone-100"
                      >
                        Review PDF
                      </a>
                    </div>
                    <CountersignPanel
                      contractId={contract.id}
                      contractStatus={contract.status}
                      chefSignedAt={contract.chef_signed_at}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          <ContractList contracts={contracts} />
        </>
      )}
    </div>
  )
}
