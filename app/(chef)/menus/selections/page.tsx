import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCatalogSelections } from '@/lib/menus/catalog-selection-actions'
import { CatalogSelectionsList } from '@/components/menus/catalog-selections-list'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Menu Selections' }

export default async function CatalogSelectionsPage() {
  await requireChef()

  let selections: Awaited<ReturnType<typeof getCatalogSelections>> = []
  try {
    selections = await getCatalogSelections()
  } catch (err) {
    console.error('[CatalogSelectionsPage] Failed to load:', err)
  }

  const active = selections.filter((s) => s.status !== 'expired' && s.status !== 'menu_created')
  const completed = selections.filter((s) => s.status === 'menu_created')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-200">Menu Selections</h1>
          <p className="text-sm text-stone-500 mt-1">Curated course selections sent to clients</p>
        </div>
        <Link href="/culinary/dish-index">
          <span className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            New Selection
          </span>
        </Link>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">
            Active
          </h2>
          <CatalogSelectionsList selections={active} />
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">
            Completed
          </h2>
          <CatalogSelectionsList selections={completed} />
        </section>
      )}

      {selections.length === 0 && <CatalogSelectionsList selections={[]} />}
    </div>
  )
}
