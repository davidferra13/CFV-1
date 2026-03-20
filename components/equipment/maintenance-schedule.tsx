// Maintenance Schedule - Shows upcoming and overdue maintenance for equipment
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logMaintenance } from '@/lib/equipment/actions'
import { addDays, isBefore, format, formatDistanceToNow } from 'date-fns'

type EquipmentItem = {
  id: string
  name: string
  category: string
  maintenance_interval_days: number | null
  last_maintained_at: string | null
  notes: string | null
}

interface MaintenanceScheduleProps {
  equipment: EquipmentItem[]
}

function getNextDueDate(item: EquipmentItem): Date | null {
  if (!item.maintenance_interval_days) return null
  if (!item.last_maintained_at) return new Date(0) // way overdue
  return addDays(new Date(item.last_maintained_at), item.maintenance_interval_days)
}

function getStatus(item: EquipmentItem): 'overdue' | 'due_soon' | 'ok' {
  const nextDue = getNextDueDate(item)
  if (!nextDue) return 'ok'
  const today = new Date()
  if (isBefore(nextDue, today)) return 'overdue'
  if (isBefore(nextDue, addDays(today, 30))) return 'due_soon'
  return 'ok'
}

export function MaintenanceSchedule({ equipment }: MaintenanceScheduleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Only show items that have maintenance intervals set
  const trackable = equipment.filter((e) => e.maintenance_interval_days)
  const sorted = [...trackable].sort((a, b) => {
    const dateA = getNextDueDate(a)
    const dateB = getNextDueDate(b)
    if (!dateA && !dateB) return 0
    if (!dateA) return -1
    if (!dateB) return 1
    return dateA.getTime() - dateB.getTime()
  })

  const handleLogMaintenance = (id: string) => {
    setLoggingId(id)
    setError(null)
    startTransition(async () => {
      try {
        await logMaintenance(id)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log maintenance')
      } finally {
        setLoggingId(null)
      }
    })
  }

  if (trackable.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            No equipment has maintenance intervals set. Edit an item and set a maintenance
            interval to start tracking.
          </p>
        </CardContent>
      </Card>
    )
  }

  const overdue = sorted.filter((e) => getStatus(e) === 'overdue')
  const dueSoon = sorted.filter((e) => getStatus(e) === 'due_soon')
  const ok = sorted.filter((e) => getStatus(e) === 'ok')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Maintenance Schedule</CardTitle>
        <p className="text-xs text-stone-500 mt-0.5">
          {overdue.length > 0
            ? `${overdue.length} item${overdue.length !== 1 ? 's' : ''} overdue`
            : 'All equipment is up to date'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-xs text-red-600">{error}</p>}

        {overdue.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-red-400">Overdue</p>
            {overdue.map((item) => (
              <MaintenanceRow
                key={item.id}
                item={item}
                variant="error"
                onLog={handleLogMaintenance}
                isLogging={loggingId === item.id}
                isPending={isPending}
              />
            ))}
          </div>
        )}

        {dueSoon.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-amber-400">Due Soon</p>
            {dueSoon.map((item) => (
              <MaintenanceRow
                key={item.id}
                item={item}
                variant="warning"
                onLog={handleLogMaintenance}
                isLogging={loggingId === item.id}
                isPending={isPending}
              />
            ))}
          </div>
        )}

        {ok.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-stone-500">Up to Date</p>
            {ok.map((item) => (
              <MaintenanceRow
                key={item.id}
                item={item}
                variant="success"
                onLog={handleLogMaintenance}
                isLogging={loggingId === item.id}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MaintenanceRow({
  item,
  variant,
  onLog,
  isLogging,
  isPending,
}: {
  item: EquipmentItem
  variant: 'error' | 'warning' | 'success'
  onLog: (id: string) => void
  isLogging: boolean
  isPending: boolean
}) {
  const nextDue = getNextDueDate(item)
  const dueText = nextDue
    ? isBefore(nextDue, new Date())
      ? `Overdue by ${formatDistanceToNow(nextDue)}`
      : `Due ${format(nextDue, 'MMM d, yyyy')}`
    : 'No date'

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-200">{item.name}</span>
          <Badge variant={variant}>{dueText}</Badge>
        </div>
        {item.last_maintained_at && (
          <p className="text-[11px] text-stone-500 mt-0.5">
            Last serviced {format(new Date(item.last_maintained_at), 'MMM d, yyyy')}
          </p>
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onLog(item.id)}
        disabled={isPending}
      >
        {isLogging ? 'Logging...' : 'Log Done'}
      </Button>
    </div>
  )
}
