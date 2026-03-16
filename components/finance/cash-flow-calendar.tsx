// Cash Flow Calendar - shows income, expenses, and events on a monthly grid.

import Link from 'next/link'
import type { CashFlowCalendarData } from '@/lib/finance/cash-flow-calendar'
import { formatCurrency } from '@/lib/utils/currency'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  data: CashFlowCalendarData
}

export function CashFlowCalendar({ data }: Props) {
  const { year, month, days } = data

  const dayMap = new Map(days.map((d) => [d.date, d]))

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }),
  ]

  const prevMonthUrl =
    month === 1
      ? `/finance/cash-flow?year=${year - 1}&month=12`
      : `/finance/cash-flow?year=${year}&month=${month - 1}`
  const nextMonthUrl =
    month === 12
      ? `/finance/cash-flow?year=${year + 1}&month=1`
      : `/finance/cash-flow?year=${year}&month=${month + 1}`

  return (
    <div className="space-y-4">
      {/* Nav + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={prevMonthUrl} className="text-stone-400 hover:text-stone-300 px-1">
            ‹
          </Link>
          <h3 className="font-semibold text-stone-100 text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          <Link href={nextMonthUrl} className="text-stone-400 hover:text-stone-300 px-1">
            ›
          </Link>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-700 font-medium">
            +{formatCurrency(data.totalIncomeCents)}
          </span>
          <span className="text-red-500 font-medium">
            −{formatCurrency(data.totalOutgoingCents)}
          </span>
          {data.totalInstallmentsDueCents > 0 && (
            <span className="text-amber-600 font-medium">
              {formatCurrency(data.totalInstallmentsDueCents)} due
            </span>
          )}
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[10px] font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-stone-800 rounded-lg overflow-hidden border border-stone-800">
        {cells.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="bg-stone-900 h-16" />
          }
          const day = dayMap.get(dateStr)
          const dayNum = parseInt(dateStr.slice(8), 10)
          const today = new Date().toISOString().slice(0, 10)
          const isToday = dateStr === today

          return (
            <div
              key={dateStr}
              className={`bg-stone-900 h-16 p-1 text-xs flex flex-col ${isToday ? 'ring-1 ring-brand-400 ring-inset' : ''}`}
            >
              <span className={`font-medium ${isToday ? 'text-brand-600' : 'text-stone-300'}`}>
                {dayNum}
              </span>
              {day && (
                <div className="space-y-0.5 mt-0.5 min-h-0 overflow-hidden">
                  {day.incomeCents > 0 && (
                    <div className="text-[9px] font-medium text-emerald-700 leading-tight truncate">
                      +{formatCurrency(day.incomeCents)}
                    </div>
                  )}
                  {day.outgoingCents > 0 && (
                    <div className="text-[9px] text-red-500 leading-tight truncate">
                      −{formatCurrency(day.outgoingCents)}
                    </div>
                  )}
                  {day.eventCount > 0 && (
                    <div className="text-[9px] text-brand-600 leading-tight">
                      {day.eventCount} event{day.eventCount > 1 ? 's' : ''}
                    </div>
                  )}
                  {day.installmentsDueCents > 0 && (
                    <div className="text-[9px] text-amber-600 leading-tight truncate">
                      {formatCurrency(day.installmentsDueCents)} due
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
