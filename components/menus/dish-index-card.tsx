'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import {
  DISH_COURSE_LABELS,
  ROTATION_STATUS_COLORS,
  ROTATION_STATUS_LABELS,
  type DishCourse,
  type RotationStatus,
} from '@/lib/menus/dish-index-constants'

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
}

export function DishIndexCard({ dish }: DishIndexCardProps) {
  const courseLabel = DISH_COURSE_LABELS[dish.course as DishCourse] || dish.course
  const rotationLabel =
    ROTATION_STATUS_LABELS[dish.rotation_status as RotationStatus] || dish.rotation_status
  const rotationColor =
    ROTATION_STATUS_COLORS[dish.rotation_status as RotationStatus] || 'bg-stone-800 text-stone-400'

  return (
    <Link href={`/culinary/dish-index/${dish.id}`}>
      <Card className="p-4 hover:bg-stone-800/50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {dish.is_signature && (
                <span className="text-brand-400 text-sm" title="Signature dish">
                  ★
                </span>
              )}
              <h3 className="text-sm font-medium text-stone-200 truncate">{dish.name}</h3>
            </div>
            {dish.description && (
              <p className="text-xs text-stone-500 line-clamp-1 mb-2">{dish.description}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-medium bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                {courseLabel}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rotationColor}`}>
                {rotationLabel}
              </span>
              {dish.dietary_tags && dish.dietary_tags.length > 0 && (
                <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full">
                  {dish.dietary_tags.join(', ')}
                </span>
              )}
              {dish.linked_recipe_id && (
                <span className="text-[10px] bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">
                  Recipe linked
                </span>
              )}
              {dish.recipes?.calories_per_serving != null && (
                <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full">
                  {dish.recipes.calories_per_serving} kcal/serv
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-semibold text-stone-300">{dish.times_served}</p>
            <p className="text-[10px] text-stone-600">times served</p>
            {dish.last_served && (
              <p className="text-[10px] text-stone-600 mt-1">
                Last:{' '}
                {new Date(dish.last_served).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
