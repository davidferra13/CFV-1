import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type SourceName = 'stations' | 'clipboard' | 'shifts' | 'tasks' | 'dependencies'

type LoadResult<T> = {
  data: T[]
  error: string | null
}

type StationRow = {
  id: string
  name: string
  description: string | null
  status: string
  station_menu_items?: Array<{
    id: string
    name: string
    station_components?: Array<{ id: string }>
  }>
}

type ClipboardEntry = {
  id: string
  station_id: string
  component_id: string
  on_hand: number | null
  made: number | null
  need_to_make: number | null
  need_to_order: number | null
  is_86d: boolean
  eighty_sixed_at: string | null
  updated_at: string | null
  station_components?: {
    id: string
    name: string
    unit: string
    par_level: number | null
  } | null
}

type ShiftLog = {
  id: string
  station_id: string
  staff_member_id: string | null
  shift: 'open' | 'mid' | 'close'
  check_in_at: string
  check_out_at: string | null
  staff_members?: { name: string | null } | null
}

type TaskRow = {
  id: string
  station_id: string | null
  title: string
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_time: string | null
  assigned_to: string | null
  staff_members?: { name: string | null } | null
}

type TaskDependency = {
  task_id: string
  depends_on_task_id: string
}

type StationView = {
  id: string
  name: string
  description: string | null
  configuredComponents: number
  configuredMenuItems: number
  clipboardCount: number | null
  parPct: number | null
  parTrackedCount: number | null
  items86: ClipboardEntry[]
  needsPrepCount: number | null
  needsOrderCount: number | null
  staffNames: string[] | null
  tasksDone: number | null
  tasksTotal: number | null
  overdueTasks: TaskRow[] | null
  blockedTasks: number | null
  lastUpdated: string | null
}

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
}

function sourceError(source: SourceName, message: string) {
  return `${source}: ${message}`
}

async function loadRows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
  source: SourceName
): Promise<LoadResult<T>> {
  const { data, error } = await query
  if (error) {
    console.error(`[StationRealtimeData] ${source} query failed`, error)
    return { data: [], error: sourceError(source, error.message ?? 'Failed to load data') }
  }
  return { data: data ?? [], error: null }
}

function formatTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDueTime(time: string | null) {
  if (!time) return 'No time'
  const [hourRaw, minuteRaw] = time.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw ?? '0')
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isOverdue(task: TaskRow, now: Date) {
  if (task.status === 'done' || !task.due_time) return false
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:00`
  return task.due_time < currentTime
}

function buildStationViews({
  stations,
  clipboard,
  shifts,
  tasks,
  dependencies,
  sourceErrors,
}: {
  stations: StationRow[]
  clipboard: ClipboardEntry[]
  shifts: ShiftLog[]
  tasks: TaskRow[]
  dependencies: TaskDependency[]
  sourceErrors: Partial<Record<SourceName, string | null>>
}) {
  const now = new Date()
  const taskStatus = new Map(tasks.map((task) => [task.id, task.status]))
  const blockedTaskIds = new Set(
    dependencies
      .filter((dependency) => taskStatus.get(dependency.depends_on_task_id) !== 'done')
      .map((dependency) => dependency.task_id)
  )

  return stations.map((station): StationView => {
    const stationClipboard = clipboard.filter((entry) => entry.station_id === station.id)
    const parTrackedEntries = stationClipboard.filter(
      (entry) => Number(entry.station_components?.par_level ?? 0) > 0
    )
    const atParEntries = parTrackedEntries.filter((entry) => {
      const parLevel = Number(entry.station_components?.par_level ?? 0)
      const onHand = Number(entry.on_hand ?? 0) + Number(entry.made ?? 0)
      return onHand >= parLevel * 0.8
    })
    const parPct =
      parTrackedEntries.length > 0
        ? Math.round((atParEntries.length / parTrackedEntries.length) * 100)
        : null

    const stationShifts = shifts.filter((shift) => shift.station_id === station.id)
    const stationTasks = tasks.filter((task) => task.station_id === station.id)
    const stationOverdueTasks = stationTasks.filter((task) => isOverdue(task, now))
    const updatedTimes = stationClipboard
      .map((entry) => entry.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .reverse()

    return {
      id: station.id,
      name: station.name,
      description: station.description,
      configuredComponents:
        station.station_menu_items?.reduce(
          (sum, item) => sum + (item.station_components?.length ?? 0),
          0
        ) ?? 0,
      configuredMenuItems: station.station_menu_items?.length ?? 0,
      clipboardCount: sourceErrors.clipboard ? null : stationClipboard.length,
      parPct: sourceErrors.clipboard ? null : parPct,
      parTrackedCount: sourceErrors.clipboard ? null : parTrackedEntries.length,
      items86: sourceErrors.clipboard ? [] : stationClipboard.filter((entry) => entry.is_86d),
      needsPrepCount: sourceErrors.clipboard
        ? null
        : stationClipboard.filter((entry) => Number(entry.need_to_make ?? 0) > 0).length,
      needsOrderCount: sourceErrors.clipboard
        ? null
        : stationClipboard.filter((entry) => Number(entry.need_to_order ?? 0) > 0).length,
      staffNames: sourceErrors.shifts
        ? null
        : stationShifts.map((shift) => shift.staff_members?.name ?? 'Unassigned staff'),
      tasksDone: sourceErrors.tasks
        ? null
        : stationTasks.filter((task) => task.status === 'done').length,
      tasksTotal: sourceErrors.tasks ? null : stationTasks.length,
      overdueTasks: sourceErrors.tasks ? null : stationOverdueTasks,
      blockedTasks:
        sourceErrors.tasks || sourceErrors.dependencies
          ? null
          : stationTasks.filter((task) => task.status !== 'done' && blockedTaskIds.has(task.id))
              .length,
      lastUpdated: updatedTimes[0] ?? null,
    }
  })
}

function SummaryCard({
  label,
  value,
  sub,
  tone = 'stone',
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'stone' | 'emerald' | 'amber' | 'red'
}) {
  const textColor =
    tone === 'emerald'
      ? 'text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-400'
        : tone === 'red'
          ? 'text-red-400'
          : 'text-stone-100'

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3">
      <p className="text-xs text-stone-500 uppercase">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${textColor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  )
}

function Unavailable({ label }: { label: string }) {
  return <span className="text-stone-600">{label} unavailable</span>
}

export async function StationRealtimeData() {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!
  const today = todayString()

  const stationsResult = await loadRows<StationRow>(
    db
      .from('stations')
      .select(
        `
        id,
        name,
        description,
        status,
        station_menu_items (
          id,
          name,
          station_components (id)
        )
      `
      )
      .eq('chef_id', chefId)
      .eq('status', 'active')
      .order('display_order'),
    'stations'
  )

  if (stationsResult.error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-stone-300">Station data is unavailable.</p>
          <p className="mt-2 text-sm text-stone-500">{stationsResult.error}</p>
        </CardContent>
      </Card>
    )
  }

  const [clipboardResult, shiftsResult, tasksResult] = await Promise.all([
    loadRows<ClipboardEntry>(
      db
        .from('clipboard_entries')
        .select(
          `
          id,
          station_id,
          component_id,
          on_hand,
          made,
          need_to_make,
          need_to_order,
          is_86d,
          eighty_sixed_at,
          updated_at,
          station_components (id, name, unit, par_level)
        `
        )
        .eq('chef_id', chefId)
        .eq('entry_date', today),
      'clipboard'
    ),
    loadRows<ShiftLog>(
      db
        .from('shift_logs')
        .select(
          'id, station_id, staff_member_id, shift, check_in_at, check_out_at, staff_members(name)'
        )
        .eq('chef_id', chefId)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false }),
      'shifts'
    ),
    loadRows<TaskRow>(
      db
        .from('tasks')
        .select(
          'id, station_id, title, status, priority, due_time, assigned_to, staff_members(name)'
        )
        .eq('chef_id', chefId)
        .eq('due_date', today)
        .not('station_id', 'is', null)
        .order('due_time', { ascending: true, nullsFirst: false }),
      'tasks'
    ),
  ])

  const dependencyResult =
    tasksResult.error || tasksResult.data.length === 0
      ? { data: [], error: null }
      : await loadRows<TaskDependency>(
          db
            .from('task_dependencies')
            .select('task_id, depends_on_task_id')
            .eq('chef_id', chefId)
            .in(
              'task_id',
              tasksResult.data.map((task) => task.id)
            ),
          'dependencies'
        )

  const sourceErrors = {
    clipboard: clipboardResult.error,
    shifts: shiftsResult.error,
    tasks: tasksResult.error,
    dependencies: dependencyResult.error,
  }
  const stationData = buildStationViews({
    stations: stationsResult.data,
    clipboard: clipboardResult.data,
    shifts: shiftsResult.data,
    tasks: tasksResult.data,
    dependencies: dependencyResult.data,
    sourceErrors,
  })

  const total86 = sourceErrors.clipboard
    ? null
    : stationData.reduce((sum, station) => sum + station.items86.length, 0)
  const stationsBelowPar = sourceErrors.clipboard
    ? null
    : stationData.filter((station) => station.parPct !== null && station.parPct < 80).length
  const staffedStations = sourceErrors.shifts
    ? null
    : stationData.filter((station) => (station.staffNames?.length ?? 0) > 0).length
  const blockedTasks =
    sourceErrors.tasks || sourceErrors.dependencies
      ? null
      : stationData.reduce((sum, station) => sum + (station.blockedTasks ?? 0), 0)
  const overdueTasks = sourceErrors.tasks
    ? null
    : stationData.reduce((sum, station) => sum + (station.overdueTasks?.length ?? 0), 0)
  const all86Items = stationData.flatMap((station) =>
    station.items86.map((entry) => ({ ...entry, stationName: station.name }))
  )

  return (
    <>
      {Object.values(sourceErrors).some(Boolean) && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-amber-300">
            Some station metrics are unavailable.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(sourceErrors)
              .filter((error): error is string => Boolean(error))
              .map((error) => (
                <Badge key={error} variant="warning">
                  {error}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {(total86 !== null && total86 > 0) ||
      (stationsBelowPar !== null && stationsBelowPar > 0) ||
      (blockedTasks !== null && blockedTasks > 0) ||
      (overdueTasks !== null && overdueTasks > 0) ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex flex-wrap gap-2">
            {total86 !== null && total86 > 0 && (
              <Badge variant="error">{total86} items 86'd across stations</Badge>
            )}
            {stationsBelowPar !== null && stationsBelowPar > 0 && (
              <Badge variant="warning">{stationsBelowPar} stations below 80% par</Badge>
            )}
            {blockedTasks !== null && blockedTasks > 0 && (
              <Badge variant="warning">{blockedTasks} blocked station tasks</Badge>
            )}
            {overdueTasks !== null && overdueTasks > 0 && (
              <Badge variant="error">{overdueTasks} overdue station tasks</Badge>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Stations" value={stationData.length} />
        <SummaryCard
          label="Staffed"
          value={staffedStations ?? 'Unavailable'}
          sub={staffedStations === null ? 'Shift logs failed' : 'Active check-ins'}
          tone={staffedStations === null ? 'amber' : staffedStations > 0 ? 'emerald' : 'stone'}
        />
        <SummaryCard
          label="86 Items"
          value={total86 ?? 'Unavailable'}
          sub={total86 === null ? 'Clipboard failed' : "Today's clipboard"}
          tone={total86 === null ? 'amber' : total86 > 0 ? 'red' : 'emerald'}
        />
        <SummaryCard
          label="Below Par"
          value={stationsBelowPar ?? 'Unavailable'}
          sub={stationsBelowPar === null ? 'Clipboard failed' : 'Tracked par levels'}
          tone={stationsBelowPar === null ? 'amber' : stationsBelowPar > 0 ? 'amber' : 'emerald'}
        />
        <SummaryCard
          label="Blocked"
          value={blockedTasks ?? 'Unavailable'}
          sub={blockedTasks === null ? 'Task dependencies failed' : 'Unfinished dependencies'}
          tone={blockedTasks === null ? 'amber' : blockedTasks > 0 ? 'red' : 'emerald'}
        />
      </div>

      {stationData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No active stations configured.</p>
            <Link
              href="/stations"
              className="mt-2 inline-block text-sm text-amber-400 hover:underline"
            >
              Set up kitchen stations
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stationData.map((station) => {
            const parColor =
              station.parPct === null
                ? 'stone'
                : station.parPct >= 80
                  ? 'emerald'
                  : station.parPct >= 50
                    ? 'amber'
                    : 'red'
            const barBg =
              parColor === 'emerald'
                ? 'bg-emerald-500'
                : parColor === 'amber'
                  ? 'bg-amber-500'
                  : parColor === 'red'
                    ? 'bg-red-500'
                    : 'bg-stone-700'
            const borderColor =
              station.items86.length > 0 || (station.overdueTasks?.length ?? 0) > 0
                ? 'border-red-800'
                : (station.blockedTasks ?? 0) > 0 ||
                    (station.parPct !== null && station.parPct < 80)
                  ? 'border-amber-800'
                  : 'border-stone-800'

            return (
              <Link key={station.id} href={`/stations/${station.id}`}>
                <Card
                  className={`h-full border ${borderColor} transition-colors hover:border-stone-600`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base text-stone-200">{station.name}</CardTitle>
                        {station.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                            {station.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {station.items86.length > 0 && (
                          <Badge variant="error">{station.items86.length} 86'd</Badge>
                        )}
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            station.items86.length > 0 || (station.overdueTasks?.length ?? 0) > 0
                              ? 'bg-red-400'
                              : (station.blockedTasks ?? 0) > 0 ||
                                  (station.parPct !== null && station.parPct < 80)
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-stone-500">
                        <span>Par Coverage</span>
                        {station.parPct === null ? (
                          <Unavailable label="Par" />
                        ) : (
                          <span
                            className={
                              parColor === 'emerald'
                                ? 'text-emerald-400'
                                : parColor === 'amber'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }
                          >
                            {station.parPct}%
                          </span>
                        )}
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
                        <div
                          className={`h-full rounded-full transition-all ${barBg}`}
                          style={{ width: `${station.parPct ?? 0}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-stone-600">
                        {station.parTrackedCount === null
                          ? 'Clipboard query unavailable.'
                          : station.parTrackedCount === 0
                            ? "No par levels tracked on today's clipboard."
                            : `${station.parTrackedCount} par-tracked components.`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-stone-500">
                        Components:{' '}
                        <span className="text-stone-300">{station.configuredComponents}</span>
                      </div>
                      <div className="text-stone-500">
                        Clipboard:{' '}
                        <span className="text-stone-300">
                          {station.clipboardCount ?? 'Unavailable'}
                        </span>
                      </div>
                      <div className="text-stone-500">
                        Prep needs:{' '}
                        <span className="text-stone-300">
                          {station.needsPrepCount ?? 'Unavailable'}
                        </span>
                      </div>
                      <div className="text-stone-500">
                        Orders:{' '}
                        <span className="text-stone-300">
                          {station.needsOrderCount ?? 'Unavailable'}
                        </span>
                      </div>
                      <div className="text-stone-500">
                        Tasks:{' '}
                        <span className="text-stone-300">
                          {station.tasksDone === null || station.tasksTotal === null
                            ? 'Unavailable'
                            : `${station.tasksDone}/${station.tasksTotal}`}
                        </span>
                      </div>
                      <div className="text-stone-500">
                        Blocked:{' '}
                        <span className="text-stone-300">
                          {station.blockedTasks ?? 'Unavailable'}
                        </span>
                      </div>
                    </div>

                    {station.overdueTasks !== null && station.overdueTasks.length > 0 && (
                      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-2">
                        <p className="text-xs font-medium uppercase text-red-300">Overdue</p>
                        <div className="mt-1 space-y-1">
                          {station.overdueTasks.slice(0, 2).map((task) => (
                            <div key={task.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs text-stone-300">{task.title}</span>
                              <span className="shrink-0 text-xs text-red-300">
                                {formatDueTime(task.due_time)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      {station.staffNames === null ? (
                        <p className="text-xs text-stone-600">Shift data unavailable.</p>
                      ) : station.staffNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {station.staffNames.map((name, index) => (
                            <span
                              key={`${name}-${index}`}
                              className="rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-300"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-600">No staff checked in.</p>
                      )}
                    </div>

                    {station.lastUpdated && (
                      <p className="text-xs text-stone-600">
                        Clipboard updated {formatTime(station.lastUpdated)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {all86Items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-400">86'd Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {all86Items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <span className="text-stone-200">
                      {item.station_components?.name ?? 'Unknown component'}
                    </span>
                    <span className="ml-2 text-stone-500">({item.stationName})</span>
                  </div>
                  {item.eighty_sixed_at && (
                    <span className="shrink-0 text-xs text-stone-500">
                      Since {formatTime(item.eighty_sixed_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: '/stations/menu-board', label: 'Menu Board', desc: 'Kitchen display' },
          { href: '/stations/ops-log', label: 'Ops Log', desc: 'Audit trail' },
          { href: '/stations/waste', label: 'Waste Log', desc: 'Track waste' },
          { href: '/stations/orders', label: 'Order Sheet', desc: 'Vendor orders' },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3 text-center transition-colors hover:border-stone-700">
              <p className="text-sm font-medium text-stone-200">{link.label}</p>
              <p className="text-xs text-stone-500">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
