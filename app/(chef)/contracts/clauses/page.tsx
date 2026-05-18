import type { Metadata } from 'next'
import Link from 'next/link'
import { ClauseLibrary } from '@/components/contracts/clause-library'
import { getClauses } from '@/lib/contracts/clause-actions'
import { seedDefaultClauses } from '@/lib/contracts/default-clauses'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Clause Library | ChefFlow' }

export default async function ClauseLibraryPage() {
  const user = await requireChef()
  let result = await getClauses()

  if (result.success && result.data.length === 0 && user.tenantId) {
    await seedDefaultClauses(user.tenantId)
    result = await getClauses()
  }

  const clauses = result.success ? result.data : []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Clause Library</h1>
          <p className="mt-1 text-sm text-stone-400">
            Manage reusable contract clauses for payment, cancellation, scope, liability, and custom
            terms.
          </p>
        </div>
        <Link
          href="/contracts"
          className="text-sm text-stone-400 transition-colors hover:text-stone-200"
        >
          Back to Contracts
        </Link>
      </div>

      {!result.success ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-6">
          <p className="font-medium text-red-300">Could not load clause library</p>
          <p className="mt-1 text-sm text-red-400">{result.error}</p>
        </div>
      ) : (
        <ClauseLibrary clauses={clauses} />
      )}
    </div>
  )
}
