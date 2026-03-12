// Contract Library Page
// Lists all event contracts with filtering by status.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listContracts } from '@/lib/contracts/actions'
import { ContractLibraryClient } from './contract-library-client'

export const metadata: Metadata = { title: 'Contracts - ChefFlow' }

export default async function ContractLibraryPage() {
  await requireChef()
  const contracts = await listContracts()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Contracts</h1>
          <p className="mt-1 text-sm text-stone-400">
            All event contracts and their signing status
          </p>
        </div>
        <Link href="/settings/contracts">
          <button className="text-sm text-brand-400 hover:text-brand-300">Manage Templates</button>
        </Link>
      </div>

      <ContractLibraryClient contracts={contracts} />
    </div>
  )
}
