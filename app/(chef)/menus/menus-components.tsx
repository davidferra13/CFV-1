'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Archive,
  CalendarDays,
  Copy,
  Eye,
  FileText,
  Loader2,
  Users,
  X,
} from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import type { MenuQuickViewData } from '@/lib/menus/actions'

export type Menu = {
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

export type MenuCostSummary = {
  menu_id: string
  total_component_count: number | null
  cost_per_guest_cents: number | null
  food_cost_percentage: number | null
}

export type EventLite = {
  id: string
  occasion: string | null
  event_date: string
  status: string
}

export type MenusClientWrapperProps = {
  menus: Menu[]
  eventsById: Record<string, EventLite>
  costByMenuId: Record<string, MenuCostSummary>
  dishPhotoByMenuId?: Record<string, string>
}

export type SortValue = 'created_desc' | 'created_asc' | 'name' | 'status'
export type StatusFilter = 'all' | 'draft' | 'confirmed' | 'archived'
export type EventTypeFilter = 'all' | 'birthday' | 'holiday' | 'regular'

export const PAGE_SIZE = 12
const COMPLETED_STATUSES = new Set(['completed', 'cancelled'])

export function getDisplayStatus(status: Menu['status']): 'draft' | 'confirmed' | 'archived' {
  if (status === 'shared' || status === 'locked') return 'confirmed'
  if (status === 'archived') return 'archived'
  return 'draft'
}

export function getEventTypeLabel(occasion?: string | null): 'birthday' | 'holiday' | 'regular' {
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

export function statusBadgeVariant(status: ReturnType<typeof getDisplayStatus>) {
  if (status === 'confirmed') return 'success'
  if (status === 'archived') return 'default'
  return 'warning'
}

export function statusLabel(status: ReturnType<typeof getDisplayStatus>) {
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'archived') return 'Archived'
  return 'Draft'
}

export function isActiveMenu(menu: Menu, eventsById: Record<string, EventLite>): boolean {
  if (!menu.event_id) return false
  const event = eventsById[menu.event_id]
  if (!event) return false
  return !COMPLETED_STATUSES.has(event.status)
}

// ============================================
// MENU CARD (shared between active + library)
// ============================================

export function MenuCard({
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
              <Image
                src={dishPhotoUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                unoptimized
                className="object-cover"
              />
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

type MenuQuickViewModalProps = {
  selectedMenu: Menu | null
  selectedMenuEvent: EventLite | null
  selectedMenuStatus: ReturnType<typeof getDisplayStatus> | null
  quickViewData: MenuQuickViewData | null
  quickViewLoading: boolean
  quickViewError: boolean
  selectedMenuId: string | null
  busyAction: 'archive' | 'duplicate' | null
  closeMenuModal: () => void
  openMenuModal: (menuId: string) => void
  handleDuplicate: () => void
  handleArchiveToggle: () => void
  onNavigate: (href: string) => void
}

export function MenuQuickViewModal({
  selectedMenu,
  selectedMenuEvent,
  selectedMenuStatus,
  quickViewData,
  quickViewLoading,
  quickViewError,
  selectedMenuId,
  busyAction,
  closeMenuModal,
  openMenuModal,
  handleDuplicate,
  handleArchiveToggle,
  onNavigate,
}: MenuQuickViewModalProps) {
  if (!selectedMenu || !selectedMenuStatus) return null

  return (
    <div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-black/65 p-4"
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
            <p className="text-sm text-red-400">Could not load menu details. Please try again.</p>
            <button
              type="button"
              className="mt-2 text-xs text-stone-400 underline hover:text-stone-200"
              onClick={() => {
                if (selectedMenuId) {
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
                  onClick={() => onNavigate(`/menus/${selectedMenu.id}/editor`)}
                >
                  Edit
                </Button>
                <Button onClick={() => onNavigate(`/menus/${selectedMenu.id}`)}>
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
                <Button onClick={() => onNavigate(`/menus/${selectedMenu.id}`)}>View BOH</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
