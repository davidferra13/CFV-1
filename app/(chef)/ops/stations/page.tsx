// Station Coordination View - All stations at a glance with real-time status.
// Shows: par levels, 86'd items, checked-in staff, prep completion per station,
// bottlenecks, dependencies, clipboard status.
// Links to existing station detail pages for deeper management.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { listStations } from '@/lib/stations/actions'
import { getAll86dItems } from '@/lib/stations/clipboard-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Station Coordination' }

export default async function StationCoordinationPage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const [stations, eightySixed] = await Promise.all([listStations(), getAll86dItems()])

  // Get today's clipboard entries for all stations
  const { data: clipboardEntries } = await db
    .from('clipboard_entries')
    .select('station_id, on_hand, par_level, is_86d, component_name, station_name')
    .eq('chef_id', user.tenantId!)
    .eq('entry_date', today)

  // Get shift logs for today
  const { data: shiftLogs } = await db
    .from('shift_logs')
    .select(
      'station_id, staff_member_id, shift_type, checked_in_at, checked_out_at, staff_members(name)'
    )
    .eq('chef_id', user.tenantId!)
    .gte('checked_in_at', `${today}T00:00:00Z`)

  // Get tasks by station for today
  const { data: tasks } = await db
    .from('tasks')
    .select('station_id, status')
    .eq('chef_id', user.tenantId!)
    .eq('due_date', today)
    .not('station_id', 'is', null)

  // Build station status map
  const stationData = stations.map((s: any) => {
    const clips = (clipboardEntries || []).filter((c: any) => c.station_id === s.id)
    const totalPar = clips.reduce((sum: number, c: any) => sum + (c.par_level || 0), 0)
    const totalOnHand = clips.reduce((sum: number, c: any) => sum + (c.on_hand || 0), 0)
    const parPct = totalPar > 0 ? Math.round((totalOnHand / totalPar) * 100) : 100
    const items86 = clips.filter((c: any) => c.is_86d).length
    const componentCount = clips.length

    const shifts = (shiftLogs || []).filter((sl: any) => sl.station_id === s.id)
    const activeShifts = shifts.filter((sl: any) => !sl.checked_out_at)
    const staffNames = activeShifts.map((sl: any) => sl.staff_members?.name || 'Unknown')

    const stationTasks = (tasks || []).filter((t: any) => t.station_id === s.id)
    const tasksDone = stationTasks.filter((t: any) => t.status === 'done').length
    const tasksTotal = stationTasks.length

    return {
      ...s,
      parPct,
      items86,
      componentCount,
      staffNames,
      tasksDone,
      tasksTotal,
      lastShift: shifts.length > 0 ? shifts[shifts.length - 1] : null,
    }
  })

  const totalAlerts = eightySixed.length
  const stationsBelow80 = stationData.filter((s: any) => s.parPct < 80).length

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Station Coordination</h1>
          <p className="text-sm text-stone-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/stations/daily-ops" className="text-sm text-stone-500 hover:text-stone-300">
            Daily Ops
          </Link>
          <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
            Back to Ops
          </Link>
        </div>
      </div>

      {/* Alert Bar */}
      {(totalAlerts > 0 || stationsBelow80 > 0) && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex flex-wrap gap-2">
            {totalAlerts > 0 && (
              <Badge variant="error">{totalAlerts} items 86'd across all stations</Badge>
            )}
            {stationsBelow80 > 0 && (
              <Badge variant="warning">{stationsBelow80} stations below 80% par</Badge>
            )}
          </div>
        </div>
      )}

      {/* Station Grid */}
      {stationData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No stations configured.</p>
            <Link
              href="/stations"
              className="text-amber-400 hover:underline text-sm mt-2 inline-block"
            >
              Set up kitchen stations
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stationData.map((s: any) => {
            const parColor = s.parPct >= 80 ? 'emerald' : s.parPct >= 50 ? 'amber' : 'red'
            const barBg =
              parColor === 'emerald'
                ? 'bg-emerald-500'
                : parColor === 'amber'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            const borderColor =
              s.items86 > 0
                ? 'border-red-800'
                : s.parPct < 80
                  ? 'border-amber-800'
                  : 'border-stone-800'

            return (
              <Link key={s.id} href={`/stations/${s.id}`}>
                <Card
                  className={`border ${borderColor} hover:border-stone-600 transition-colors cursor-pointer`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-stone-200">{s.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {s.items86 > 0 && <Badge variant="error">{s.items86} 86'd</Badge>}
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            s.items86 > 0
                              ? 'bg-red-400 animate-pulse'
                              : s.parPct >= 80
                                ? 'bg-emerald-400'
                                : 'bg-amber-400'
                          }`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Par Level Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span>Par Level</span>
                        <span
                          className={
                            parColor === 'emerald'
                              ? 'text-emerald-400'
                              : parColor === 'amber'
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }
                        >
                          {s.parPct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barBg} rounded-full transition-all`}
                          style={{ width: `${s.parPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-stone-500">
                        Components: <span className="text-stone-300">{s.componentCount}</span>
                      </div>
                      <div className="text-stone-500">
                        Tasks:{' '}
                        <span className="text-stone-300">
                          {s.tasksDone}/{s.tasksTotal}
                        </span>
                      </div>
                    </div>

                    {/* Staff */}
                    <div>
                      {s.staffNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.staffNames.map((name: string, i: number) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-600">No staff checked in</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* 86'd Items Detail */}
      {eightySixed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-400">86'd Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eightySixed.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="text-stone-200">{item.component_name}</span>
                    <span className="text-stone-500 ml-2">({item.station_name})</span>
                  </div>
                  {item.eighty_sixed_at && (
                    <span className="text-xs text-stone-500">
                      Since {new Date(item.eighty_sixed_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/stations/menu-board', label: 'Menu Board', desc: 'Kitchen display' },
          { href: '/stations/ops-log', label: 'Ops Log', desc: 'Audit trail' },
          { href: '/stations/waste', label: 'Waste Log', desc: 'Track waste' },
          { href: '/stations/orders', label: 'Order Sheet', desc: 'Vendor orders' },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 hover:border-stone-700 transition-colors text-center">
              <p className="text-sm font-medium text-stone-200">{link.label}</p>
              <p className="text-xs text-stone-500">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
