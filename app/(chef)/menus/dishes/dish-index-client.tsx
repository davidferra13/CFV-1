'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DishIndexEntry } from '@/lib/menus/actions'

type SortValue = 'created_desc' | 'created_asc' | 'name' | 'course_number'
type MenuStatusFilter = 'all' | 'draft' | 'active' | 'archived'

const PAGE_SIZE = 24

export function DishIndexClient({ dishes }: { dishes: DishIndexEntry[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortValue>('created_desc')
  const [menuStatusFilter, setMenuStatusFilter] = useState<MenuStatusFilter>('all')
  const [dietaryFilter, setDietaryFilter] = useState('')
  const [page, setPage] = useState(1)

  // Collect unique dietary tags for filter dropdown
  const allDietaryTags = useMemo(() => {
    const tags = new Set<string>()
    dishes.forEach((d) => d.dietaryTags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [dishes])

  const filtered = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const result = dishes.filter((dish) => {
      // Menu status filter
      if (menuStatusFilter === 'draft' && dish.menuStatus !== 'draft') return false
      if (menuStatusFilter === 'active' && !['shared', 'locked'].includes(dish.menuStatus))
        return false
      if (menuStatusFilter === 'archived' && dish.menuStatus !== 'archived') return false

      // Dietary filter
      if (dietaryFilter && !dish.dietaryTags.includes(dietaryFilter)) return false

      // Search
      if (normalizedSearch) {
        const haystack = [
          dish.courseName,
          dish.description || '',
          dish.menuName,
          dish.chefNotes || '',
          ...dish.dietaryTags,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(normalizedSearch)) return false
      }

      return true
    })

    result.sort((a, b) => {
      if (sortBy === 'name') return a.courseName.localeCompare(b.courseName)
      if (sortBy === 'course_number') return a.courseNumber - b.courseNumber
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return result
  }, [dishes, searchTerm, sortBy, menuStatusFilter, dietaryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1">
            <Link
              href="/menus"
              className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Menus
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-stone-100">Dish Index</h1>
          <p className="mt-1 text-stone-400">
            {dishes.length} dish{dishes.length === 1 ? '' : 'es'} across all menus
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                type="text"
                placeholder="Search by dish name, menu, or notes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortValue)
                setPage(1)
              }}
              aria-label="Sort dishes"
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="name">Name (A-Z)</option>
              <option value="course_number">Course #</option>
            </select>
            <div className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3">
              <SlidersHorizontal className="h-4 w-4 text-stone-400" />
              <span className="text-sm text-stone-400">
                {filtered.length} dish{filtered.length === 1 ? '' : 'es'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={menuStatusFilter}
              onChange={(e) => {
                setMenuStatusFilter(e.target.value as MenuStatusFilter)
                setPage(1)
              }}
              aria-label="Filter by menu status"
            >
              <option value="all">All menu statuses</option>
              <option value="draft">Draft menus</option>
              <option value="active">Active menus</option>
              <option value="archived">Archived menus</option>
            </select>
            <select
              className="h-10 rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={dietaryFilter}
              onChange={(e) => {
                setDietaryFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Filter by dietary tag"
            >
              <option value="">All dietary tags</option>
              {allDietaryTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="text-stone-400">No dishes match these filters.</p>
            <p className="mt-1 text-sm text-stone-500">
              Try adjusting filters or add dishes to your menus.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((dish) => (
              <Link key={dish.id} href={`/menus/${dish.menuId}`}>
                <Card
                  interactive
                  className="h-full border-stone-700/80 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 transition-all duration-200 hover:border-brand-600/50"
                >
                  <CardContent className="space-y-2.5 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-medium text-brand-400">
                            {dish.courseNumber}
                          </span>
                          <h3 className="line-clamp-1 text-base font-semibold text-stone-100">
                            {dish.courseName}
                          </h3>
                        </div>
                        {dish.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-stone-400">
                            {dish.description}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-stone-500">
                        {dish.componentCount} comp{dish.componentCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="line-clamp-1 font-medium text-stone-300">
                        {dish.menuName}
                      </span>
                      <span className="text-stone-600">·</span>
                      <Badge
                        variant={
                          dish.menuStatus === 'archived'
                            ? 'default'
                            : dish.menuStatus === 'draft'
                              ? 'warning'
                              : 'success'
                        }
                        className="text-[10px]"
                      >
                        {dish.menuStatus}
                      </Badge>
                    </div>

                    {dish.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dish.dietaryTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {dish.allergenFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dish.allergenFlags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-400"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-stone-500">
                      {format(new Date(dish.createdAt), 'MMM d, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
              <p className="text-sm text-stone-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
