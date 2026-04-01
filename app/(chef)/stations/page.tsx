// Station Clipboard - Station List & Management Hub
// Chef views all stations, creates new ones, and navigates to detail views.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { listStations } from '@/lib/stations/actions'
import { getAll86dItems } from '@/lib/stations/clipboard-actions'
import { StationForm } from '@/components/stations/station-form'
import { EightySixBanner } from '@/components/stations/eighty-six-banner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Stations' }

export default async function StationsPage() {
  await requireChef()
  await requireFocusAccess()
  const stations = await listStations()
  const eightySixedItems = await getAll86dItems()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Station Clipboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Kitchen stations, daily prep clipboards, and shift handoffs. Manage your line.
          </p>
        </div>
      </div>

      {/* Operational surfaces - quick links to the full ops stack */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/stations/daily-ops"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          Daily Ops
        </Link>
        <Link
          href="/stations/ops-log"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          Ops Log
        </Link>
        <Link
          href="/stations/waste"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          Waste Log
        </Link>
        <Link
          href="/stations/orders"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          Order Sheet
        </Link>
      </div>

      {/* 86'd banner - shows all currently 86'd items across all stations */}
      {eightySixedItems.length > 0 && <EightySixBanner items={eightySixedItems} />}

      {/* Station grid */}
      {stations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">
              No stations yet. Create your first station below to start tracking prep.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station: any) => (
            <Link key={station.id} href={`/stations/${station.id}`}>
              <Card interactive className="h-full">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-stone-100 text-lg">{station.name}</h3>
                    <Badge variant="default">#{station.display_order + 1}</Badge>
                  </div>
                  {station.description && (
                    <p className="mt-1 text-sm text-stone-400 line-clamp-2">
                      {station.description}
                    </p>
                  )}
                  <div className="mt-3 flex gap-3 text-xs text-stone-500">
                    <span>
                      {station.menu_item_count} menu item{station.menu_item_count !== 1 ? 's' : ''}
                    </span>
                    <span>
                      {station.component_count} component{station.component_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add new station */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h3 className="font-semibold text-stone-100 mb-4">Add Station</h3>
          <StationForm />
        </CardContent>
      </Card>
    </div>
  )
}
