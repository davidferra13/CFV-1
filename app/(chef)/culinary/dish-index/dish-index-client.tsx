'use client'

import { useState, useCallback, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DishIndexCard } from '@/components/menus/dish-index-card'
import { DishQuickAdd } from '@/components/menus/dish-quick-add'
import { getDishIndex } from '@/lib/menus/dish-index-actions'
import {
  DISH_COURSES,
  DISH_COURSE_LABELS,
  ROTATION_STATUSES,
  ROTATION_STATUS_LABELS,
} from '@/lib/menus/dish-index-constants'

interface DishIndexStatsData {
  total: number
  withRecipe: number
  withoutRecipe: number
  recipeCoverage: number
  signatures: number
  byRotation: Record<string, number>
  byCourse: Record<string, number>
  topDishes: Array<{ id: string; name?: string; course: string; times_served: number }>
}

type DishIndexStats = DishIndexStatsData | null

interface DishIndexClientProps {
  initialDishes: Array<Record<string, unknown>>
  totalCount: number
  stats: DishIndexStats
  loadError?: string | null
}

export function DishIndexClient({
  initialDishes,
  totalCount,
  stats,
  loadError,
}: DishIndexClientProps) {
  const [dishes, setDishes] = useState(initialDishes)
  const [total, setTotal] = useState(totalCount)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [rotationFilter, setRotationFilter] = useState('')
  const [recipeFilter, setRecipeFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('times_served')
  const [isPending, startTransition] = useTransition()
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PAGE_SIZE = 50

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const applyFilters = useCallback(
    (overrides?: Record<string, unknown>) => {
      const filters = {
        search: overrides?.search !== undefined ? (overrides.search as string) : search,
        course: overrides?.course !== undefined ? (overrides.course as string) : courseFilter,
        rotation_status:
          overrides?.rotation_status !== undefined
            ? (overrides.rotation_status as string)
            : rotationFilter,
        has_recipe:
          (overrides?.recipeFilter !== undefined
            ? (overrides.recipeFilter as string)
            : recipeFilter) === 'yes'
            ? true
            : (overrides?.recipeFilter !== undefined
                  ? (overrides.recipeFilter as string)
                  : recipeFilter) === 'no'
              ? false
              : undefined,
        sort_by: (overrides?.sort_by !== undefined ? (overrides.sort_by as string) : sortBy) as
          | 'name'
          | 'times_served'
          | 'last_served'
          | 'created_at',
        sort_dir: 'desc' as const,
        limit: PAGE_SIZE,
      }

      startTransition(async () => {
        try {
          const result = await getDishIndex(filters)
          setDishes(result.dishes as unknown as Array<Record<string, unknown>>)
          setTotal(result.total)
        } catch (err) {
          toast.error('Failed to load dishes')
        }
      })
    },
    [search, courseFilter, rotationFilter, recipeFilter, sortBy]
  )

  const debouncedSearch = useCallback(
    (value: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        applyFilters({ search: value })
      }, 300)
    },
    [applyFilters]
  )

  const loadMore = useCallback(() => {
    startTransition(async () => {
      try {
        const filters = {
          search,
          course: courseFilter,
          rotation_status: rotationFilter,
          has_recipe: recipeFilter === 'yes' ? true : recipeFilter === 'no' ? false : undefined,
          sort_by: sortBy as 'name' | 'times_served' | 'last_served' | 'created_at',
          sort_dir: 'desc' as const,
          limit: PAGE_SIZE,
          offset: dishes.length,
        }
        const result = await getDishIndex(filters)
        setDishes((prev) => [
          ...prev,
          ...(result.dishes as unknown as Array<Record<string, unknown>>),
        ])
        setTotal(result.total)
      } catch (err) {
        toast.error('Failed to load more dishes')
      }
    })
  }, [search, courseFilter, rotationFilter, recipeFilter, sortBy, dishes.length])

  const handleDishAdded = useCallback(() => {
    applyFilters()
  }, [applyFilters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Dish Index</h1>
            <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
              {total}
            </span>
          </div>
          <div className="flex gap-2">
            <DishQuickAdd onDishAdded={handleDishAdded} />
            <Link href="/menus/upload">
              <Button variant="secondary">Upload Menus</Button>
            </Link>
            <Link href="/culinary/dish-index/insights">
              <Button variant="secondary">Insights</Button>
            </Link>
          </div>
        </div>
        <p className="text-stone-500 mt-1">
          Every dish you&apos;ve ever served - searchable, linked, and analyzed
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-stone-200">{stats.total}</p>
            <p className="text-xs text-stone-500">Total Dishes</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-stone-200">{stats.recipeCoverage}%</p>
            <p className="text-xs text-stone-500">Recipe Coverage</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-brand-400">{stats.signatures}</p>
            <p className="text-xs text-stone-500">Signature Dishes</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-stone-200">{stats.byRotation.active ?? 0}</p>
            <p className="text-xs text-stone-500">Active Rotation</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              debouncedSearch(e.target.value)
            }}
            placeholder="Search dishes..."
            className="flex-1 min-w-[200px] bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          <select
            value={courseFilter}
            aria-label="Filter by course"
            onChange={(e) => {
              setCourseFilter(e.target.value)
              applyFilters({ course: e.target.value })
            }}
            className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-300"
          >
            <option value="">All Courses</option>
            {DISH_COURSES.map((c) => (
              <option key={c} value={c}>
                {DISH_COURSE_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            value={rotationFilter}
            aria-label="Filter by rotation status"
            onChange={(e) => {
              setRotationFilter(e.target.value)
              applyFilters({ rotation_status: e.target.value })
            }}
            className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-300"
          >
            <option value="">All Statuses</option>
            {ROTATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ROTATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={recipeFilter}
            aria-label="Filter by recipe status"
            onChange={(e) => {
              setRecipeFilter(e.target.value)
              applyFilters({ recipeFilter: e.target.value })
            }}
            className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-300"
          >
            <option value="">Recipe Status</option>
            <option value="yes">Has Recipe</option>
            <option value="no">No Recipe</option>
          </select>
          <select
            value={sortBy}
            aria-label="Sort dishes by"
            onChange={(e) => {
              setSortBy(e.target.value)
              applyFilters({ sort_by: e.target.value })
            }}
            className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-300"
          >
            <option value="times_served">Most Served</option>
            <option value="last_served">Recently Served</option>
            <option value="name">Alphabetical</option>
            <option value="created_at">Recently Added</option>
          </select>
        </div>
      </Card>

      {/* Load error banner */}
      {loadError && (
        <Card className="p-4 border-red-800/40 bg-red-900/10">
          <p className="text-sm text-red-400">
            Could not load dish index: {loadError}. Showing partial or empty results.
          </p>
        </Card>
      )}

      {/* Dish grid */}
      <div className={`space-y-2 ${isPending ? 'opacity-50' : ''}`}>
        {dishes.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-stone-400 font-medium mb-1">No dishes yet</p>
            <p className="text-stone-500 text-sm mb-4">
              Upload historical menus or add dishes manually to build your index
            </p>
            <Link href="/menus/upload">
              <Button variant="secondary" size="sm">
                Upload Menus
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dishes.map((dish: Record<string, unknown>) => (
                <DishIndexCard key={dish.id as string} dish={dish as DishIndexCardProps['dish']} />
              ))}
            </div>
            {dishes.length < total && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={loadMore} loading={isPending}>
                  {isPending ? 'Loading...' : `Load More (${dishes.length} of ${total})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Re-export the type for the card component
type DishIndexCardProps = {
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
