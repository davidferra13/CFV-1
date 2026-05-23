'use client'

import Link from 'next/link'
import { Calendar } from '@/components/ui/icons'
import type { WeekDay } from '@/lib/command-center/attention-actions'

function DayCell({ day }: { day: WeekDay }) {
  const dayNum = day.date.split('-')[2]
  const isBusy = day.eventCount >= 2
  const hasEvents = day.eventCount > 0

  return (
    <div
      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
        day.isToday
          ? 'bg-brand-950/50 border border-brand-800/40'
          : 'hover:bg-stone-800/30'
      }`}
    >
      <span
        className={`text-[10px] uppercase tracking-wider ${
          day.isToday ? 'text-brand-400 font-semibold' : 'text-stone-500'
        }`}
      >
        {day.dayName}
      </span>
      <span
        className={`text-sm font-medium ${
          day.isToday ? 'text-brand-300' : 'text-stone-300'
        }`}
      >
        {dayNum}
      </span>
      {hasEvents ? (
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(day.eventCount, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                isBusy ? 'bg-amber-400' : 'bg-brand-400'
              }`}
            />
          ))}
          {day.eventCount > 4 && (
            <span className="text-[8px] text-stone-500">+{day.eventCount - 4}</span>
          )}
        </div>
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-stone-700" />
      )}
    </div>
  )
}

export function WeeklyHorizon({ days }: { days: WeekDay[] }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
            Week Ahead
          </h3>
        </div>
        <Link
          href="/calendar"
          className="text-[10px] text-stone-500 hover:text-brand-400 transition-colors"
        >
          Full calendar
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 p-3">
        {days.map((day) => (
          <DayCell key={day.date} day={day} />
        ))}
      </div>

      {days.some((d) => d.eventCount >= 2) && (
        <div className="px-4 py-2 border-t border-stone-800/60">
          <p className="text-[10px] text-stone-500">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle" />
            Busy day (2+ events)
          </p>
        </div>
      )}
    </div>
  )
}
