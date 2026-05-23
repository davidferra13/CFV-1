'use client'

// Course Tracker for Kitchen Mode
// Visual progress through courses with tap-to-advance status.

import { useState, useEffect } from 'react'

export interface CourseItem {
  id: string
  name: string
  category: string | null
  status: 'pending' | 'plating' | 'served'
}

interface CourseTrackerProps {
  courses: CourseItem[]
  serviceStartedAt: string | null
  onCourseStatusChange: (courseId: string, status: 'pending' | 'plating' | 'served') => void
}

function getNextStatus(current: 'pending' | 'plating' | 'served'): 'pending' | 'plating' | 'served' {
  if (current === 'pending') return 'plating'
  if (current === 'plating') return 'served'
  return 'pending'
}

function getStatusColor(status: 'pending' | 'plating' | 'served'): string {
  if (status === 'served') return 'bg-emerald-600 border-emerald-500'
  if (status === 'plating') return 'bg-amber-600 border-amber-500 animate-pulse'
  return 'bg-zinc-700 border-zinc-600'
}

function getStatusLabel(status: 'pending' | 'plating' | 'served'): string {
  if (status === 'served') return 'Served'
  if (status === 'plating') return 'Plating'
  return 'Pending'
}

function formatElapsed(startMs: number): string {
  const diffMs = Date.now() - startMs
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function CourseTracker({ courses, serviceStartedAt, onCourseStatusChange }: CourseTrackerProps) {
  const [elapsed, setElapsed] = useState('')
  const startMs = serviceStartedAt ? new Date(serviceStartedAt).getTime() : Date.now()

  useEffect(() => {
    const tick = () => setElapsed(formatElapsed(startMs))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startMs])

  const servedCount = courses.filter((c) => c.status === 'served').length
  const progressPercent = courses.length > 0 ? (servedCount / courses.length) * 100 : 0

  // Group courses by category
  const categories = new Map<string, CourseItem[]>()
  for (const course of courses) {
    const cat = course.category ?? 'Uncategorized'
    if (!categories.has(cat)) categories.set(cat, [])
    categories.get(cat)!.push(course)
  }

  return (
    <div className="space-y-4">
      {/* Header with elapsed time */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Course Progress</h2>
        <div className="text-right">
          <div className="text-zinc-400 text-sm">Service time</div>
          <div className="text-white font-mono text-xl">{elapsed}</div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-zinc-400">
          <span>{servedCount} of {courses.length} served</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Course cards by category */}
      {courses.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-lg">
          No menu items found. Add dishes to this event&#39;s menu to track courses.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(categories.entries()).map(([category, items]) => (
            <div key={category}>
              <div className="text-zinc-400 text-sm font-medium mb-2 uppercase tracking-wider">
                {category}
              </div>
              <div className="grid gap-2">
                {items.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => onCourseStatusChange(course.id, getNextStatus(course.status))}
                    className={`
                      w-full flex items-center justify-between px-5 py-4 rounded-xl border-2
                      transition-all active:scale-[0.98]
                      ${getStatusColor(course.status)}
                    `}
                    style={{ minHeight: '56px' }}
                  >
                    <span className="text-white text-lg font-medium text-left">{course.name}</span>
                    <span className={`
                      text-sm font-bold px-3 py-1 rounded-lg
                      ${course.status === 'served' ? 'bg-emerald-800 text-emerald-200' : ''}
                      ${course.status === 'plating' ? 'bg-amber-800 text-amber-200' : ''}
                      ${course.status === 'pending' ? 'bg-zinc-600 text-zinc-300' : ''}
                    `}>
                      {getStatusLabel(course.status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
