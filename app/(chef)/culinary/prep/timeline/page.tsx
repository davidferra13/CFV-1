import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllComponents } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import { SymbolKeyTrigger } from '@/components/ui/symbol-key'

export const metadata: Metadata = { title: 'Prep Timeline' }

export default async function PrepTimelinePage() {
  await requireChef()
  const makeAheadComponents = await getAllComponents({ is_make_ahead: true })

  // Group by menu
  const byMenu = new Map<string, { menuName: string; components: typeof makeAheadComponents }>()
  for (const comp of makeAheadComponents) {
    const key = comp.menu_id ?? '__no_menu__'
    if (!byMenu.has(key)) {
      byMenu.set(key, { menuName: comp.menu_name ?? 'Unassigned', components: [] })
    }
    byMenu.get(key)!.components.push(comp)
  }

  // Sort components within each menu by make_ahead_window_hours descending
  for (const entry of byMenu.values()) {
    entry.components.sort(
      (a, b) => (b.make_ahead_window_hours ?? 0) - (a.make_ahead_window_hours ?? 0)
    )
  }

  const menus = Array.from(byMenu.entries()).sort((a, b) =>
    a[1].menuName.localeCompare(b[1].menuName)
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/prep" className="text-sm text-stone-500 hover:text-stone-300">
          ← Prep
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Prep Timeline</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {makeAheadComponents.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Make-ahead components ordered by lead time - longest prep first
        </p>
      </div>

      <Card className="p-4 bg-amber-950 border-amber-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800">How to use this view</p>
            <p className="text-sm text-amber-700 mt-1">
              Components marked as make-ahead on a menu appear here, grouped by menu and sorted from
              longest to shortest lead time. Use this to build your day-by-day prep schedule working
              backwards from the event date.
            </p>
          </div>
          <div className="shrink-0">
            <SymbolKeyTrigger />
          </div>
        </div>
      </Card>

      {makeAheadComponents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No make-ahead components yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Mark components on a menu as make-ahead and set their lead time to see them here
          </p>
          <Link
            href="/culinary/menus"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Browse menus →
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {menus.map(([menuId, { menuName, components }]) => (
            <div key={menuId}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold text-stone-200">{menuName}</h2>
                <span className="text-xs bg-stone-800 text-stone-500 px-2 py-0.5 rounded-full">
                  {components.length} make-ahead
                </span>
                {menuId !== '__no_menu__' && (
                  <Link
                    href={`/culinary/menus/${menuId}`}
                    className="text-xs text-brand-600 hover:underline ml-auto"
                  >
                    View menu →
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {components.map((comp) => {
                  const hours = comp.make_ahead_window_hours ?? 0
                  const days = Math.floor(hours / 24)
                  const remHours = hours % 24
                  const leadLabel =
                    days > 0
                      ? `${days}d${remHours > 0 ? ` ${remHours}h` : ''} ahead`
                      : `${hours}h ahead`

                  return (
                    <Card key={comp.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-20 text-right">
                          <span className="text-sm font-semibold text-brand-400">{leadLabel}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-stone-100">{comp.name}</p>
                          {comp.dish_name && (
                            <p className="text-xs text-stone-500 mt-0.5">For: {comp.dish_name}</p>
                          )}
                          {comp.storage_notes && (
                            <p className="text-sm text-stone-500 mt-1">
                              <span className="text-stone-400">Storage:</span> {comp.storage_notes}
                            </p>
                          )}
                          {comp.execution_notes && (
                            <p className="text-sm text-stone-500 mt-0.5">
                              <span className="text-stone-400">Execution:</span>{' '}
                              {comp.execution_notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <span className="text-xs bg-stone-800 text-stone-500 px-2 py-0.5 rounded-full capitalize">
                            {comp.category}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
