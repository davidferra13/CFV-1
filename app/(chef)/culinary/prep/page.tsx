import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Prep Overview - ChefFlow' }

export default async function PrepPage() {
  await requireChef()
  const makeAheadComponents = await getAllComponents({ is_make_ahead: true })

  // Group by menu for display
  const byMenu = new Map<string, {
    menuId: string
    menuName: string
    items: typeof makeAheadComponents
  }>()

  for (const comp of makeAheadComponents) {
    const key = comp.menu_id ?? 'standalone'
    if (!byMenu.has(key)) {
      byMenu.set(key, {
        menuId: comp.menu_id ?? '',
        menuName: comp.menu_name ?? 'Standalone Components',
        items: [],
      })
    }
    byMenu.get(key)!.items.push(comp)
  }

  const groups = Array.from(byMenu.values())

  // Sort each group by make_ahead_window_hours descending (longest lead time first)
  for (const group of groups) {
    group.items.sort((a, b) => (b.make_ahead_window_hours ?? 0) - (a.make_ahead_window_hours ?? 0))
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-700">
          ← Culinary
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Prep Overview</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
            {makeAheadComponents.length} make-ahead
          </span>
        </div>
        <p className="text-stone-500 mt-1">Make-ahead components across all your menus, sorted by lead time</p>
      </div>

      {makeAheadComponents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No make-ahead components</p>
          <p className="text-stone-400 text-sm mb-4">
            Mark components as make-ahead inside a menu&apos;s dishes to track them here
          </p>
          <Link href="/culinary/menus">
            <Button variant="secondary" size="sm">Go to Menus</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.menuId}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-stone-800">{group.menuName}</h2>
                {group.menuId && (
                  <Link
                    href={`/culinary/menus/${group.menuId}`}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    View menu →
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {group.items.map(comp => (
                  <Card key={comp.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-stone-900">{comp.name}</p>
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                            {comp.category}
                          </span>
                          {comp.dish_name && (
                            <span className="text-xs text-stone-400">
                              {comp.dish_name}
                            </span>
                          )}
                        </div>
                        {comp.storage_notes && (
                          <p className="text-sm text-stone-500 mt-1">
                            <span className="font-medium">Storage:</span> {comp.storage_notes}
                          </p>
                        )}
                        {comp.execution_notes && (
                          <p className="text-sm text-stone-500 mt-0.5">
                            <span className="font-medium">Execution:</span> {comp.execution_notes}
                          </p>
                        )}
                        {comp.recipe_id && (
                          <Link
                            href={`/culinary/recipes/${comp.recipe_id}`}
                            className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                          >
                            View recipe →
                          </Link>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {comp.make_ahead_window_hours ? (
                          <div className="text-center">
                            <p className="text-xl font-bold text-amber-700">{comp.make_ahead_window_hours}h</p>
                            <p className="text-xs text-stone-400">lead time</p>
                          </div>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Make ahead
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
