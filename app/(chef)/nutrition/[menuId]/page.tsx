// Nutrition Analysis - Full detail page for a menu's nutritional breakdown.
// Pro feature: nutrition-analysis module.
// Server component: fetches menu + nutrition data, renders MenuNutritionPanel.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getMenuById } from '@/lib/menus/actions'
import { getMenuNutrition, getNutritionDisplaySetting } from '@/lib/nutrition/analysis-actions'
import { MenuNutritionPanel } from '@/components/nutrition/menu-nutrition-panel'
import { Button } from '@/components/ui/button'

export async function generateMetadata({ params }: { params: { menuId: string } }) {
  const menu = await getMenuById(params.menuId).catch(() => null)
  return {
    title: menu ? `Nutrition - ${menu.name}` : 'Nutrition Analysis',
  }
}

export default async function NutritionDetailPage({ params }: { params: { menuId: string } }) {
  await requireChef()
  await requirePro('nutrition-analysis')

  const menu = await getMenuById(params.menuId)
  if (!menu) notFound()

  const [nutrition, showOnProposals] = await Promise.all([
    getMenuNutrition(params.menuId),
    getNutritionDisplaySetting(params.menuId),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Nutrition Analysis</h1>
          <p className="text-stone-500 mt-1 text-sm">{menu.name}</p>
        </div>
        <div className="flex gap-2">
          {menu.event_id && (
            <Link href={`/events/${menu.event_id}`}>
              <Button variant="ghost">Back to Event</Button>
            </Link>
          )}
          <Link href="/menus">
            <Button variant="ghost">All Menus</Button>
          </Link>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-400">
        <p>
          Nutritional data is fetched from the Spoonacular API based on dish names. Values are
          estimates per serving. You can override any value manually.
        </p>
      </div>

      {/* Main panel */}
      <MenuNutritionPanel
        menuId={params.menuId}
        initialNutrition={nutrition}
        showOnProposals={showOnProposals}
      />
    </div>
  )
}
