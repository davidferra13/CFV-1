'use client'

import { useState, useCallback, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import {
  DISH_COURSES,
  DISH_COURSE_LABELS,
  DISH_COURSE_COLORS,
  DISH_COURSE_ICONS,
  ROTATION_STATUS_COLORS,
  ROTATION_STATUS_LABELS,
  type DishCourse,
  type RotationStatus,
} from '@/lib/menus/dish-index-constants'
import { updateDishIndexEntry } from '@/lib/menus/dish-index-actions'

interface DishIndexCardProps {
  dish: {
    id: string
    name: string
    course: string
    description?: string | null
    dietary_tags?: string[]
    times_served: number
    first_served?: string | null
    last_served?: string | null
    is_signature: boolean
    rotation_status: string
    linked_recipe_id?: string | null
    prep_complexity?: string | null
    recipes?: {
      id: string
      name: string
      category: string
      calories_per_serving?: number | null
    } | null
  }
  onCourseChanged?: () => void
}

export function DishIndexCard({ dish, onCourseChanged }: DishIndexCardProps) {
  const router = useRouter()
  const [showCoursePicker, setShowCoursePicker] = useState(false)
  const [isPending, startTransition] = useTransition()
  const pickerRef = useRef<HTMLDivElement>(null)

  const courseKey = dish.course as DishCourse
  const courseLabel = DISH_COURSE_LABELS[courseKey] || dish.course
  const courseColors = DISH_COURSE_COLORS[courseKey] || DISH_COURSE_COLORS.other
  const courseIcon = DISH_COURSE_ICONS[courseKey] || '📋'
  const rotationLabel =
    ROTATION_STATUS_LABELS[dish.rotation_status as RotationStatus] || dish.rotation_status
  const rotationColor =
    ROTATION_STATUS_COLORS[dish.rotation_status as RotationStatus] || 'bg-stone-800 text-stone-400'

  // Close picker on outside click
  useEffect(() => {
    if (!showCoursePicker) return
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCoursePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCoursePicker])

  const handleCourseChange = useCallback(
    (newCourse: string) => {
      if (newCourse === dish.course) {
        setShowCoursePicker(false)
        return
      }
      startTransition(async () => {
        try {
          await updateDishIndexEntry(dish.id, { course: newCourse } as any)
          setShowCoursePicker(false)
          toast.success(`Moved to ${DISH_COURSE_LABELS[newCourse as DishCourse] || newCourse}`)
          onCourseChanged?.()
          router.refresh()
        } catch {
          toast.error('Failed to update course')
        }
      })
    },
    [dish.id, dish.course, onCourseChanged, router]
  )

  return (
    <div className="relative group">
      <Link href={`/culinary/dish-index/${dish.id}`}>
        <Card
          className={`overflow-hidden hover:bg-stone-800/50 transition-all cursor-pointer border ${courseColors.border}`}
        >
          <div className="flex">
            {/* Course color stripe */}
            <div className={`w-1.5 flex-shrink-0 ${courseColors.stripe}`} />

            <div className="flex-1 p-4 min-w-0">
              {/* Top row: name + served count */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {dish.is_signature && (
                      <span className="text-brand-400 flex-shrink-0" title="Signature dish">
                        ★
                      </span>
                    )}
                    <h3 className="font-medium text-stone-100 truncate">{dish.name}</h3>
                  </div>
                  {dish.description && (
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{dish.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-semibold text-stone-300 leading-tight">
                    {dish.times_served}
                  </p>
                  <p className="text-[10px] text-stone-600">served</p>
                </div>
              </div>

              {/* Badge row */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${rotationColor}`}
                >
                  {rotationLabel}
                </span>
                {dish.dietary_tags && dish.dietary_tags.length > 0 && (
                  <span className="text-[11px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full">
                    {dish.dietary_tags.join(' ')}
                  </span>
                )}
                {dish.linked_recipe_id && (
                  <span className="text-[11px] bg-brand-900/40 text-brand-400 px-1.5 py-0.5 rounded-full">
                    Recipe
                  </span>
                )}
                {dish.last_served && (
                  <span className="text-[10px] text-stone-600 ml-auto">
                    {new Date(dish.last_served).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>

      {/* Course badge (clickable, overlaid) */}
      <div className="absolute top-2.5 right-16" ref={pickerRef}>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowCoursePicker(!showCoursePicker)
          }}
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors
            ${courseColors.bg} ${courseColors.text} hover:ring-1 hover:ring-white/20`}
          title="Click to change course"
        >
          {courseIcon} {courseLabel}
        </button>

        {/* Course picker dropdown */}
        {showCoursePicker && (
          <div className="absolute top-7 right-0 z-50 bg-stone-900 border border-stone-700 rounded-lg shadow-xl py-1 w-44 max-h-80 overflow-y-auto">
            {DISH_COURSES.map((c) => {
              const colors = DISH_COURSE_COLORS[c]
              const isActive = c === dish.course
              return (
                <button
                  key={c}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCourseChange(c)
                  }}
                  disabled={isPending}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors
                    ${isActive ? 'bg-stone-800 text-stone-200' : 'text-stone-400 hover:bg-stone-800/60 hover:text-stone-200'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.stripe}`} />
                  <span>{DISH_COURSE_ICONS[c]}</span>
                  <span>{DISH_COURSE_LABELS[c]}</span>
                  {isActive && <span className="ml-auto text-brand-400 text-xs">current</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
