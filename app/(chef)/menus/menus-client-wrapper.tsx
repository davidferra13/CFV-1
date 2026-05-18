'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChefHat, Download, Plus, Search, SlidersHorizontal } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { duplicateMenu, transitionMenu, getMenuQuickViewData } from '@/lib/menus/actions'
import type { MenuQuickViewData } from '@/lib/menus/actions'
import {
  MenuCard,
  MenuQuickViewModal,
  getDisplayStatus,
  getEventTypeLabel,
  isActiveMenu,
  statusLabel,
  PAGE_SIZE,
  type EventLite,
  type EventTypeFilter,
  type Menu,
  type MenuCostSummary,
  type MenusClientWrapperProps,
  type SortValue,
  type StatusFilter,
} from './menus-components'
import { WorkflowNotesPanel } from '@/components/menus/workflow-notes-panel'
import { EmptyState } from '@/components/ui/empty-state'

export function MenusClientWrapper({
  menus,
  eventsById,
  costByMenuId,
  dishPhotoByMenuId = {},
}: MenusClientWrapperProps) {
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
          <a href="/menus/csv-export" download>
            <Button variant="secondary">
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </a>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <MenuQuickViewModal
        selectedMenu={selectedMenu}
        selectedMenuEvent={selectedMenuEvent}
        selectedMenuStatus={selectedMenuStatus}
        quickViewData={quickViewData}
        quickViewLoading={quickViewLoading}
        quickViewError={quickViewError}
        selectedMenuId={selectedMenuId}
        busyAction={busyAction}
        closeMenuModal={closeMenuModal}
        openMenuModal={openMenuModal}
        handleDuplicate={handleDuplicate}
        handleArchiveToggle={handleArchiveToggle}
        onNavigate={(href) => router.push(href)}
      />
    </div>
  )
}
