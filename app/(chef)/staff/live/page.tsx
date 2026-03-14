// Real-Time Staff Activity Board (Phase 8)
// Shows who's doing what right now. Auto-refreshes every 30 seconds.
// Designed for wall-mounted tablets in the kitchen.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getStaffActivityBoard, type StaffActivity } from '@/lib/staff/activity-board'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StaffBoardRefresher } from '@/components/staff/staff-board-refresher'

export const metadata: Metadata = { title: 'Staff Activity - ChefFlow' }

// ============================================
// HELPERS
// ============================================

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Active' },
  idle: { dot: 'bg-amber-500', text: 'text-amber-400', label: 'Idle' },
  offline: { dot: 'bg-stone-600', text: 'text-stone-500', label: 'Offline' },
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Asst.',
  service_staff: 'Service',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Staff',
}

const ACTIVITY_LABELS: Record<string, string> = {
  task_complete: 'Completed a task',
  clipboard_update: 'Updated clipboard',
  check_in: 'Checked in',
  check_out: 'Checked out',
  ops_update: 'Ops log entry',
  prep_complete: 'Prep completed',
  stock_update: 'Stock updated',
  order_request: 'Order requested',
  waste: 'Logged waste',
}

function formatMinutesAgo(minutes: number | null): string {
  if (minutes === null) return 'No activity today'
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

// ============================================
// STAFF CARD
// ============================================

function StaffCard({ staff }: { staff: StaffActivity }) {
  const statusStyle = STATUS_STYLES[staff.status] ?? STATUS_STYLES.offline

  return (
    <Card className={staff.status === 'active' ? 'ring-1 ring-emerald-900/50' : ''}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <div
              className={`w-3 h-3 rounded-full ${statusStyle.dot} ${staff.status === 'active' ? 'animate-pulse' : ''}`}
            />
            <div>
              <p className="font-medium text-stone-100">{staff.name}</p>
              <p className="text-xs text-stone-500">{ROLE_LABELS[staff.role] ?? staff.role}</p>
            </div>
          </div>
          <Badge
            variant={
              staff.status === 'active'
                ? 'success'
                : staff.status === 'idle'
                  ? 'warning'
                  : 'default'
            }
            className="text-[10px]"
          >
            {statusStyle.label}
          </Badge>
        </div>

        {/* Current task */}
        {staff.currentTask && (
          <div className="mt-3 rounded-md bg-sky-950/30 border border-sky-900/30 px-3 py-2">
            <p className="text-[11px] text-sky-400 font-medium">Working on</p>
            <p className="text-sm text-stone-200 mt-0.5">{staff.currentTask}</p>
          </div>
        )}

        {/* Current station */}
        {staff.currentStation && (
          <div className="mt-2 text-xs text-stone-400">
            Station: <span className="text-stone-300">{staff.currentStation}</span>
          </div>
        )}

        {/* Task progress */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              Tasks: {staff.tasksDoneToday}/{staff.tasksToday}
            </span>
            {staff.tasksToday > 0 && (
              <div className="w-16 h-1 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(staff.tasksDoneToday / staff.tasksToday) * 100}%` }}
                />
              </div>
            )}
          </div>
          <span className={`text-[11px] ${statusStyle.text}`}>
            {formatMinutesAgo(staff.minutesSinceActivity)}
          </span>
        </div>

        {/* Last activity type */}
        {staff.lastActivityType && (
          <p className="mt-1 text-[11px] text-stone-600">
            Last: {ACTIVITY_LABELS[staff.lastActivityType] ?? staff.lastActivityType}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// PAGE
// ============================================

export default async function StaffLivePage() {
  await requireChef()
  const staffActivity = await getStaffActivityBoard()

  const activeCount = staffActivity.filter((s) => s.status === 'active').length
  const idleCount = staffActivity.filter((s) => s.status === 'idle').length

  const now = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Auto-refresh component */}
      <StaffBoardRefresher intervalSeconds={30} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Staff Activity</h1>
          <p className="mt-1 text-sm text-stone-400">Live view &middot; Last updated {now}</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-400">{activeCount} active</span>
            </div>
          )}
          {idleCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-amber-400">{idleCount} idle</span>
            </div>
          )}
        </div>
      </div>

      {/* Staff grid */}
      {staffActivity.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No active staff members.</p>
            <p className="text-sm text-stone-500 mt-1">
              Staff will appear here when they have tasks assigned or check into stations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Active first, then idle, then offline */}
          {staffActivity
            .sort((a, b) => {
              const order = { active: 0, idle: 1, offline: 2 }
              return (order[a.status] ?? 3) - (order[b.status] ?? 3)
            })
            .map((staff) => (
              <StaffCard key={staff.id} staff={staff} />
            ))}
        </div>
      )}
    </div>
  )
}
