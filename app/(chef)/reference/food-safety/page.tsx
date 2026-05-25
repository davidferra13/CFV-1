import { FoodSafetyTable } from '@/components/reference/food-safety-table'
import { Thermometer } from '@/components/ui/icons'

export const metadata = {
  title: 'Food Safety Reference',
}

export default function FoodSafetyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Thermometer className="w-6 h-6 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Food Safety Reference</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Safe internal temperatures, hold temps, cooling protocols, and storage guidelines. FDA
            and USDA sourced.
          </p>
        </div>
      </div>

      <FoodSafetyTable />
    </div>
  )
}
