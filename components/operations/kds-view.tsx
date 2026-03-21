'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CourseFireButton } from './course-fire-button'
import { EightySixModal } from './eighty-six-modal'
import { Clock, Utensils } from '@/components/ui/icons'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KDSCourse {
  id: string
  courseName: string
  courseNumber: number
  status: 'pending' | 'fired' | 'plated' | 'served' | 'eighty_sixed'
  firedAt?: string | null
  servedAt?: string | null
}

interface KDSViewProps {
  courses: KDSCourse[]
  eventId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; border: string; badge: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  pending: { bg: 'bg-stone-800', border: 'border-stone-600', badge: 'default' },
  fired: { bg: 'bg-amber-950', border: 'border-amber-400', badge: 'warning' },
  plated: { bg: 'bg-brand-950', border: 'border-brand-400', badge: 'info' },
  served: { bg: 'bg-emerald-950', border: 'border-emerald-400', badge: 'success' },
  eighty_sixed: { bg: 'bg-red-950', border: 'border-red-400', badge: 'error' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  fired: 'Fired',
  plated: 'Plated',
  served: 'Served',
  eighty_sixed: "86'd",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KDSView({ courses: initialCourses, eventId }: KDSViewProps) {
  const [courses, setCourses] = useState<KDSCourse[]>(
    [...initialCourses].sort((a, b) => a.courseNumber - b.courseNumber)
  )
  const [eightySixTarget, setEightySixTarget] = useState<KDSCourse | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {
        // Fallback: just toggle a CSS class
        setIsFullscreen(true)
      })
    } else {
      document.exitFullscreen?.()
    }
  }, [])

  // Listen for fullscreen change
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function handleStatusUpdate(courseId: string, newStatus: string) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c
        const updates: Partial<KDSCourse> = { status: newStatus as KDSCourse['status'] }
        if (newStatus === 'fired') updates.firedAt = new Date().toISOString()
        if (newStatus === 'served') updates.servedAt = new Date().toISOString()
        return { ...c, ...updates }
      })
    )
  }

  function handleEightySixed(courseId: string) {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, status: 'eighty_sixed' as const } : c))
    )
    setEightySixTarget(null)
  }

  function formatTime(isoString?: string | null): string {
    if (!isoString) return '--:--'
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-stone-950 p-4 overflow-auto' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-stone-100">Kitchen Display</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-md bg-stone-700 text-stone-300 text-xs hover:bg-stone-600 active:bg-stone-500 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          {Object.entries(STATUS_LABELS).map(([status, label]) => {
            const count = courses.filter((c) => c.status === status).length
            if (count === 0) return null
            return (
              <Badge key={status} variant={STATUS_STYLES[status].badge}>
                {label}: {count}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((course) => {
          const styles = STATUS_STYLES[course.status] || STATUS_STYLES.pending

          return (
            <Card
              key={course.id}
              className={`${styles.bg} border-2 ${styles.border} transition-colors`}
            >
              <CardContent className="p-6">
                {/* Course header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Course {course.courseNumber}
                    </span>
                    <h3 className="text-xl font-bold text-stone-100 mt-1 leading-tight">
                      {course.courseName}
                    </h3>
                  </div>
                  <Badge variant={styles.badge}>{STATUS_LABELS[course.status]}</Badge>
                </div>

                {/* Timestamps */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-stone-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Fired: {formatTime(course.firedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-stone-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Served: {formatTime(course.servedAt)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                {course.status !== 'served' && course.status !== 'eighty_sixed' && (
                  <div className="flex gap-2">
                    <CourseFireButton
                      courseId={course.id}
                      currentStatus={course.status}
                      onStatusChange={(newStatus) => handleStatusUpdate(course.id, newStatus)}
                    />
                    <button
                      type="button"
                      onClick={() => setEightySixTarget(course)}
                      className="px-5 py-4 min-h-[48px] min-w-[48px] rounded-lg bg-red-600 text-white font-bold text-lg hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
                    >
                      86
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {courses.length === 0 && (
        <p className="text-sm text-stone-400 italic text-center py-8">
          No courses loaded for this event.
        </p>
      )}

      {/* 86 Modal */}
      {eightySixTarget && (
        <EightySixModal
          courseId={eightySixTarget.id}
          courseName={eightySixTarget.courseName}
          onClose={() => setEightySixTarget(null)}
          onConfirm={() => handleEightySixed(eightySixTarget.id)}
        />
      )}
    </div>
  )
}
