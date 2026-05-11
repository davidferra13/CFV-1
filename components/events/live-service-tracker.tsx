'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  advanceCourseStatus,
  getCourseProgress,
  initializeCourseProgress,
  updateCourseNotes,
  type CourseProgress,
  type CourseStatus,
} from '@/lib/service-execution/actions'

type Props = {
  eventId: string
  initialCourses: CourseProgress[]
}

const STATUS_LABELS: Record<CourseStatus, string> = {
  queued: 'Queued',
  firing: 'Firing',
  served: 'Served',
  skipped: 'Skipped',
}

function sortCourses(courses: CourseProgress[]): CourseProgress[] {
  return [...courses].sort((left, right) => left.course_order - right.course_order)
}

function parseTimestamp(value: string | null): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

function formatClock(value: string | null): string | null {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return null
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMinutes(milliseconds: number): string {
  const minutes = Math.max(0, Math.round(milliseconds / 60000))
  if (minutes < 1) return 'under 1 min'
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}

function getStatusVariant(status: CourseStatus): 'default' | 'success' | 'warning' {
  if (status === 'served') return 'success'
  if (status === 'firing') return 'warning'
  return 'default'
}

function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <Badge
      variant={getStatusVariant(status)}
      className={status === 'skipped' ? 'line-through' : ''}
    >
      {status === 'firing' && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      )}
      {STATUS_LABELS[status]}
    </Badge>
  )
}

function CourseTiming({ course, now }: { course: CourseProgress; now: number }) {
  const firedAt = formatClock(course.fired_at)
  const servedAt = formatClock(course.served_at)
  const firedMs = parseTimestamp(course.fired_at)
  const servedMs = parseTimestamp(course.served_at)

  // Show elapsed: if served, use fired->served. If firing, use fired->now.
  let elapsed: string | null = null
  if (firedMs && servedMs) {
    elapsed = formatMinutes(servedMs - firedMs)
  } else if (firedMs && course.status === 'firing') {
    elapsed = formatMinutes(now - firedMs)
  }

  if (!firedAt && !servedAt) {
    return <span className="text-xs text-stone-500">Waiting</span>
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400">
      {firedAt && <span>Fired at {firedAt}</span>}
      {servedAt && <span>Served at {servedAt}</span>}
      {elapsed && <span className="font-medium text-stone-300">{elapsed}</span>}
    </div>
  )
}

function CourseNotesField({
  progressId,
  initialNotes,
}: {
  progressId: string
  initialNotes: string | null
}) {
  const [value, setValue] = useState(initialNotes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void updateCourseNotes(progressId, newValue).catch(() => {
          toast.error('Failed to save note')
        })
      }, 800)
    },
    [progressId]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <textarea
      className="mt-2 w-full rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none resize-none"
      rows={2}
      placeholder="Service notes..."
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}

export function LiveServiceTracker({ eventId, initialCourses }: Props) {
  const [courses, setCourses] = useState<CourseProgress[]>(() => sortCourses(initialCourses))
  const [showInitButton, setShowInitButton] = useState(initialCourses.length === 0)
  const [initializing, setInitializing] = useState(false)
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [isPending, startTransition] = useTransition()

  // Sync from parent when initialCourses changes (e.g. from server re-render)
  useEffect(() => {
    if (initialCourses.length > 0) {
      setCourses(sortCourses(initialCourses))
      setShowInitButton(false)
    }
  }, [initialCourses])

  // Poll for fresh data every 30 seconds
  useEffect(() => {
    if (courses.length === 0) return

    const interval = window.setInterval(async () => {
      try {
        const fresh = await getCourseProgress(eventId)
        if (fresh.length > 0) {
          setCourses(sortCourses(fresh))
        }
      } catch {
        // Non-blocking: polling failure is silent
      }
      setNow(Date.now())
    }, 30000)

    return () => window.clearInterval(interval)
  }, [eventId, courses.length])

  // Also tick the clock every 30s for elapsed display
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const firstFiredAt = useMemo(() => {
    const firedTimes = courses
      .map((course) => parseTimestamp(course.fired_at))
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right)

    return firedTimes[0] ?? null
  }, [courses])

  const servedCount = courses.filter((course) => course.status === 'served').length
  const totalElapsed = firstFiredAt ? formatMinutes(now - firstFiredAt) : 'Not started'

  async function handleInitialize() {
    try {
      setInitializing(true)
      const initialized = await initializeCourseProgress(eventId)
      setCourses(sortCourses(initialized))
      setShowInitButton(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize service tracker')
    } finally {
      setInitializing(false)
    }
  }

  function handleAdvance(course: CourseProgress, newStatus: 'firing' | 'served' | 'skipped') {
    setPendingCourseId(course.id)
    startTransition(() => {
      void (async () => {
        try {
          const updated = await advanceCourseStatus(course.id, newStatus)
          setCourses((current) =>
            sortCourses(current.map((entry) => (entry.id === updated.id ? updated : entry)))
          )
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to update course status')
        } finally {
          setPendingCourseId(null)
          setNow(Date.now())
        }
      })()
    })
  }

  // Show "Initialize Service" button when no rows exist
  if (showInitButton && courses.length === 0) {
    return (
      <Card className="p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-stone-100">Live Service Tracker</h2>
        <p className="mt-2 text-sm text-stone-400">
          Initialize the course tracker to begin tracking service progression.
        </p>
        <Button
          className="mt-3"
          variant="primary"
          size="sm"
          disabled={initializing}
          onClick={handleInitialize}
        >
          {initializing ? 'Initializing...' : 'Initialize Service'}
        </Button>
      </Card>
    )
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-stone-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Live Service Tracker</h2>
          <p className="mt-1 text-sm text-stone-400">
            {servedCount} of {courses.length} courses served
          </p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm">
          <span className="text-stone-500">Service elapsed</span>
          <span className="ml-2 font-semibold tabular-nums text-stone-100">{totalElapsed}</span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="py-6 text-sm text-stone-400">
          No menu attached to this event. Add a menu to track service progression.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {courses.map((course) => {
            const isCoursePending = pendingCourseId === course.id || isPending
            const isComplete = course.status === 'served' || course.status === 'skipped'

            return (
              <div
                key={course.id}
                className="rounded-lg border border-stone-700 bg-stone-950/40 p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-semibold text-stone-100 ${
                          course.status === 'skipped' ? 'line-through text-stone-500' : ''
                        }`}
                      >
                        {course.course_name}
                      </p>
                      <CourseStatusBadge status={course.status} />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">Course {course.course_order}</p>
                    <div className="mt-2">
                      <CourseTiming course={course} now={now} />
                    </div>
                    <CourseNotesField progressId={course.id} initialNotes={course.notes} />
                  </div>

                  {!isComplete && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[176px] sm:flex-row sm:justify-end">
                      {course.status === 'queued' && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isCoursePending}
                          onClick={() => handleAdvance(course, 'firing')}
                          className="min-h-[44px] border-amber-600/70 bg-amber-700/20 text-amber-200 hover:bg-amber-700/30 hover:text-amber-100"
                        >
                          Fire
                        </Button>
                      )}
                      {course.status === 'firing' && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isCoursePending}
                            onClick={() => handleAdvance(course, 'served')}
                            className="min-h-[44px] border-emerald-600/70 bg-emerald-700/20 text-emerald-200 hover:bg-emerald-700/30 hover:text-emerald-100"
                          >
                            Served
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isCoursePending}
                            onClick={() => handleAdvance(course, 'skipped')}
                            className="min-h-[44px]"
                          >
                            Skip
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
