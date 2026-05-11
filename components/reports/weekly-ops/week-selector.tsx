'use client'

import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function WeekSelector({
  weekStart,
  weekEnd,
  onWeekChange,
}: {
  weekStart: string
  weekEnd: string
  onWeekChange: (newWeekStart: string) => void
}) {
  const startDate = new Date(weekStart + 'T12:00:00')
  const endDate = new Date(weekEnd + 'T12:00:00')

  const goBack = () => {
    const prev = addDays(startDate, -7)
    onWeekChange(toIsoDate(prev))
  }

  const goForward = () => {
    const next = addDays(startDate, 7)
    onWeekChange(toIsoDate(next))
  }

  const goToday = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.getFullYear(), now.getMonth(), diff)
    onWeekChange(toIsoDate(monday))
  }

  return (
    <div className="flex items-center gap-3 print:hidden">
      <Button variant="secondary" size="sm" onClick={goBack}>
        &larr; Prev
      </Button>
      <div className="text-center min-w-[200px]">
        <p className="text-sm font-medium text-stone-200">
          {format(startDate, 'MMM d')} &ndash; {format(endDate, 'MMM d, yyyy')}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={goForward}>
        Next &rarr;
      </Button>
      <Button variant="ghost" size="sm" onClick={goToday}>
        This Week
      </Button>
    </div>
  )
}
