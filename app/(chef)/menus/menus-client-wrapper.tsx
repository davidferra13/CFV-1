'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Archive,
  CalendarDays,
  ChefHat,
  Copy,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils/currency'
import { duplicateMenu, transitionMenu, getMenuQuickViewData } from '@/lib/menus/actions'
import type { MenuQuickViewData } from '@/lib/menus/actions'
import { WorkflowNotesPanel } from '@/components/menus/workflow-notes-panel'
import { EmptyState } from '@/components/ui/empty-state'

type Menu = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'shared' | 'locked' | 'archived'
  created_at: string
  cuisine_type: string | null
  target_guest_count: number | null
  is_template: boolean
  is_showcase: boolean
  event_id: string | null
}

type MenuCostSummary = {
  menu_id: string
  total_component_count: number | null
  cost_per_guest_cents: number | null
  food_cost_percentage: number | null
}

type EventLite = {
  id: string
  occasion: string | null
  event_date: string
  status: string
}

type Props = {
  menus: Menu[]
  eventsById: Record<string, EventLite>
  costByMenuId: Record<string, MenuCostSummary>
  dishPhotoByMenuId?: Record<string, string>
}

type SortValue = 'created_desc' | 'created_asc' | 'name' | 'status'
type StatusFilter = 'all' | 'draft' | 'confirmed' | 'archived'
type EventTypeFilter = 'all' | 'birthday' | 'holiday' | 'regular'

const PAGE_SIZE = 12
const COMPLETED_STATUSES = new Set(['completed', 'cancelled'])

function getDisplayStatus(status: Menu['status']): 'draft' | 'confirmed' | 'archived' {
  if (status === 'shared' || status === 'locked') return 'confirmed'
  if (status === 'archived') return 'archived'
  return 'draft'
}

function getEventTypeLabel(occasion?: string | null): 'birthday' | 'holiday' | 'regular' {
  const source = (occasion || '').toLowerCase()
  if (source.includes('birthday') || source.includes('bday')) return 'birthday'
  if (
    source.includes('holiday') ||
    source.includes('christmas') ||
    source.includes('thanksgiving') ||
    source.includes('easter') ||
    source.includes('new year')
  ) {
    return 'holiday'
  }
  return 'regular'
}

function statusBadgeVariant(status: ReturnType<typeof getDisplayStatus>) {
  if (status === 'confirmed') return 'success'
  if (status === 'archived') return 'default'
  return 'warning'
}

function statusLabel(status: ReturnType<typeof getDisplayStatus>) {
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'archived') return 'Archived'
  return 'Draft'
}

function isActiveMenu(menu: Menu, eventsById: Record<string, EventLite>): boolean {
  if (!menu.event_id) return false
  const event = eventsById[menu.event_id]
  if (!event) return false
  return !COMPLETED_STATUSES.has(event.status)
}

// ============================================
// MENU CARD (shared between active + library)
// ============================================

