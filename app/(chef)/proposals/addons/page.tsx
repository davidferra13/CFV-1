// Proposal Add-Ons - Manage upsell and add-on packages
// Renders the AddonSelector for creating and editing add-on items

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listAddons } from '@/lib/proposals/addon-actions'
import { AddonSelector } from '@/components/proposals/addon-selector'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Proposal Add-Ons' }

export default async function ProposalAddonsPage() {
  await requireChef()

  const addonsResult = await loadAddons()

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

      {addonsResult.success ? (
        <AddonSelector initialAddons={addonsResult.addons as any[]} />
      ) : (
        <Card className="p-8 text-center border-red-900/50">
          <p className="text-stone-100 text-sm font-medium">Proposal add-ons could not load.</p>
          <p className="text-stone-500 text-sm mt-1">{addonsResult.error}</p>
        </Card>
      )}
    </div>
  )
}

async function loadAddons(): Promise<
  | { success: true; addons: Awaited<ReturnType<typeof listAddons>> }
  | { success: false; error: string }
> {
  try {
    return { success: true, addons: await listAddons() }
  } catch (err) {
    console.error('[proposals] Failed to load proposal add-ons', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }
}
