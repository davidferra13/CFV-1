'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Archive, Copy, Eye, FileText, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { duplicateMenu, transitionMenu } from '@/lib/menus/actions'

type Menu = {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'shared' | 'locked' | 'archived'
  created_at: string
  cuisine_type: string | null
  target_guest_count: number | null
  is_template: boolean
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
}

type SortValue = 'created_desc' | 'created_asc' | 'name' | 'status'
type StatusFilter = 'all' | 'draft' | 'confirmed' | 'archived'
type EventTypeFilter = 'all' | 'birthday' | 'holiday' | 'regular'

const PAGE_SIZE = 12

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

export function MenusClientWrapper({ menus, eventsById, costByMenuId }: Props) {
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

  const filteredMenus = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = menus.filter((menu) => {
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
  }, [menus, eventsById, searchTerm, sortBy, statusFilter, eventTypeFilter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filteredMenus.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedMenus = filteredMenus.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openMenuModal = (menuId: string) => {
    setError('')
    setSelectedMenuId(menuId)
  }

  const closeMenuModal = () => {
    setBusyAction(null)
    setSelectedMenuId(null)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Menus</h1>
          <p className="mt-1 text-stone-400">Centralized back-of-house menu management</p>
        </div>
        <Link href="/menus/new">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Menu
          </Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

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

      {filteredMenus.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="text-stone-400">No menus match these filters.</p>
            <p className="mt-1 text-sm text-stone-500">
              Try adjusting filters or create a new menu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedMenus.map((menu) => {
              const displayStatus = getDisplayStatus(menu.status)
              const menuEvent = menu.event_id ? eventsById[menu.event_id] : null
              const eventType = getEventTypeLabel(menuEvent?.occasion)
              const costSummary = costByMenuId[menu.id]

              return (
                <button
                  type="button"
                  key={menu.id}
                  onClick={() => openMenuModal(menu.id)}
                  className="text-left"
                >
                  <Card
                    interactive
                    className="h-full border-stone-700/80 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 transition-all duration-200 hover:border-brand-600/50"
                  >
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="line-clamp-1 text-lg font-semibold text-stone-100">
                            {menu.name}
                          </h3>
                          <p className="mt-1 text-xs text-stone-400">
                            Created {format(new Date(menu.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={statusBadgeVariant(displayStatus)}>
                          {statusLabel(displayStatus)}
                        </Badge>
                      </div>

                      <p className="line-clamp-2 min-h-[40px] text-sm text-stone-400">
                        {menu.description || 'No description provided.'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default" className="capitalize">
                          {eventType}
                        </Badge>
                        {menu.is_template && <Badge variant="info">Template</Badge>}
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
            })}
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

      {selectedMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0" onClick={closeMenuModal} aria-hidden="true" />
          <div className="animate-in relative w-full max-w-3xl rounded-2xl border border-stone-700 bg-stone-900 p-5 shadow-2xl transition-all duration-200 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-500">Menu Quick Access</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-100">{selectedMenu.name}</h2>
                <p className="mt-1 text-sm text-stone-400">
                  Choose the version you want, then use quick actions to maintain this menu.
                </p>
              </div>
              <button
                type="button"
                onClick={closeMenuModal}
                className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
                aria-label="Close menu options"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-stone-700">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-500" />
                    <p className="font-medium text-stone-200">Front of House Version</p>
                  </div>
                  <p className="text-sm text-stone-400">
                    Clean printable menu for guests. Includes dish names, descriptions, and dietary
                    markers.
                  </p>
                  <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950 p-3 text-xs text-stone-400">
                    {selectedMenuEvent
                      ? `Linked to ${selectedMenuEvent.occasion || 'event'} on ${format(new Date(selectedMenuEvent.event_date), 'MMM d, yyyy')}`
                      : 'Link this menu to an event to generate the FOH printable PDF.'}
                  </div>
                  {selectedMenuEvent ? (
                    <a
                      href={`/api/documents/${selectedMenuEvent.id}?type=foh`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                    >
                      View Front of House Version
                    </a>
                  ) : (
                    <Button variant="secondary" disabled>
                      View Front of House Version
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-stone-700">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-brand-500" />
                    <p className="font-medium text-stone-200">Back of House Version</p>
                  </div>
                  <p className="text-sm text-stone-400">
                    Full operational detail with components, prep notes, dietary flags, and cost
                    analytics.
                  </p>
                  <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950 p-3 text-xs text-stone-400">
                    Includes editor access, component-level prep workflow, and recipe links.
                  </div>
                  <Button onClick={() => router.push(`/menus/${selectedMenu.id}`)}>
                    View Back of House Version
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-5 rounded-xl border border-stone-700 bg-stone-800/40 p-4">
              <p className="mb-3 text-xs uppercase tracking-wider text-stone-500">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/menus/${selectedMenu.id}/editor`)}
                >
                  Edit
                </Button>
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
                      : 'Restore to Draft'
                    : busyAction === 'archive'
                      ? 'Archiving...'
                      : 'Archive'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
