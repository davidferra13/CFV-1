// Station Detail - Shows station info, menu items, components, and links to clipboard/shifts/ops log
// Serves as the hub for a single station.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getStation } from '@/lib/stations/actions'
import { getLastShiftHandoff } from '@/lib/stations/clipboard-actions'
import { StationForm } from '@/components/stations/station-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  addMenuItemToStation,
  removeMenuItemFromStation,
  addComponent,
  removeComponent,
} from '@/lib/stations/actions'

export const metadata: Metadata = { title: 'Station Detail' }

export default async function StationDetailPage({ params }: { params: { id: string } }) {
  await requireChef()

  let station: any
  try {
    station = await getStation(params.id)
  } catch {
    notFound()
  }

  const lastHandoff = await getLastShiftHandoff(params.id)

  const _sip = new Date()
  const today = `${_sip.getFullYear()}-${String(_sip.getMonth() + 1).padStart(2, '0')}-${String(_sip.getDate()).padStart(2, '0')}`
  const totalComponents = (station.station_menu_items ?? []).reduce(
    (sum: number, mi: any) => sum + (mi.station_components?.length ?? 0),
    0
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/stations" className="text-sm text-stone-500 hover:text-stone-300">
              Stations
            </Link>
            <span className="text-stone-600">/</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mt-1">{station.name}</h1>
          {station.description && (
            <p className="mt-1 text-sm text-stone-400">{station.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/stations/${params.id}/shift-history`}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
          >
            Shift History
          </Link>
          <Link href={`/stations/${params.id}/clipboard`}>
            <Button variant="primary">Open Clipboard</Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-stone-100">
              {station.station_menu_items?.length ?? 0}
            </div>
            <div className="text-xs text-stone-500 mt-1">Menu Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-stone-100">{totalComponents}</div>
            <div className="text-xs text-stone-500 mt-1">Components</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-stone-100">{today}</div>
            <div className="text-xs text-stone-500 mt-1">Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-stone-100">{lastHandoff ? 'Yes' : 'No'}</div>
            <div className="text-xs text-stone-500 mt-1">Last Handoff</div>
          </CardContent>
        </Card>
      </div>

      {/* Last shift handoff */}
      {lastHandoff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Shift Handoff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-stone-400">
              <span>
                Checked out: {new Date((lastHandoff as any).check_out_at).toLocaleString()}
              </span>
              <span>Shift: {(lastHandoff as any).shift_type}</span>
            </div>
            {(lastHandoff as any).notes && (
              <p className="mt-2 text-sm text-stone-300 bg-stone-800 rounded-lg p-3">
                {(lastHandoff as any).notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Menu Items & Components */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu Items &amp; Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(station.station_menu_items ?? []).length === 0 ? (
            <p className="text-sm text-stone-500">
              No menu items assigned to this station. Add one below.
            </p>
          ) : (
            (station.station_menu_items ?? []).map((mi: any) => (
              <div key={mi.id} className="border border-stone-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-100">{mi.name}</span>
                    <Badge variant="default">
                      {mi.station_components?.length ?? 0} component
                      {(mi.station_components?.length ?? 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <form
                    action={async () => {
                      'use server'
                      await removeMenuItemFromStation(mi.id)
                    }}
                  >
                    <Button type="submit" variant="ghost" size="sm" className="text-stone-400">
                      Remove
                    </Button>
                  </form>
                </div>
                {mi.description && <p className="mt-1 text-xs text-stone-500">{mi.description}</p>}

                {/* Components list */}
                {(mi.station_components ?? []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    {mi.station_components.map((comp: any) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between text-sm bg-stone-800/50 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-stone-200">{comp.name}</span>
                          <span className="text-stone-500">
                            Par: {comp.par_level} {comp.par_unit ?? comp.unit}
                          </span>
                          {comp.shelf_life_days && (
                            <Badge variant="info">{comp.shelf_life_days}d shelf life</Badge>
                          )}
                        </div>
                        <form
                          action={async () => {
                            'use server'
                            await removeComponent(comp.id)
                          }}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-stone-500 text-xs"
                          >
                            Remove
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add component form (inline server action) */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-amber-700 hover:text-amber-500">
                    + Add Component
                  </summary>
                  <form
                    className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2"
                    action={async (formData: FormData) => {
                      'use server'
                      await addComponent({
                        station_menu_item_id: mi.id,
                        name: formData.get('name') as string,
                        unit: formData.get('unit') as string,
                        par_level: parseFloat(formData.get('par_level') as string) || 0,
                        par_unit: (formData.get('par_unit') as string) || undefined,
                        shelf_life_days: formData.get('shelf_life_days')
                          ? parseInt(formData.get('shelf_life_days') as string, 10)
                          : undefined,
                        notes: (formData.get('notes') as string) || undefined,
                      })
                    }}
                  >
                    <input
                      name="name"
                      required
                      placeholder="Component name"
                      className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                    />
                    <input
                      name="unit"
                      required
                      placeholder="Unit (ea, qt, lb)"
                      className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                    />
                    <input
                      name="par_level"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Par level"
                      className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                    />
                    <input
                      name="shelf_life_days"
                      type="number"
                      min="1"
                      placeholder="Shelf life (days)"
                      className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                    />
                    <input
                      name="par_unit"
                      placeholder="Par unit (optional)"
                      className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                    />
                    <input
                      name="notes"
                      placeholder="Notes (optional)"
                      className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 md:col-span-2"
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                  </form>
                </details>
              </div>
            ))
          )}

          {/* Add menu item form */}
          <details>
            <summary className="cursor-pointer text-sm text-amber-700 hover:text-amber-500 font-medium">
              + Add Menu Item to Station
            </summary>
            <form
              className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3"
              action={async (formData: FormData) => {
                'use server'
                await addMenuItemToStation({
                  station_id: params.id,
                  name: formData.get('name') as string,
                  description: (formData.get('description') as string) || undefined,
                })
              }}
            >
              <input
                name="name"
                required
                placeholder="Menu item name"
                className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
              />
              <input
                name="description"
                placeholder="Description (optional)"
                className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
              />
              <Button type="submit" size="sm">
                Add Menu Item
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>

      {/* Edit station */}
      <details>
        <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-300">
          Edit Station Details
        </summary>
        <Card className="mt-3">
          <CardContent className="pt-5 pb-5">
            <StationForm station={station} />
          </CardContent>
        </Card>
      </details>
    </div>
  )
}
