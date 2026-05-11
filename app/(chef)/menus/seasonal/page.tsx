// Seasonal Menu Builder
// Interactive tool: see what is in season, which recipes match, and auto-build a menu.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { SeasonalMenuBuilderForm } from '@/components/intelligence/seasonal-menu-builder-form'
import { ArrowLeft, Leaf } from '@/components/ui/icons'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Seasonal Menu Builder',
}

export default async function SeasonalMenuBuilderPage() {
  await requireChef()

  const now = new Date()
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/menus"
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Menus
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/30 p-2.5">
            <Leaf className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-200">
              Seasonal Menu Builder
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">
              Build menus around what is in season. Currently: {currentMonth}.
            </p>
          </div>
        </div>
      </div>

      <SeasonalMenuBuilderForm />
    </div>
  )
}
