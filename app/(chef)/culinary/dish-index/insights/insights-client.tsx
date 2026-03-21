'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DISH_COURSE_LABELS, type DishCourse } from '@/lib/menus/dish-index-constants'
import { mergeDishes } from '@/lib/menus/dish-index-actions'

interface DishInsightsClientProps {
  stats: {
    total: number
    withRecipe: number
    withoutRecipe: number
    recipeCoverage: number
    signatures: number
    byRotation: Record<string, number>
    byCourse: Record<string, number>
    topDishes: Array<{ id: string; name?: string; course: string; times_served: number }>
  } | null
  seasonal: Record<number, number>
  duplicates: Array<{
    dishes: Array<{
      id: string
      name: string
      canonical_name: string
      course: string
      times_served: number
    }>
    similarity: number
  }>
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function DishInsightsClient({ stats, seasonal, duplicates }: DishInsightsClientProps) {
  const router = useRouter()

  const handleMerge = useCallback(
    async (keepId: string, mergeId: string) => {
      await mergeDishes(keepId, mergeId)
      router.refresh()
    },
    [router]
  )

  if (!stats || stats.total === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Dish Insights</h1>
          <p className="text-stone-500 mt-1">Analytics and patterns from your culinary history</p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No data yet</p>
          <p className="text-stone-500 text-sm mb-4">Upload menus or add dishes to see insights</p>
          <Link href="/menus/upload">
            <Button variant="secondary" size="sm">
              Upload Menus
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const maxMonthCount = Math.max(...Object.values(seasonal), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Dish Insights</h1>
            <p className="text-stone-500 mt-1">Analytics and patterns from your culinary history</p>
          </div>
          <Link href="/culinary/dish-index">
            <Button variant="secondary">Back to Index</Button>
          </Link>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-stone-200">{stats.total}</p>
          <p className="text-xs text-stone-500">Total Dishes</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.withRecipe}</p>
          <p className="text-xs text-stone-500">With Recipe</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.withoutRecipe}</p>
          <p className="text-xs text-stone-500">Missing Recipe</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-brand-400">{stats.signatures}</p>
          <p className="text-xs text-stone-500">Signature</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-stone-200">{stats.recipeCoverage}%</p>
          <p className="text-xs text-stone-500">Coverage</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course breakdown */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Course Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(stats.byCourse)
              .sort(([, a], [, b]) => b - a)
              .map(([course, count]) => (
                <div key={course} className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 w-24 truncate">
                    {DISH_COURSE_LABELS[course as DishCourse] || course}
                  </span>
                  <div className="flex-1 bg-stone-800 rounded-full h-2">
                    <div
                      className="bg-brand-500 rounded-full h-2 transition-all"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </Card>

        {/* Rotation status */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Rotation Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-400">{stats.byRotation.active ?? 0}</p>
              <p className="text-xs text-stone-500">Active</p>
            </div>
            <div className="bg-brand-900/20 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-brand-400">{stats.byRotation.testing ?? 0}</p>
              <p className="text-xs text-stone-500">Testing</p>
            </div>
            <div className="bg-amber-900/20 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{stats.byRotation.resting ?? 0}</p>
              <p className="text-xs text-stone-500">Resting</p>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-stone-500">{stats.byRotation.retired ?? 0}</p>
              <p className="text-xs text-stone-500">Retired</p>
            </div>
          </div>
        </Card>

        {/* Top dishes */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Most Served Dishes</h3>
          <div className="space-y-1.5">
            {stats.topDishes.map((dish, i) => (
              <div key={dish.id} className="flex items-center gap-2">
                <span className="text-xs text-stone-600 w-5">{i + 1}.</span>
                <Link
                  href={`/culinary/dish-index/${dish.id}`}
                  className="flex-1 text-sm text-stone-300 hover:text-brand-400 truncate"
                >
                  {((dish as Record<string, unknown>).name as string) || 'Unknown'}
                </Link>
                <span className="text-xs text-stone-500">{dish.times_served}x</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Seasonal heatmap */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Seasonal Activity</h3>
          <div className="grid grid-cols-12 gap-1">
            {MONTH_LABELS.map((label, i) => {
              const count = seasonal[i + 1] || 0
              const intensity = count / maxMonthCount
              return (
                <div key={label} className="text-center">
                  <div
                    className="w-full aspect-square rounded-sm mb-1"
                    style={{
                      backgroundColor:
                        count > 0
                          ? `rgba(232, 143, 71, ${0.2 + intensity * 0.8})`
                          : 'rgb(41, 37, 36)',
                    }}
                    title={`${label}: ${count} dish appearances`}
                  />
                  <span className="text-2xs text-stone-600">{label}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Potential duplicates */}
      {duplicates.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">
            Potential Duplicates ({duplicates.length} groups)
          </h3>
          <p className="text-xs text-stone-500 mb-3">
            These dishes have similar names and may be the same dish. Review and merge if
            appropriate.
          </p>
          <div className="space-y-3">
            {duplicates.slice(0, 10).map((group, gi) => (
              <div key={gi} className="bg-stone-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-stone-600">
                    {Math.round(group.similarity * 100)}% similar
                  </span>
                </div>
                <div className="space-y-1">
                  {group.dishes.map((dish, di) => (
                    <div key={dish.id} className="flex items-center justify-between">
                      <span className="text-sm text-stone-300">
                        {dish.name}
                        <span className="text-xs text-stone-600 ml-2">
                          {dish.course} · {dish.times_served}x
                        </span>
                      </span>
                      {di > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMerge(group.dishes[0].id, dish.id)}
                        >
                          Merge into &quot;{group.dishes[0].name}&quot;
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
