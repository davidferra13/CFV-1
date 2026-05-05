'use client'

import { useState, useCallback, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DishIndexCard } from '@/components/menus/dish-index-card'
import { DishQuickAdd } from '@/components/menus/dish-quick-add'
import { CatalogCuratePanel } from '@/components/menus/catalog-curate-panel'
import { getDishIndex } from '@/lib/menus/dish-index-actions'
import {
  DISH_COURSES,
  DISH_COURSE_LABELS,
  DISH_COURSE_COLORS,
  DISH_COURSE_ICONS,
  ROTATION_STATUSES,
  ROTATION_STATUS_LABELS,
  type DishCourse,
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

type ViewMode = 'grid' | 'by-course'

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
  const [curateMode, setCurateMode] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isPending, startTransition] = useTransition()
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PAGE_SIZE = 50

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

  const handleCourseChanged = useCallback(() => {
    applyFilters()
  }, [applyFilters])

  // Group dishes by course for the by-course view
  const groupedDishes = (() => {
    if (viewMode !== 'by-course') return null
    const groups: Record<string, Array<Record<string, unknown>>> = {}
    for (const course of DISH_COURSES) {
      groups[course] = []
    }
    for (const dish of dishes) {
      const course = dish.course as string
      if (!groups[course]) groups[course] = []
      groups[course].push(dish)
    }
    return groups
  })()

  // Count active courses for the course bar
  const courseCounts: Record<string, number> = {}
  if (stats?.byCourse) {
    for (const [k, v] of Object.entries(stats.byCourse)) {
      courseCounts[k] = v
    }
  }

  return (
    <div className="space-y-5">
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
            <Button
              onClick={() => setCurateMode(!curateMode)}
              variant={curateMode ? 'primary' : 'secondary'}
            >
              {curateMode ? 'Exit Send Mode' : 'Send to Client'}
            </Button>
            <Link href="/menus/selections">
              <Button variant="secondary">Selections</Button>
            </Link>
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
          Every dish you&apos;ve ever served, searchable, linked, and analyzed
        </p>
      </div>

      {/* Course ribbon: visual summary of all courses with counts */}
      {stats && !curateMode && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {DISH_COURSES.map((c) => {
            const count = courseCounts[c] || 0
            if (count === 0 && !courseFilter) return null
            const colors = DISH_COURSE_COLORS[c]
            const isActive = courseFilter === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  const next = isActive ? '' : c
                  setCourseFilter(next)
                  applyFilters({ course: next })
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                  ${
                    isActive
                      ? `${colors.bg} ${colors.text} ring-1 ring-current`
                      : 'bg-stone-800/60 text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                  }`}
              >
                <span>{DISH_COURSE_ICONS[c]}</span>
                <span>{DISH_COURSE_LABELS[c]}</span>
                <span
                  className={`text-[10px] px-1.5 py-0 rounded-full ${isActive ? 'bg-white/10' : 'bg-stone-700/60'}`}
                >
                  {count}
                </span>
              </button>
            )
          }).filter(Boolean)}
          {courseFilter && (
            <button
              type="button"
              onClick={() => {
                setCourseFilter('')
                applyFilters({ course: '' })
              }}
              className="text-xs text-stone-600 hover:text-stone-400 px-2"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      {stats && !curateMode && (
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

      {/* Curate Panel */}
      {curateMode && (
        <Card className="p-4 border-brand-700/30">
          <CatalogCuratePanel
            initialDishes={dishes.map((d: Record<string, unknown>) => ({
              id: d.id as string,
              name: d.name as string,
              course: d.course as string,
              description: d.description as string | null,
              dietary_tags: d.dietary_tags as string[] | undefined,
              allergen_flags: d.allergen_flags as string[] | undefined,
              is_signature: d.is_signature as boolean | undefined,
              season_affinity: d.season_affinity as string[] | undefined,
            }))}
            onComplete={() => {
              setCurateMode(false)
            }}
            onClose={() => setCurateMode(false)}
          />
        </Card>
      )}

      {/* Filters + View toggle */}
      {!curateMode && (
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

            {/* View mode toggle */}
            <div className="flex bg-stone-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-stone-700 text-stone-200'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by-course')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === 'by-course'
                    ? 'bg-stone-700 text-stone-200'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                By Course
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Load error banner */}
      {loadError && (
        <Card className="p-4 border-red-800/40 bg-red-900/10">
          <p className="text-sm text-red-400">
            Could not load dish index: {loadError}. Showing partial or empty results.
          </p>
        </Card>
      )}

      {/* Dish grid / grouped view */}
      {!curateMode && (
        <div className={`${isPending ? 'opacity-50' : ''}`}>
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
          ) : viewMode === 'by-course' && groupedDishes ? (
            /* Grouped by course view */
            <div className="space-y-6">
              {DISH_COURSES.map((course) => {
                const courseDishes = groupedDishes[course]
                if (!courseDishes || courseDishes.length === 0) return null
                const colors = DISH_COURSE_COLORS[course]
                return (
                  <div key={course}>
                    {/* Course header */}
                    <div
                      className={`flex items-center gap-2.5 mb-3 pb-2 border-b ${colors.border}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${colors.stripe}`} />
                      <span className="text-lg">{DISH_COURSE_ICONS[course]}</span>
                      <h2
                        className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}
                      >
                        {DISH_COURSE_LABELS[course]}
                      </h2>
                      <span className="text-xs text-stone-600">
                        {courseDishes.length} {courseDishes.length === 1 ? 'dish' : 'dishes'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {courseDishes.map((dish: Record<string, unknown>) => (
                        <DishIndexCard
                          key={dish.id as string}
                          dish={dish as DishIndexCardProps['dish']}
                          onCourseChanged={handleCourseChanged}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Flat grid view */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {dishes.map((dish: Record<string, unknown>) => (
                  <DishIndexCard
                    key={dish.id as string}
                    dish={dish as DishIndexCardProps['dish']}
                    onCourseChanged={handleCourseChanged}
                  />
                ))}
              </div>
              {dishes.length < total && (
                <div className="flex justify-center pt-4">
                  <Button variant="secondary" onClick={loadMore} loading={isPending}>
                    {isPending ? 'Loading...' : `Load More (${dishes.length} of ${total})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
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
