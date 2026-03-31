import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listContractTemplates } from '@/lib/contracts/actions'
import { ContractTemplates } from '@/components/contracts/contract-templates'

export const metadata: Metadata = { title: 'Contract Templates' }

export default async function ContractTemplatesPage() {
  const user = await requireChef()
  const templates = await listContractTemplates()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Back to settings
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Contract Templates</h1>
        <p className="mt-1 text-stone-400">
          Manage reusable contract templates and default legal copy for event contracts.
        </p>
      </div>

      <ContractTemplates templates={templates as any} chefId={user.entityId} />
    </div>
  )
}
