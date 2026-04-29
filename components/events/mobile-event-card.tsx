import Link from 'next/link'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EventStatusBadge, type EventStatus } from '@/components/events/event-status-badge'
import { formatCurrency } from '@/lib/utils/format'
import { buildEventMobileRunModeHref } from '@/lib/events/operation-registry'
import {
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  Package,
  Printer,
  Users,
  type LucideIcon,
} from '@/components/ui/icons'

export type MobileEventCardEvent = {
  id: string
  occasion?: string | null
  title?: string | null
  event_date?: string | null
  serve_time?: string | null
  guest_count?: number | null
  quoted_price_cents?: number | null
  status?: string | null
  client?: {
    full_name?: string | null
  } | null
}

export type MobileEventLaunchAction = {
  id: 'detail' | 'edit' | 'dop' | 'packing' | 'print' | 'documents'
  label: string
  href: string
  variant: 'primary' | 'secondary' | 'ghost'
}

type RegionalCurrencySettings = {
  locale?: string
  currencyCode?: string
}

const OPS_STATUSES = new Set(['accepted', 'paid', 'confirmed', 'in_progress'])
const DOCUMENT_STATUSES = new Set([
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
])
const EVENT_STATUSES = new Set<EventStatus>([
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
])

const ACTION_ICONS: Record<MobileEventLaunchAction['id'], LucideIcon> = {
  detail: ArrowRight,
  edit: Edit3,
  dop: Clock,
  packing: Package,
  print: Printer,
  documents: FileText,
}

export function getMobileEventTitle(event: MobileEventCardEvent): string {
  return event.occasion?.trim() || event.title?.trim() || 'Untitled Event'
}

export function normalizeMobileEventStatus(status: string | null | undefined): EventStatus {
  return EVENT_STATUSES.has(status as EventStatus) ? (status as EventStatus) : 'draft'
}

export function formatMobileEventDate(value: string | null | undefined): string {
  if (!value) return 'Date TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date TBD'
  return format(date, 'MMM d, yyyy')
}

export function formatMobileEventPrice(
  event: MobileEventCardEvent,
  regional: RegionalCurrencySettings
): string | null {
  if (typeof event.quoted_price_cents !== 'number') return null
  return formatCurrency(event.quoted_price_cents, {
    locale: regional.locale,
    currency: regional.currencyCode,
  })
}

export function getMobileEventLaunchActions(
  event: MobileEventCardEvent
): MobileEventLaunchAction[] {
  const status = normalizeMobileEventStatus(event.status)
  const actions: MobileEventLaunchAction[] = [
    {
      id: 'detail',
      label: 'Details',
      href: `/events/${event.id}`,
      variant: 'secondary',
    },
  ]

  if (status === 'draft') {
    actions.push({
      id: 'edit',
      label: 'Edit',
      href: `/events/${event.id}/edit`,
      variant: 'secondary',
    })
    return actions
  }

  if (status === 'cancelled') return actions

  if (OPS_STATUSES.has(status)) {
    if (event.event_date && event.serve_time) {
      actions.push({
        id: 'dop',
        label: 'Run',
        href: buildEventMobileRunModeHref(event.id, 'dop'),
        variant: 'primary',
      })
    }

    actions.push({
      id: 'packing',
      label: 'Pack',
      href: buildEventMobileRunModeHref(event.id, 'packing'),
      variant: event.event_date && event.serve_time ? 'secondary' : 'primary',
    })
  }

  if (DOCUMENT_STATUSES.has(status)) {
    actions.push(
      {
        id: 'print',
        label: 'Print',
        href: `/events/${event.id}/print`,
        variant: 'secondary',
      },
      {
        id: 'documents',
        label: 'Docs',
        href: `/events/${event.id}/documents`,
        variant: 'secondary',
      }
    )
  }

  return actions
}

export function MobileEventCard({
  event,
  regional,
  photoUrl,
  isToday,
  isSample,
}: {
  event: MobileEventCardEvent
  regional: RegionalCurrencySettings
  photoUrl?: string
  isToday?: boolean
  isSample?: boolean
}) {
  const title = getMobileEventTitle(event)
  const status = normalizeMobileEventStatus(event.status)
  const price = formatMobileEventPrice(event, regional)
  const actions = getMobileEventLaunchActions(event)
  const clientName = event.client?.full_name?.trim() || 'Client TBD'
  const guestCount =
    typeof event.guest_count === 'number' && event.guest_count > 0
      ? `${event.guest_count} guests`
      : null

  return (
    <article
      className={`rounded-xl border bg-stone-900/80 p-4 shadow-sm ${
        isToday ? 'border-amber-600/60 ring-1 ring-amber-600/20' : 'border-stone-700/60'
      }`}
    >
      <div className="flex gap-3">
        {photoUrl ? (
          <Link
            href={`/events/${event.id}`}
            className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={title} className="h-full w-full object-cover" />
          </Link>
        ) : (
          <Link
            href={`/events/${event.id}`}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-500"
            aria-label={`Open ${title}`}
          >
            <Calendar className="h-6 w-6" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isToday && (
              <Badge variant="warning" className="px-2 py-0.5 text-[11px]">
                Tonight
              </Badge>
            )}
            {isSample && (
              <Badge variant="info" className="px-2 py-0.5 text-[11px]">
                Sample
              </Badge>
            )}
            <EventStatusBadge status={status} />
          </div>

          <Link
            href={`/events/${event.id}`}
            className="mt-2 block truncate text-base font-semibold text-stone-100 hover:text-brand-400"
          >
            {title}
          </Link>

          <div className="mt-2 grid gap-1 text-sm text-stone-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-stone-500" />
              <span>
                {formatMobileEventDate(event.event_date)}
                {event.serve_time ? ` at ${event.serve_time}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-stone-500" />
              <span className="truncate">
                {guestCount ? `${clientName}, ${guestCount}` : clientName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 shrink-0 text-stone-500" />
              <span>{price ?? 'Not quoted'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = ACTION_ICONS[action.id]
          return (
            <Button
              key={action.id}
              href={action.href}
              size="sm"
              variant={action.variant}
              className="min-w-[76px] flex-1"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          )
        })}
      </div>
    </article>
  )
}
