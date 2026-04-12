import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { ShoppingListGenerator } from '@/components/culinary/ShoppingListGenerator'
import { generateShoppingList } from '@/lib/culinary/shopping-list-actions'

export const metadata: Metadata = { title: 'Consolidated Shopping' }

function liso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDefaultWindow() {
  const start = new Date()
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 14)
  return { startDate: liso(start), endDate: liso(end) }
}

interface PageProps {
  searchParams?: Promise<{ startDate?: string; endDate?: string; eventIds?: string }>
}

export default async function ConsolidatedShoppingPage({ searchParams }: PageProps) {
  await requireChef()
  const params = await searchParams
  const defaultWindow = getDefaultWindow()

  const startDate = params?.startDate ?? defaultWindow.startDate
  const endDate = params?.endDate ?? defaultWindow.endDate
  const eventIds = params?.eventIds ? params.eventIds.split(',').filter(Boolean) : undefined

  const initialResult = await generateShoppingList({
    startDate,
    endDate,
    eventIds,
  }).catch(() => ({
    startDate,
    endDate,
    items: [],
    totalEstimatedCostCents: 0,
    shortageCount: 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/prep" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Prep
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Consolidated Shopping</h1>
        <p className="text-stone-500 mt-1">
          Auto-generated ingredient requirements from planned events, adjusted by on-hand stock.
        </p>
      </div>

      <ShoppingListGenerator initialResult={initialResult} initialEventIds={eventIds} />
    </div>
  )
}
