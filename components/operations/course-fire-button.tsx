'use client'

import { useTransition } from 'react'
import { Flame, ChefHat, CheckCircle2 } from '@/components/ui/icons'
import { fireCourse, markCoursePlated, markCourseServed } from '@/lib/operations/kds-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseFireButtonProps {
  courseId: string
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NEXT_ACTION: Record<
  string,
  {
    label: string
    nextStatus: string
    icon: typeof Flame
    bgClass: string
    hoverClass: string
    activeClass: string
  }
> = {
  pending: {
    label: 'Fire',
    nextStatus: 'fired',
    icon: Flame,
    bgClass: 'bg-amber-500',
    hoverClass: 'hover:bg-amber-600',
    activeClass: 'active:bg-amber-700',
  },
  fired: {
    label: 'Mark Plated',
    nextStatus: 'plated',
    icon: ChefHat,
    bgClass: 'bg-sky-500',
    hoverClass: 'hover:bg-sky-600',
    activeClass: 'active:bg-sky-700',
  },
  plated: {
    label: 'Mark Served',
    nextStatus: 'served',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-500',
    hoverClass: 'hover:bg-emerald-600',
    activeClass: 'active:bg-emerald-700',
  },
}

const ACTION_MAP: Record<string, (courseId: string) => Promise<any>> = {
  pending: fireCourse,
  fired: markCoursePlated,
  plated: markCourseServed,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CourseFireButton({
  courseId,
  currentStatus,
  onStatusChange,
}: CourseFireButtonProps) {
  const [isPending, startTransition] = useTransition()

  const action = NEXT_ACTION[currentStatus]
  if (!action) return null

  const Icon = action.icon

  function handleClick() {
    const serverAction = ACTION_MAP[currentStatus]
    if (!serverAction) return

    startTransition(async () => {
      try {
        await serverAction(courseId)
        onStatusChange?.(action.nextStatus)
        toast.success(
          `Course ${action.label.toLowerCase()}${action.nextStatus === 'fired' ? 'd' : ''}`
        )
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : `Failed to ${action.label.toLowerCase()}`
        toast.error(message)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-bold text-base transition-colors disabled:opacity-50 disabled:pointer-events-none ${action.bgClass} ${action.hoverClass} ${action.activeClass}`}
    >
      {isPending ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <Icon className="h-5 w-5" />
      )}
      {action.label}
    </button>
  )
}
