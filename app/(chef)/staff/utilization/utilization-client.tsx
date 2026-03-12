'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import type { UtilizationReport, StaffUtilizationRow } from '@/lib/staff/utilization-report'

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

function UtilBar({ percent }: { percent: number }) {
  const color =
    percent >= 90
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-amber-500'
        : percent >= 50
          ? 'bg-orange-500'
          : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-sm text-stone-300 tabular-nums">{percent}%</span>
    </div>
  )
}

interface Props {
  report: UtilizationReport
  currentStart: string
  currentEnd: string
}

export default function UtilizationClient({ report, currentStart, currentEnd }: Props) {
  const router = useRouter()
  const [start, setStart] = useState(currentStart)
  const [end, setEnd] = useState(currentEnd)

  function apply() {
    router.push(`?start=${start}&end=${end}`)
  }

  function setPreset(days: number) {
    const e = new Date()
    const s = new Date()
    s.setDate(s.getDate() - days)
    const newStart = s.toISOString().slice(0, 10)
    const newEnd = e.toISOString().slice(0, 10)
    setStart(newStart)
    setEnd(newEnd)
    router.push(`?start=${newStart}&end=${newEnd}`)
  }

  const { totals, staff } = report

  // Identify concerns
  const overworked = staff.filter((s) => s.utilizationPercent > 110)
  const underutilized = staff.filter((s) => s.totalEventsAssigned > 0 && s.utilizationPercent < 50)
  const noShows = staff.filter((s) => s.noShowCount > 0)

  return (
    <div className="space-y-4">
      {/* Date Range */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-stone-400 block mb-1">From</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100"
            />
          </div>
          <div>
            <label className="text-xs text-stone-400 block mb-1">To</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-100"
            />
          </div>
          <Button variant="primary" size="sm" onClick={apply}>
            Apply
          </Button>
          <div className="flex gap-1.5 ml-auto">
            {[30, 60, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => setPreset(d)}
                className="text-xs px-2 py-1 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{totals.totalStaff}</p>
          <p className="text-xs text-stone-400">Staff members</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{totals.totalEvents}</p>
          <p className="text-xs text-stone-400">Events staffed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{totals.totalActualHours}h</p>
          <p className="text-xs text-stone-400">Hours worked</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totals.totalLaborCostCents)}
          </p>
          <p className="text-xs text-stone-400">Total labor cost</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-200">{totals.avgUtilizationPercent}%</p>
          <p className="text-xs text-stone-400">Avg utilization</p>
        </Card>
      </div>

      {/* Alerts */}
      {(overworked.length > 0 || noShows.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {overworked.length > 0 && (
            <Card className="p-3 bg-red-950 border-red-900 flex-1">
              <p className="text-sm font-medium text-red-200">Overworked ({'>'}110% utilization)</p>
              <p className="text-xs text-red-300 mt-1">
                {overworked.map((s) => s.staffName).join(', ')}
              </p>
            </Card>
          )}
          {noShows.length > 0 && (
            <Card className="p-3 bg-amber-950 border-amber-900 flex-1">
              <p className="text-sm font-medium text-amber-200">No-shows in period</p>
              <p className="text-xs text-amber-300 mt-1">
                {noShows.map((s) => `${s.staffName} (${s.noShowCount})`).join(', ')}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Staff Table */}
      {staff.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No staff members found</p>
          <p className="text-stone-500 text-sm mt-1">
            Add staff members and assign them to events to see utilization data.
          </p>
          <Link href="/staff" className="mt-3 inline-block">
            <Button variant="secondary" size="sm">
              Manage Staff
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Labor Cost</TableHead>
                <TableHead>Avg/Event</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((row) => (
                <TableRow key={row.staffMemberId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/staff/${row.staffMemberId}`}
                      className="text-brand-600 hover:text-brand-300 hover:underline"
                    >
                      {row.staffName}
                    </Link>
                    {row.status === 'inactive' && (
                      <span className="ml-1.5 text-[10px] bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded">
                        inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {ROLE_LABELS[row.role] ?? row.role}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {row.hourlyRateCents > 0
                      ? `${formatCurrency(row.hourlyRateCents)}/hr`
                      : '\u2014'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {row.totalEventsAssigned}
                    {row.noShowCount > 0 && (
                      <span className="ml-1 text-red-400 text-xs">({row.noShowCount} no-show)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm tabular-nums">
                    {row.scheduledHours}h
                  </TableCell>
                  <TableCell className="text-stone-300 text-sm tabular-nums font-medium">
                    {row.actualHours}h
                  </TableCell>
                  <TableCell>
                    <UtilBar percent={row.utilizationPercent} />
                  </TableCell>
                  <TableCell className="text-stone-300 text-sm tabular-nums">
                    {formatCurrency(row.totalLaborCostCents)}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm tabular-nums">
                    {row.avgCostPerEventCents > 0
                      ? formatCurrency(row.avgCostPerEventCents)
                      : '\u2014'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {row.avgRating != null ? (
                      <span className="text-amber-200">{row.avgRating.toFixed(1)}</span>
                    ) : (
                      '\u2014'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
