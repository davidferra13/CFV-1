// Recipe Debt Widget
// Shows unrecorded dish components across all events.
// Appears on the dashboard when debt > 0 — daily habit trigger.

import Link from 'next/link'
import { BookOpen, ArrowRight, AlertCircle } from '@/components/ui/icons'
import type { RecipeDebt } from '@/lib/recipes/actions'

type Props = {
  debt: RecipeDebt
}

export function RecipeDebtWidget({ debt }: Props) {
  if (debt.total === 0) {
    // Show a celebration state when all caught up
    return (
      <div className="flex items-center gap-3 bg-green-950 border border-green-200 rounded-lg px-4 py-3">
        <BookOpen className="h-5 w-5 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-900">
            Recipe Book up to date — {debt.totalRecipes} recipe{debt.totalRecipes !== 1 ? 's' : ''}{' '}
            recorded
          </p>
        </div>
        <Link
          href="/recipes"
          className="text-xs text-green-200 hover:text-green-200 font-medium whitespace-nowrap"
        >
          View all
        </Link>
      </div>
    )
  }

  const urgencyColor =
    debt.last7Days > 0 ? 'border-red-300 bg-red-950' : 'border-amber-300 bg-amber-950'

  const urgencyTextColor = debt.last7Days > 0 ? 'text-red-900' : 'text-amber-900'
  const urgencySubColor = debt.last7Days > 0 ? 'text-red-200' : 'text-amber-200'
  const iconColor = debt.last7Days > 0 ? 'text-red-500' : 'text-amber-500'

  return (
    <div className={`border rounded-lg px-4 py-3 ${urgencyColor}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${urgencyTextColor}`}>
            {debt.total} dish{debt.total !== 1 ? 'es' : ''} with no recipe recorded
          </p>

          <div className={`text-xs mt-1 flex flex-wrap gap-3 ${urgencySubColor}`}>
            {debt.last7Days > 0 && (
              <span className="font-medium">{debt.last7Days} from the last 7 days</span>
            )}
            {debt.last30Days > 0 && <span>{debt.last30Days} from the last 30 days</span>}
            {debt.older > 0 && <span>{debt.older} older</span>}
            <span className="text-stone-500">
              {debt.totalRecipes} recipe{debt.totalRecipes !== 1 ? 's' : ''} in your Book
            </span>
          </div>
        </div>

        <Link
          href="/recipes/sprint"
          className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-md
            ${
              debt.last7Days > 0
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
        >
          Capture Now <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
