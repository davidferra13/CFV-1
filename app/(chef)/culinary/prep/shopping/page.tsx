import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { ShoppingListGenerator } from '@/components/culinary/ShoppingListGenerator'
import { generateShoppingList } from '@/lib/culinary/shopping-list-actions'

export const metadata: Metadata = { title: 'Consolidated Shopping - ChefFlow' }

function getDefaultWindow() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 14)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

export default async function ConsolidatedShoppingPage() {
  await requireChef()
  const window = getDefaultWindow()

  const initialResult = await generateShoppingList({
    startDate: window.startDate,
    endDate: window.endDate,
  }).catch(() => ({
    startDate: window.startDate,
    endDate: window.endDate,
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

      <ShoppingListGenerator initialResult={initialResult} />
    </div>
  )
}
