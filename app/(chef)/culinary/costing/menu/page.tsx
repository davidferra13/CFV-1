import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getMenus, getAllComponents } from '@/lib/menus/actions'
import { getRecipes } from '@/lib/recipes/actions'
import { safeFetchAll } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Menu Cost' }

export default async function MenuCostPage() {
  await requireChef()
  const result = await safeFetchAll({
    menus: () => getMenus(),
    components: () => getAllComponents(),
    recipes: () => getRecipes(),
  })

  if (result.error) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/culinary/costing" className="text-sm text-stone-500 hover:text-stone-300">
            ← Costing
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Menu Cost</h1>
        </div>
        <ErrorState title="Could not load menu cost data" description={result.error} />
      </div>
    )
  }

  const { menus, components, recipes } = result.data!

  // Build recipe cost lookup
  const recipeCostMap = new Map<string, number>()
  for (const r of recipes) {
    if (r.total_cost_cents) recipeCostMap.set(r.id, r.total_cost_cents)
  }

  // Count components per menu and estimate menu cost from linked recipes
  const compsByMenu = new Map<string, typeof components>()
  for (const comp of components) {
    if (!comp.menu_id) continue
    if (!compsByMenu.has(comp.menu_id)) compsByMenu.set(comp.menu_id, [])
    compsByMenu.get(comp.menu_id)!.push(comp)
  }

  const menuData = menus.map((menu: any) => {
    const menuComponents = compsByMenu.get(menu.id) ?? []
    const componentCount = menuComponents.length

    // Sum recipe costs for linked components
    let estimatedCostCents = 0
    let pricedCount = 0
    for (const comp of menuComponents) {
      if (comp.recipe_id) {
        const cost = recipeCostMap.get(comp.recipe_id)
        if (cost) {
          estimatedCostCents += cost
          pricedCount++
        }
      }
    }

    const costPerGuest =
      menu.target_guest_count && estimatedCostCents > 0
        ? Math.round(estimatedCostCents / menu.target_guest_count)
        : null

    return { menu, componentCount, estimatedCostCents, pricedCount, costPerGuest }
  })

  const withCost = menuData.filter((m: any) => m.estimatedCostCents > 0)
  const noCost = menuData.filter((m: any) => m.estimatedCostCents === 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/costing" className="text-sm text-stone-500 hover:text-stone-300">
          ← Costing
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Menu Cost</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {menus.length} menus
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Estimated menu costs based on linked recipe ingredient pricing
        </p>
      </div>

      <Card className="p-4 bg-stone-800 border-stone-700">
        <p className="text-sm text-stone-400">
          Menu cost is estimated by summing the ingredient costs of each recipe linked to a menu
          component. Recipes without full ingredient pricing will show partial estimates. Set a
          target guest count on a menu to see cost-per-guest.
        </p>
      </Card>

      {menus.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No menus yet</p>
          <Link
            href="/culinary/menus"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Create a menu →
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Components</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Target Guests</TableHead>
                <TableHead>Cost / Guest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuData
                .sort((a: any, b: any) => b.estimatedCostCents - a.estimatedCostCents)
                .map(
                  ({
                    menu,
                    componentCount,
                    estimatedCostCents,
                    pricedCount,
                    costPerGuest,
                  }: any) => (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/culinary/menus/${menu.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {menu.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full capitalize">
                          {menu.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-stone-500 text-sm">{componentCount}</TableCell>
                      <TableCell className="font-semibold text-stone-100">
                        {estimatedCostCents > 0 ? (
                          <span>
                            ${(estimatedCostCents / 100).toFixed(2)}
                            {pricedCount < componentCount && componentCount > 0 && (
                              <span className="ml-1 text-xs text-amber-600 font-normal">
                                partial
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-stone-500 text-sm">
                        {menu.target_guest_count ?? <span className="text-stone-300">-</span>}
                      </TableCell>
                      <TableCell className="text-stone-300 text-sm font-medium">
                        {costPerGuest != null ? (
                          `$${(costPerGuest / 100).toFixed(2)}`
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
            </TableBody>
          </Table>
        </Card>
      )}

      {noCost.length > 0 && withCost.length > 0 && (
        <p className="text-xs text-stone-400">
          {noCost.length} menu{noCost.length !== 1 ? 's' : ''} have no linked recipe pricing yet.
        </p>
      )}
    </div>
  )
}
