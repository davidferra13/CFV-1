// Portfolio Settings - Manage portfolio gallery items
// Showcases dishes, plating, and event photos for the public profile

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPortfolio } from '@/lib/portfolio/actions'
import { GridEditor } from '@/components/portfolio/grid-editor'

export const metadata: Metadata = { title: 'Portfolio' }

export default async function PortfolioPage() {
  const user = await requireChef()

  let portfolio: Awaited<ReturnType<typeof getPortfolio>> = []
  try {
    portfolio = await getPortfolio()
  } catch {
    portfolio = []
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Settings
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Portfolio</h1>
          <p className="text-stone-400 mt-1">
            Curate the photos and descriptions that appear on your public profile. Drag to reorder.
          </p>
        </div>
      </div>

      <GridEditor
        items={portfolio.map((p) => ({
          id: p.id,
          photoUrl: p.photoUrl,
          caption: p.caption ?? undefined,
          dishName: p.dishName ?? undefined,
          isFeatured: p.isFeatured,
        }))}
      />
    </div>
  )
}