function MenuCard({
  menu,
  menuEvent,
  costSummary,
  isActive,
  dishPhotoUrl,
  onClick,
}: {
  menu: Menu
  menuEvent: EventLite | null
  costSummary: MenuCostSummary | undefined
  isActive: boolean
  dishPhotoUrl?: string | null
  onClick: () => void
}) {
  const displayStatus = getDisplayStatus(menu.status)
  const eventType = getEventTypeLabel(menuEvent?.occasion)

  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        interactive
        className={`h-full transition-all duration-200 hover:border-brand-600/50 ${
          isActive
            ? 'border-brand-500/40 bg-gradient-to-br from-stone-900 via-stone-900 to-brand-950/20'
            : 'border-stone-700/80 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800'
        }`}
      >
        <CardContent className="space-y-3 pt-0">
          {dishPhotoUrl && (
            <div className="relative -mx-6 -mt-0 mb-2 aspect-[16/9] w-[calc(100%+3rem)] overflow-hidden rounded-t-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dishPhotoUrl} alt="Dish photo" className="h-full w-full object-cover" />
            </div>
          )}
          {!dishPhotoUrl && <div className="pt-5" />}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="line-clamp-1 text-lg font-semibold text-stone-100">{menu.name}</h3>
              {isActive && menuEvent ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-brand-400">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(menuEvent.event_date), 'MMM d, yyyy')}
                </p>
              ) : (
                <p className="mt-1 text-xs text-stone-400">
                  Created {format(new Date(menu.created_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={statusBadgeVariant(displayStatus)}>
                {statusLabel(displayStatus)}
              </Badge>
              {isActive && (
                <Badge variant="info" className="text-xxs">
                  Active
                </Badge>
              )}
            </div>
          </div>

          <p className="line-clamp-2 min-h-[40px] text-sm text-stone-400">
            {menu.description || 'No description provided.'}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="capitalize">
              {eventType}
            </Badge>
            {menu.is_template && <Badge variant="info">Template</Badge>}
            {menu.is_showcase && <Badge variant="success">Showcase</Badge>}
            {menu.cuisine_type && <Badge variant="default">{menu.cuisine_type}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
            <div>
              <p className="text-stone-400">Guests</p>
              <p className="font-medium text-stone-200">
                {menu.target_guest_count ? `${menu.target_guest_count}` : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-stone-400">Food cost</p>
              <p className="font-medium text-stone-200">
                {costSummary?.food_cost_percentage != null
                  ? `${costSummary.food_cost_percentage.toFixed(1)}%`
                  : 'Pending'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MenusClientWrapper({
  menus,
  eventsById,
  costByMenuId,
  dishPhotoByMenuId = {},
}: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortValue>('created_desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState<'archive' | 'duplicate' | null>(null)

  // Quick view data (lazy-loaded per menu)
  const [quickViewData, setQuickViewData] = useState<MenuQuickViewData | null>(null)
  const [quickViewLoading, setQuickViewLoading] = useState(false)
  const [quickViewError, setQuickViewError] = useState(false)
  const [quickViewCache, setQuickViewCache] = useState<Record<string, MenuQuickViewData>>({})

  const selectedMenu = selectedMenuId
    ? menus.find((menu) => menu.id === selectedMenuId) || null
    : null
  const selectedMenuEvent =
    selectedMenu?.event_id && eventsById[selectedMenu.event_id]
      ? eventsById[selectedMenu.event_id]
      : null
  const selectedMenuStatus = selectedMenu ? getDisplayStatus(selectedMenu.status) : null

  useEffect(() => {
    setPage(1)
  }, [searchTerm, sortBy, statusFilter, eventTypeFilter, fromDate, toDate])

  // Separate active menus from library
  const activeMenus = useMemo(() => {
    return menus
      .filter((m) => isActiveMenu(m, eventsById))
      .sort((a, b) => {
        const eventA = a.event_id ? eventsById[a.event_id] : null
        const eventB = b.event_id ? eventsById[b.event_id] : null
        const dateA = eventA ? new Date(eventA.event_date).getTime() : 0
        const dateB = eventB ? new Date(eventB.event_date).getTime() : 0
        return dateA - dateB // soonest event first
      })
  }, [menus, eventsById])

  const activeMenuIds = useMemo(() => new Set(activeMenus.map((m) => m.id)), [activeMenus])

  const filteredMenus = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = menus.filter((menu) => {
      // Exclude active menus from the library grid (they have their own section)
      if (activeMenuIds.has(menu.id)) return false

      const status = getDisplayStatus(menu.status)
      if (statusFilter !== 'all' && status !== statusFilter) return false

      const menuEvent = menu.event_id ? eventsById[menu.event_id] : null
      const eventType = getEventTypeLabel(menuEvent?.occasion)
      if (eventTypeFilter !== 'all' && eventType !== eventTypeFilter) return false

      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`)
        if (new Date(menu.created_at) < from) return false
      }

      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`)
        if (new Date(menu.created_at) > to) return false
      }

      if (!normalizedSearch) return true

      const haystack = [
        menu.name,
        menu.description || '',
        menu.cuisine_type || '',
        menuEvent?.occasion || '',
        statusLabel(status),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })

    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'status') {
        return statusLabel(getDisplayStatus(a.status)).localeCompare(
          statusLabel(getDisplayStatus(b.status))
        )
      }
      if (sortBy === 'created_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return filtered
  }, [
    menus,
    eventsById,
    activeMenuIds,
    searchTerm,
    sortBy,
    statusFilter,
    eventTypeFilter,
    fromDate,
    toDate,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredMenus.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedMenus = filteredMenus.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openMenuModal = useCallback(
    async (menuId: string) => {
      setError('')
      setSelectedMenuId(menuId)

      // Load quick view data (use cache if available)
      if (quickViewCache[menuId]) {
        setQuickViewData(quickViewCache[menuId])
        setQuickViewLoading(false)
        setQuickViewError(false)
      } else {
        setQuickViewData(null)
        setQuickViewError(false)
        setQuickViewLoading(true)
        try {
          // Race the fetch against a 10s timeout so the spinner never hangs forever.
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 10_000)
          )
          const data = await Promise.race([getMenuQuickViewData(menuId), timeoutPromise])
          setQuickViewData(data)
          setQuickViewCache((prev) => ({ ...prev, [menuId]: data }))
        } catch {
          setQuickViewData(null)
          setQuickViewError(true)
        } finally {
          setQuickViewLoading(false)
        }
      }
    },
    [quickViewCache]
  )

  const closeMenuModal = () => {
    setBusyAction(null)
    setSelectedMenuId(null)
    setQuickViewData(null)
  }

  const handleDuplicate = async () => {
    if (!selectedMenu) return
    setError('')
    setBusyAction('duplicate')
    try {
      const result = await duplicateMenu(selectedMenu.id)
      closeMenuModal()
      router.push(`/menus/${result.menu.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate menu')
      setBusyAction(null)
    }
  }

  const handleArchiveToggle = async () => {
    if (!selectedMenu) return
    setError('')
    setBusyAction('archive')
    try {
      const nextStatus = selectedMenu.status === 'archived' ? 'draft' : 'archived'
      await transitionMenu(selectedMenu.id, nextStatus, 'Updated from menu management center')
      closeMenuModal()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update menu status')
      setBusyAction(null)
    }
  }

  const totalMenuCount = menus.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Menus</h1>
          <p className="mt-1 text-stone-400">
            {totalMenuCount} menu{totalMenuCount === 1 ? '' : 's'} in your library
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/menus/dishes">
            <Button variant="secondary">
              <ChefHat className="mr-1.5 h-4 w-4" />
              Dish Index
            </Button>
          </Link>
          <Link href="/menus/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Menu
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* ============================================ */}
      {/* WORKFLOW NOTES PANEL                         */}
      {/* ============================================ */}
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <WorkflowNotesPanel mode="landing" />
      </div>

      {/* ============================================ */}
      {/* ACTIVE MENUS SECTION                         */}
      {/* ============================================ */}
      {activeMenus.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-brand-500" />
            <h2 className="text-lg font-semibold text-stone-100">Active Menus</h2>
            <span className="text-sm text-stone-400">
              ({activeMenus.length} linked to upcoming events)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-grid">
            {activeMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                menuEvent={menu.event_id ? (eventsById[menu.event_id] ?? null) : null}
                costSummary={costByMenuId[menu.id]}
                isActive
                dishPhotoUrl={dishPhotoByMenuId[menu.id]}
                onClick={() => openMenuModal(menu.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MENU LIBRARY (search, filter, paginate)      */}
      {/* ============================================ */}
      <div>
        {activeMenus.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-stone-600" />
            <h2 className="text-lg font-semibold text-stone-100">Menu Library</h2>
          </div>
        )}

        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  type="text"
                  placeholder="Search by menu, cuisine, status, or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                className="h-10 rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortValue)}
                aria-label="Sort menus"
              >
                <option value="created_desc">Newest first</option>
                <option value="created_asc">Oldest first</option>
                <option value="name">Name (A-Z)</option>
                <option value="status">Status</option>
              </select>
              <div className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3">
                <SlidersHorizontal className="h-4 w-4 text-stone-400" />
                <span className="text-sm text-stone-400">
                  {filteredMenus.length} menu{filteredMenus.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                className="h-10 rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="archived">Archived</option>
              </select>
              <select
                className="h-10 rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
                aria-label="Filter by event type"
              >
                <option value="all">All event types</option>
                <option value="birthday">Birthday</option>
                <option value="holiday">Holiday</option>
                <option value="regular">Regular</option>
              </select>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredMenus.length === 0 ? (
        <EmptyState
          remy="straight-face"
          title="No menus match these filters"
          description="Try adjusting your filters or create a new menu."
          action={{ label: 'Create Menu', href: '/menus/new' }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-grid">
            {paginatedMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                menuEvent={menu.event_id ? (eventsById[menu.event_id] ?? null) : null}
                costSummary={costByMenuId[menu.id]}
                isActive={false}
                dishPhotoUrl={dishPhotoByMenuId[menu.id]}
                onClick={() => openMenuModal(menu.id)}
              />
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

      {/* ============================================ */}
      {/* RICH QUICK VIEW MODAL                        */}
      {/* ============================================ */}
      {selectedMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0" onClick={closeMenuModal} aria-hidden="true" />
          <div className="animate-in relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-stone-700 bg-stone-900 p-5 shadow-2xl md:p-6">
            {/* Modal Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-500">Menu Quick View</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-100">{selectedMenu.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(selectedMenuStatus!)}>
                    {statusLabel(selectedMenuStatus!)}
                  </Badge>
                  {selectedMenu.is_template && <Badge variant="info">Template</Badge>}
                  {selectedMenu.is_showcase && <Badge variant="success">Showcase</Badge>}
                  {selectedMenu.cuisine_type && (
                    <Badge variant="default">{selectedMenu.cuisine_type}</Badge>
                  )}
                  {selectedMenu.target_guest_count && (
                    <Badge variant="default">
                      <Users className="mr-1 h-3 w-3" />
                      {selectedMenu.target_guest_count} guests
                    </Badge>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeMenuModal}
                className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {quickViewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                <span className="ml-2 text-sm text-stone-400">Loading menu details...</span>
              </div>
            ) : quickViewError ? (
              <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-4 text-center">
                <p className="text-sm text-red-400">
                  Could not load menu details. Please try again.
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-stone-400 underline hover:text-stone-200"
                  onClick={() => {
                    if (selectedMenuId) {
                      setQuickViewError(false)
                      openMenuModal(selectedMenuId)
                    }
                  }}
                >
                  Retry
                </button>
              </div>
            ) : quickViewData ? (
              <div className="space-y-5">
                {/* Courses + Stats grid */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {/* Courses list (takes 2 columns) */}
                  <div className="lg:col-span-2">
                    <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">
                      Courses ({quickViewData.courses.length})
                    </p>
                    {quickViewData.courses.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950 p-4 text-center text-sm text-stone-500">
                        No courses added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {quickViewData.courses.map((course, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between rounded-lg border border-stone-700/60 bg-stone-800/40 px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600/20 text-xs font-medium text-brand-400">
                                  {course.courseNumber}
                                </span>
                                <p className="font-medium text-stone-200">{course.courseName}</p>
                              </div>
                              {course.description && (
                                <p className="ml-7 mt-0.5 text-xs text-stone-400 line-clamp-1">
                                  {course.description}
                                </p>
                              )}
                              {course.dietaryTags.length > 0 && (
                                <div className="ml-7 mt-1 flex flex-wrap gap-1">
                                  {course.dietaryTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-xxs font-medium text-emerald-400"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="ml-2 whitespace-nowrap text-xs text-stone-500">
                              {course.componentCount} component
                              {course.componentCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stats sidebar */}
                  <div className="space-y-3">
                    {/* Cost summary */}
                    <div className="rounded-lg border border-stone-700 bg-stone-800/40 p-3">
                      <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">
                        Cost Summary
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-400">Cost / Guest</span>
                          <span className="font-medium text-stone-200">
                            {quickViewData.costPerGuestCents != null
                              ? formatCurrency(quickViewData.costPerGuestCents)
                              : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-400">Food Cost %</span>
                          <span className="font-medium text-stone-200">
                            {quickViewData.foodCostPercentage != null
                              ? `${quickViewData.foodCostPercentage.toFixed(1)}%`
                              : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-400">Components</span>
                          <span className="font-medium text-stone-200">
                            {quickViewData.totalComponents}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dietary & Allergens */}
                    {(quickViewData.allDietaryTags.length > 0 ||
                      quickViewData.allAllergenFlags.length > 0) && (
                      <div className="rounded-lg border border-stone-700 bg-stone-800/40 p-3">
                        {quickViewData.allDietaryTags.length > 0 && (
                          <div className="mb-2">
                            <p className="mb-1 text-xs text-stone-500">Accommodates</p>
                            <div className="flex flex-wrap gap-1">
                              {quickViewData.allDietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-xxs font-medium text-emerald-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {quickViewData.allAllergenFlags.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs text-stone-500">Contains</p>
                            <div className="flex flex-wrap gap-1">
                              {quickViewData.allAllergenFlags.map((flag) => (
                                <span
                                  key={flag}
                                  className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xxs font-medium text-amber-400"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Linked event */}
                    <div className="rounded-lg border border-stone-700 bg-stone-800/40 p-3">
                      <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">
                        Linked Event
                      </p>
                      {quickViewData.linkedEvent ? (
                        <Link
                          href={`/events/${quickViewData.linkedEvent.id}`}
                          className="block text-sm hover:text-brand-400"
                          onClick={closeMenuModal}
                        >
                          <p className="font-medium text-stone-200">
                            {quickViewData.linkedEvent.occasion || 'Untitled Event'}
                          </p>
                          <p className="text-xs text-stone-400">
                            {format(new Date(quickViewData.linkedEvent.eventDate), 'MMM d, yyyy')}
                            {quickViewData.linkedEvent.clientName &&
                              ` - ${quickViewData.linkedEvent.clientName}`}
                          </p>
                          <Badge variant="default" className="mt-1 capitalize">
                            {quickViewData.linkedEvent.status.replace('_', ' ')}
                          </Badge>
                        </Link>
                      ) : (
                        <p className="text-sm text-stone-500">Not linked to an event</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center gap-3 border-t border-stone-700 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/menus/${selectedMenu.id}/editor`)}
                    >
                      Edit
                    </Button>
                    <Button onClick={() => router.push(`/menus/${selectedMenu.id}`)}>
                      <Eye className="mr-1.5 h-4 w-4" />
                      Full BOH View
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-stone-700" />

                  <div className="flex flex-wrap gap-2">
                    {/* FOH buttons */}
                    {selectedMenuEvent ? (
                      <a
                        href={`/api/documents/${selectedMenuEvent.id}?type=foh`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-600 bg-stone-800 px-4 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-700"
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
                        FOH PDF
                      </a>
                    ) : (
                      <a
                        href={`/api/documents/foh-preview/${selectedMenu.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-600 bg-stone-800 px-4 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-700"
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
                        Preview FOH
                      </a>
                    )}
                  </div>

                  <div className="h-6 w-px bg-stone-700" />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleDuplicate}
                      disabled={busyAction !== null}
                    >
                      <Copy className="mr-1.5 h-4 w-4" />
                      {busyAction === 'duplicate' ? 'Duplicating...' : 'Duplicate'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleArchiveToggle}
                      disabled={busyAction !== null}
                    >
                      <Archive className="mr-1.5 h-4 w-4" />
                      {selectedMenuStatus === 'archived'
                        ? busyAction === 'archive'
                          ? 'Restoring...'
                          : 'Restore'
                        : busyAction === 'archive'
                          ? 'Archiving...'
                          : 'Archive'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Fallback if quick view data failed to load
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border-stone-700">
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-500" />
                      <p className="font-medium text-stone-200">Front of House Version</p>
                    </div>
                    <p className="text-sm text-stone-400">
                      Clean printable menu for guests with dish names and dietary markers.
                    </p>
                    <a
                      href={
                        selectedMenuEvent
                          ? `/api/documents/${selectedMenuEvent.id}?type=foh`
                          : `/api/documents/foh-preview/${selectedMenu.id}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                    >
                      {selectedMenuEvent ? 'View FOH PDF' : 'Preview FOH'}
                    </a>
                  </CardContent>
                </Card>
                <Card className="border-stone-700">
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-brand-500" />
                      <p className="font-medium text-stone-200">Back of House Version</p>
                    </div>
                    <p className="text-sm text-stone-400">
                      Full operational detail with components, prep notes, and cost analytics.
                    </p>
                    <Button onClick={() => router.push(`/menus/${selectedMenu.id}`)}>
                      View BOH
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
