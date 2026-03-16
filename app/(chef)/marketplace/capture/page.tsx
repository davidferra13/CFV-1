import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { TakeAChefCaptureTool } from '@/components/marketplace/take-a-chef-capture-tool'

export const metadata: Metadata = {
  title: 'Marketplace Capture - ChefFlow',
}

export default async function MarketplaceCapturePage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/marketplace" className="transition-colors hover:text-stone-300">
            Marketplace
          </Link>
          <span className="text-stone-600">/</span>
          <span className="text-stone-300">Capture</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Marketplace Capture</h1>
            <p className="mt-1 max-w-3xl text-sm text-stone-400">
              Capture a live page from any marketplace (Private Chef Manager, Take a Chef, Yhangry,
              Cozymeal, Bark, Thumbtack, and more), then save that context into ChefFlow without
              retyping the whole request.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Marketplace command center
          </Link>
        </div>
      </div>

      <TakeAChefCaptureTool />
    </div>
  )
}
