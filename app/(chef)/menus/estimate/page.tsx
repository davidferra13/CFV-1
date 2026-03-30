import { MenuCostEstimator } from '@/components/menus/menu-cost-estimator'
import { Calculator } from 'lucide-react'

export default function MenuEstimatePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600/20">
            <Calculator className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100">Menu Cost Estimator</h1>
            <p className="text-sm text-stone-500">
              Paste dish names to get instant cost estimates with gap detection
            </p>
          </div>
        </div>
      </div>

      <MenuCostEstimator />
    </div>
  )
}
