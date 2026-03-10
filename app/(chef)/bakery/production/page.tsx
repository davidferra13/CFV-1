import { requireChef } from '@/lib/auth/get-user'
import DailyProductionSheet from '@/components/bakery/daily-production-sheet'

export const metadata = {
  title: 'Daily Production Sheet | ChefFlow',
}

export default async function BakeryProductionPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Production Sheet</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          What to bake today. Combines custom orders, par stock, and batch production into one list.
        </p>
      </div>
      <DailyProductionSheet />
    </div>
  )
}
