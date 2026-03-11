import type { Metadata } from 'next'
import Link from 'next/link'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from '@/components/ui/button'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getMenus } from '@/lib/menus/actions'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Nutrition Analysis - ChefFlow' }

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : null
}

export default async function NutritionIndexPage() {
  await requireChef()
  await requirePro('nutrition-analysis')

  const menus = await getMenus()
  const recentMenus = menus.slice(0, 24)
  const menuIds = recentMenus.map((menu: any) => menu.id)
  const eventIds = Array.from(
    new Set(recentMenus.map((menu: any) => menu.event_id).filter(Boolean))
  ) as string[]

  const supabase: any = createServerClient()
  const [{ data: linkedEvents }, { data: nutritionRows }] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from('events')
          .select('id, occasion, event_date, status')
          .in('id', eventIds)
      : Promise.resolve({ data: [] }),
    menuIds.length > 0
      ? supabase.from('menu_nutrition').select('menu_id').in('menu_id', menuIds)
      : Promise.resolve({ data: [] }),
  ])

  const eventsById = Object.fromEntries((linkedEvents ?? []).map((event: any) => [event.id, event]))
  const analyzedMenuIds = new Set((nutritionRows ?? []).map((row: any) => row.menu_id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-950/60 p-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Nutrition Workspace
          </p>
          <h1 className="text-3xl font-semibold text-stone-100">Analyze a menu</h1>
          <p className="text-sm text-stone-400">
            Pick a menu to estimate macros, review allergens, and control whether nutrition appears
            on proposals.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/menus" variant="secondary">
            All Menus
          </Button>
          <Button href="/menus/new">Create Menu</Button>
        </div>
      </div>

      {recentMenus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/60 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-stone-100">No menus to analyze yet</h2>
          <p className="mt-2 text-sm text-stone-400">
            Create a menu first, then come back here to generate nutrition estimates.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button href="/menus/new">Create Menu</Button>
            <Button href="/menus" variant="secondary">
              Browse Menus
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {recentMenus.map((menu: any) => {
            const linkedEvent = menu.event_id ? eventsById[menu.event_id] : null
            const createdAt = formatDateLabel(menu.created_at)
            const eventDate = formatDateLabel(linkedEvent?.event_date)

            return (
              <div
                key={menu.id}
                className="rounded-2xl border border-stone-800 bg-stone-950/50 p-5 shadow-sm shadow-black/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-stone-100">
                        {menu.name ?? 'Untitled menu'}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          analyzedMenuIds.has(menu.id)
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {analyzedMenuIds.has(menu.id) ? 'Nutrition saved' : 'Ready to analyze'}
                      </span>
                      {menu.is_template ? (
                        <span className="rounded-full bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-300">
                          Template
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm text-stone-400">
                      <p>{linkedEvent?.occasion ?? 'Standalone menu'}</p>
                      <p>
                        {eventDate ? `Event date ${eventDate}` : createdAt ? `Created ${createdAt}` : ' '}
                      </p>
                      {linkedEvent?.status ? <p>Status: {linkedEvent.status}</p> : null}
                    </div>
                  </div>
                  <Link
                    href={`/nutrition/${menu.id}`}
                    className="inline-flex items-center rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-800"
                  >
                    Open
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
