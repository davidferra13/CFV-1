'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardTextIcon as ClipboardList, Clock, ArrowRight } from '@/components/ui/icons'
import { getVaTaskStats } from '@/lib/staff/va-task-actions'
import Link from 'next/link'

export function VaTasksWidget() {
  const [stats, setStats] = useState<{
    pending: number
    in_progress: number
    review: number
    overdue: number
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getVaTaskStats()
        setStats({
          pending: data.pending,
          in_progress: data.in_progress,
          review: data.review,
          overdue: data.overdue,
        })
      } catch {
        setLoadError(true)
      }
    })
  }, [])

  if (loadError) {
    return (
      <Card className="border-stone-700 bg-stone-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-stone-200">
            <ClipboardList className="h-4 w-4" />
            VA Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-400">Could not load task stats</p>
        </CardContent>
      </Card>
    )
  }

  const total = stats ? stats.pending + stats.in_progress + stats.review : 0

  return (
    <Card className="border-stone-700 bg-stone-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-stone-200">
            <ClipboardList className="h-4 w-4" />
            VA Tasks
          </CardTitle>
          <Link
            href="/tasks/va"
            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!stats ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-20 rounded bg-stone-700" />
            <div className="h-4 w-16 rounded bg-stone-700" />
          </div>
        ) : total === 0 && stats.overdue === 0 ? (
          <p className="text-xs text-stone-400">No active tasks</p>
        ) : (
          <div className="space-y-1.5">
            {stats.pending > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-300">Pending</span>
                <span className="font-medium text-stone-200">{stats.pending}</span>
              </div>
            )}
            {stats.in_progress > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-400">In Progress</span>
                <span className="font-medium text-brand-300">{stats.in_progress}</span>
              </div>
            )}
            {stats.review > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-400">In Review</span>
                <span className="font-medium text-amber-300">{stats.review}</span>
              </div>
            )}
            {stats.overdue > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-red-400">
                  <Clock className="h-3 w-3" /> Overdue
                </span>
                <span className="font-medium text-red-300">{stats.overdue}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
