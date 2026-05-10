'use client'

import { useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PrepScheduleExport, PrepScheduleDay } from '@/lib/prep-timeline/export-actions'

const PHASE_COLORS: Record<string, string> = {
  grocery: 'border-purple-500 bg-purple-950/30',
  prep: 'border-blue-500 bg-blue-950/30',
  cook: 'border-amber-500 bg-amber-950/30',
  service: 'border-emerald-500 bg-emerald-950/30',
}

const PHASE_LABELS: Record<string, string> = {
  grocery: 'Shopping Day',
  prep: 'Prep Day',
  cook: 'Cook Day',
  service: 'Service Day',
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function DayCard({ day }: { day: PrepScheduleDay }) {
  const colors = PHASE_COLORS[day.phase] ?? PHASE_COLORS.prep

  return (
    <Card className={`border ${colors}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-stone-200">{day.label}</CardTitle>
            <p className="text-xs text-stone-500">
              {day.isServiceDay
                ? 'Event Day'
                : `${day.daysBeforeService} day${day.daysBeforeService !== 1 ? 's' : ''} before`}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="default" className="text-[10px]">
              {PHASE_LABELS[day.phase]}
            </Badge>
            <p className="text-xs text-stone-500 mt-0.5">
              {formatMinutes(day.totalActiveMinutes)} active
              {day.totalPassiveMinutes > 0 &&
                ` + ${formatMinutes(day.totalPassiveMinutes)} passive`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {day.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 py-1 border-b border-stone-800 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-200 truncate">{item.recipeName}</p>
                <p className="text-xs text-stone-500">
                  {item.courseName} · {item.componentName}
                  {item.category && ` · ${item.category}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                {item.prepTimeMinutes > 0 && (
                  <span className="text-xs text-stone-400">
                    {formatMinutes(item.prepTimeMinutes)}
                  </span>
                )}
                <p className="text-[10px] text-stone-600">{item.storageMethod}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PrepScheduleExportView({ schedule }: { schedule: PrepScheduleExport }) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-100">Prep Schedule</h2>
          <p className="text-sm text-stone-400">
            {schedule.eventName}
            {schedule.clientName && ` for ${schedule.clientName}`}
            {' · '}
            {schedule.guestCount} guests
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {schedule.totalPrepHours}h total prep across {schedule.days.length} days
            {schedule.groceryDeadline && ` · Grocery deadline: ${schedule.groceryDeadline}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handlePrint}>
            Print
          </Button>
        </div>
      </div>

      {/* Equipment needs summary */}
      {schedule.equipmentNeeds.length > 0 && (
        <Card className="bg-stone-800/50 border-stone-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-300">Equipment Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[...new Set(schedule.equipmentNeeds.map((e) => e.equipment))].map((equip) => (
                <Badge key={equip} variant="default" className="text-xs">
                  {equip}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day-by-day schedule */}
      <div ref={printRef} className="space-y-4 print:space-y-2" data-print-section>
        {schedule.days.map((day, i) => (
          <DayCard key={i} day={day} />
        ))}
      </div>

      {/* Untimed items warning */}
      {schedule.untimedItems.length > 0 && (
        <Card className="bg-amber-950/20 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400">Untimed Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-400 mb-2">
              These recipes have no peak window or category defaults. Set peak windows to schedule
              them automatically.
            </p>
            <div className="space-y-1">
              {schedule.untimedItems.map((item, i) => (
                <p key={i} className="text-sm text-stone-300">
                  {item.recipeName} ({item.componentName})
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
