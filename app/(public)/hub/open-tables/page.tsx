import type { Metadata } from 'next'
import { OpenTablesGrid } from '@/components/hub/open-tables-grid'
import { getOpenTables } from '@/lib/hub/open-tables-actions'

export const metadata: Metadata = {
  title: 'Open Tables',
  description: 'Find dinner circles with open seats near you',
}

export default async function OpenTablesPage() {
  const listings = await getOpenTables()

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="mb-8 rounded-[1.75rem] border border-stone-700/70 bg-stone-900/70 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Dinner Circles
          </p>
          <h1 className="mt-3 text-3xl font-display tracking-tight text-stone-100">Open Tables</h1>
          <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
            Browse dinner circles with open seats and request to join the table.
          </p>
        </section>

        <OpenTablesGrid listings={listings} />
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
