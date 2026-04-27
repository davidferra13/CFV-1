// Recipe Urgency Banner
// Shows on dashboard when the chef has dishes served but no recipes recorded.
// Links to brain dump and recipe sprint for fastest capture paths.

import { getRecipeDebt } from '@/lib/recipes/actions'
import Link from 'next/link'

export async function RecipeUrgencyBanner() {
  const debt = await getRecipeDebt().catch(() => null)

  if (!debt || debt.total === 0) return null

  // If chef has zero recipes at all, show a stronger message
  const hasNoRecipes = debt.totalRecipes === 0

  return (
    <div className="rounded-xl border border-violet-700/40 bg-violet-950/20 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-300">
            {hasNoRecipes
              ? 'Zero recipes documented'
              : `${debt.total} ${debt.total === 1 ? 'dish' : 'dishes'} served with no recipe recorded`}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {hasNoRecipes
              ? 'Your recipes are your IP. Get them out of your head and into the system.'
              : debt.last7Days > 0
                ? `${debt.last7Days} from the last week alone`
                : `${debt.last30Days} from the last month`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/recipes/dump"
            className="inline-flex items-center justify-center px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Brain Dump
          </Link>
          {debt.total > 3 && (
            <Link
              href="/recipes/sprint"
              className="inline-flex items-center justify-center px-3 py-2 border border-violet-700 text-violet-300 text-sm font-medium rounded-lg hover:bg-violet-900/40 transition-colors"
            >
              Sprint Mode
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
