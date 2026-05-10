'use client'

// Service Mode Panel - Shows live service state when an event is in_progress.
// Auto-refreshes every 10s. Displays course progression, station statuses, and 86'd warnings.

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ServiceModeData, StationServiceStatus } from '@/lib/stations/service-mode-actions'
import { getServiceModeData } from '@/lib/stations/service-mode-actions'

const STATUS_COLORS: Record<
  StationServiceStatus,
  {
    bg: string
    border: string
    text: string
    variant: 'default' | 'success' | 'warning' | 'error' | 'info'
  }
> = {
  idle: {
    bg: 'bg-stone-800',
    border: 'border-stone-600',
    text: 'text-stone-400',
    variant: 'default',
  },
  ready: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    variant: 'info',
  },
  firing: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    variant: 'warning',
  },
  plating: {
    bg: 'bg-brand-950/40',
    border: 'border-brand-500/50',
    text: 'text-brand-400',
    variant: 'info',
  },
  done: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    variant: 'success',
  },
}

function CourseProgressionBar({ current, total }: { current: number; total: number }) {
  if (total === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-400">Course</span>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-6 rounded-full ${
              i + 1 < current
                ? 'bg-emerald-500'
                : i + 1 === current
                  ? 'bg-amber-500'
                  : 'bg-stone-700'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-stone-400">
        {current}/{total}
      </span>
    </div>
  )
}

function CourseTimer() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [running])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg text-stone-100 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <Button
        size="sm"
        variant={running ? 'danger' : 'primary'}
        onClick={() => {
          if (running) {
            setRunning(false)
          } else {
            setSeconds(0)
            setRunning(true)
          }
        }}
      >
        {running ? 'Stop' : 'Start'}
      </Button>
    </div>
  )
}

export function ServiceModePanel({ initialData }: { initialData: ServiceModeData }) {
  const [data, setData] = useState(initialData)
  const [, startTransition] = useTransition()

  // Auto-refresh every 10s during active service
  useEffect(() => {
    if (!data.isServiceActive) return
    const interval = setInterval(() => {
      startTransition(async () => {
        try {
          const fresh = await getServiceModeData()
          setData(fresh)
        } catch {
          /* silent retry next interval */
        }
      })
    }, 10_000)
    return () => clearInterval(interval)
  }, [data.isServiceActive])

  if (!data.isServiceActive) return null

  return (
    <div className="space-y-4">
      {/* Service header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
              Live Service
            </span>
          </div>
          <p className="text-stone-300 mt-0.5">
            {data.activeEvent?.occasion} &middot; {data.activeEvent?.guestCount} guests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <CourseProgressionBar current={data.currentCourseNumber} total={data.totalCourses} />
          <CourseTimer />
          <Link href={`/events/${data.activeEvent?.id}/kds`}>
            <Button size="sm" variant="secondary">
              KDS
            </Button>
          </Link>
        </div>
      </div>

      {/* Station cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.stations.map((station) => {
          const colors = STATUS_COLORS[station.status]
          return (
            <Card key={station.stationId} className={`${colors.bg} border ${colors.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-stone-100">{station.stationName}</h3>
                  <Badge variant={colors.variant}>
                    {station.status.charAt(0).toUpperCase() + station.status.slice(1)}
                  </Badge>
                </div>

                {/* Assigned dishes for current course */}
                {station.assignedDishes.filter((d) => d.courseNumber === data.currentCourseNumber)
                  .length > 0 && (
                  <div className="space-y-1 mb-2">
                    <span className="text-xs text-stone-500">Current course:</span>
                    {station.assignedDishes
                      .filter((d) => d.courseNumber === data.currentCourseNumber)
                      .map((dish) => (
                        <p key={dish.id} className="text-sm text-stone-300">
                          {dish.name}
                        </p>
                      ))}
                  </div>
                )}

                {/* 86'd items warning */}
                {station.eightySixedItems.length > 0 && (
                  <div className="mt-2 rounded bg-red-950/50 border border-red-500/30 px-2 py-1">
                    <span className="text-xs text-red-400 font-medium">
                      {station.eightySixedItems.length} item
                      {station.eightySixedItems.length !== 1 ? 's' : ''} 86&apos;d
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
