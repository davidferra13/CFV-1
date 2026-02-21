import { requireChef } from '@/lib/auth/get-user'
import { BreakEvenCalculator } from '@/components/finance/break-even-calculator'

export default async function BreakEvenPage() {
  await requireChef()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Break-Even Calculator</h1>
        <p className="text-sm text-stone-500 mt-1">
          Understand how many events you need to cover your fixed costs.
        </p>
      </div>
      <BreakEvenCalculator />
    </div>
  )
}
