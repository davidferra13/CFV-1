// Proposal Add-Ons - Manage upsell and add-on packages
// Renders the AddonSelector for creating and editing add-on items

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listAddons } from '@/lib/proposals/addon-actions'
import { AddonSelector } from '@/components/proposals/addon-selector'

export const metadata: Metadata = { title: 'Proposal Add-Ons' }

export default async function ProposalAddonsPage() {
  const user = await requireChef()

  const addons = await listAddons().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/proposals" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Proposals
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Proposal Add-Ons</h1>
          <p className="text-stone-400 mt-1">
            Create optional add-on packages that clients can select when reviewing proposals.
          </p>
        </div>
      </div>

      <AddonSelector initialAddons={addons as any[]} />
    </div>
  )
}
