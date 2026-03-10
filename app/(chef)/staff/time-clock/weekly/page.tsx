import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWeeklyHoursSummary } from '@/lib/staff/punch-clock-actions'

export const metadata: Metadata = { title: 'Weekly Hours - ChefFlow' }

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function WeeklyHoursPage() {
  await requireChef()

  const weekStart = getMonday(new Date())
  const summary = await getWeeklyHoursSummary(weekStart).catch(() => ({
    weekStart,
    weekEnd: weekStart,
    staff: [],
    totalMinutes: 0,
    totalHours: 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff/time-clock" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Time Clock
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Weekly Hours</h1>
        <p className="text-stone-500 mt-1">
          {summary.weekStart} to {summary.weekEnd}
        </p>
      </div>

      {summary.staff.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-8 text-center">
          <p className="text-stone-500">
            No completed shifts this week. Clock staff in from the Time Clock page.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900">
                <th className="text-left px-4 py-3 text-stone-400 font-medium">Staff Member</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">Shifts</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">Hours</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">Rate</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">Est. Pay</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.staff.map((row) => (
                <tr key={row.staffMemberId} className="border-b border-stone-800 last:border-0">
                  <td className="px-4 py-3 text-stone-100 font-medium">{row.staffName}</td>
                  <td className="px-4 py-3 text-stone-300 text-right">{row.shiftCount}</td>
                  <td className="px-4 py-3 text-stone-300 text-right">{row.totalHours}h</td>
                  <td className="px-4 py-3 text-stone-300 text-right">
                    {formatCents(row.hourlyRateCents)}/hr
                  </td>
                  <td className="px-4 py-3 text-stone-100 text-right font-medium">
                    {formatCents(row.estimatedPayCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.overtime ? (
                      <span className="inline-flex items-center rounded-full bg-amber-950/50 border border-amber-800 px-2 py-0.5 text-xs font-medium text-amber-400">
                        OT ({row.totalHours - 40}h over)
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500">Regular</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-stone-700 bg-stone-900/80">
                <td className="px-4 py-3 text-stone-300 font-medium">Total</td>
                <td className="px-4 py-3 text-stone-300 text-right">
                  {summary.staff.reduce((s, r) => s + r.shiftCount, 0)}
                </td>
                <td className="px-4 py-3 text-stone-100 text-right font-medium">
                  {summary.totalHours}h
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-stone-100 text-right font-medium">
                  {formatCents(summary.staff.reduce((s, r) => s + r.estimatedPayCents, 0))}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
