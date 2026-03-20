// Contracts Hub - Server Component
// Lists all event contracts for the current chef with status filtering.
// Contracts are generated from event pages; this page provides the overview.

import { getContracts } from '@/lib/contracts/actions'
import { ContractList } from '@/components/contracts/contract-list'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Contracts</h1>
          <p className="text-stone-400 mt-1">Manage service agreements across all your events.</p>
        </div>
        <Link href="/settings/contracts">
          <Button variant="secondary" size="sm">
            Templates
          </Button>
        </Link>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 text-center">
          <p className="text-red-300 font-medium">Could not load contracts</p>
          <p className="text-red-400 text-sm mt-1">
            There was an error fetching your contracts. Please try refreshing the page.
          </p>
        </div>
      ) : (
        <ContractList contracts={contracts} />
      )}
    </div>
  )
}
