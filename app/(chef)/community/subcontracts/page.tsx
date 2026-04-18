import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { SubcontractList } from '@/components/community/subcontract-list'
import { SubcontractorRoster } from '@/components/community/subcontractor-roster'
import { SubcontractForm } from '@/components/community/subcontract-form'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Subcontracts | Community' }

export default async function SubcontractsPage() {
  const user = await requireChef()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Subcontracts</h1>
      </div>

      <SubcontractForm />
      <SubcontractorRoster />
      <SubcontractList />
    </div>
  )
}
