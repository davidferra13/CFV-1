// Time Analysis Page
// Shows where the chef's hours are actually going - event phases + administrative overhead.
// Used to compute true effective hourly rate including all business time.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAdminTimeThisWeek, getMonthlyAdminTimeSummary } from '@/lib/admin-time/actions'
import { ADMIN_TIME_CATEGORIES } from '@/lib/admin-time/constants'
import { AdminTimeLogForm } from './admin-time-log-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Time Analysis | ChefFlow' }

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default async function TimeAnalysisPage() {
  await requireChef()

  const today = new Date()
  const [thisWeek, thisMonth] = await Promise.all([
    getAdminTimeThisWeek(),
    getMonthlyAdminTimeSummary(today.getFullYear(), today.getMonth() + 1),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Time Analysis</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track administrative time to see where your hours really go - not just on-site.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-stone-500">This Week (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-100">
              {formatMinutes(thisWeek.totalMinutes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-stone-500">This Month (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-100">
              {formatMinutes(thisMonth.totalMinutes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly breakdown by category */}
      {thisMonth.totalMinutes > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Month by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ADMIN_TIME_CATEGORIES.filter((c) => (thisMonth.byCategory[c.value] ?? 0) > 0)
                .sort(
                  (a, b) =>
                    (thisMonth.byCategory[b.value] ?? 0) - (thisMonth.byCategory[a.value] ?? 0)
                )
                .map((c) => {
                  const mins = thisMonth.byCategory[c.value] ?? 0
                  const pct = Math.round((mins / thisMonth.totalMinutes) * 100)
                  return (
                    <div key={c.value} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-stone-400">{c.label}</div>
                      <div className="flex-1 bg-stone-800 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-stone-500 w-16 text-right">
                        {formatMinutes(mins)} ({pct}%)
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent logs */}
      {thisWeek.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Week&apos;s Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {thisWeek.logs.map((log: any) => {
                const cat = ADMIN_TIME_CATEGORIES.find((c) => c.value === log.category)
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-sm py-1 border-b border-stone-800 last:border-0"
                  >
                    <div>
                      <span className="text-stone-300">{cat?.label ?? log.category}</span>
                      {log.notes && (
                        <span className="text-stone-400 ml-2 text-xs">- {log.notes}</span>
                      )}
                    </div>
                    <div className="text-stone-500">{formatMinutes(log.minutes)}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log new time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Admin Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTimeLogForm />
        </CardContent>
      </Card>
    </div>
  )
}
