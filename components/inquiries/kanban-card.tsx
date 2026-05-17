// KanbanCard - A single inquiry card for the kanban board view
'use client'

import { useRouter } from 'next/navigation'
import { differenceInDays, format } from 'date-fns'
import { Calendar, Users, Tag, Clock, DollarSign } from '@/components/ui/icons'

export interface KanbanCardInquiry {
  id: string
  status: string
  client_name?: string
  occasion?: string
  event_date?: string
  guest_count?: number
  budget_cents?: number
  updated_at?: string
  created_at: string
}

interface KanbanCardProps {
  inquiry: KanbanCardInquiry
}

// Left border color per status
const STATUS_BORDER: Record<string, string> = {
  new: 'border-l-amber-500',
  awaiting_chef: 'border-l-stone-400',
  awaiting_response: 'border-l-stone-400',
  awaiting_client: 'border-l-brand-400',
  quoted: 'border-l-brand-500',
  confirmed: 'border-l-emerald-500',
  declined: 'border-l-red-400',
  expired: 'border-l-red-300',
}

function getStatusBorder(status: string): string {
  return STATUS_BORDER[status] ?? 'border-l-stone-300'
}

export function KanbanCard({ inquiry }: KanbanCardProps) {
  const router = useRouter()
  const borderClass = getStatusBorder(inquiry.status)

  const formattedDate = inquiry.event_date
    ? format(new Date(inquiry.event_date), 'MMM d, yyyy')
    : null

  // Stuck indicator: days since last update
  const daysSinceUpdate = inquiry.updated_at
    ? differenceInDays(new Date(), new Date(inquiry.updated_at))
    : null
  const isStuck = daysSinceUpdate !== null && daysSinceUpdate >= 7
  const isSlowing = daysSinceUpdate !== null && daysSinceUpdate >= 4 && daysSinceUpdate < 7

  const stuckClass = isStuck ? 'bg-red-950' : isSlowing ? 'bg-amber-950' : 'bg-stone-900'

  const budgetFormatted = inquiry.budget_cents
    ? `$${(inquiry.budget_cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : null

  return (
    <button
      type="button"
      onClick={() => router.push(`/inquiries/${inquiry.id}`)}
      className={`w-full text-left ${stuckClass} rounded-lg border border-stone-700 border-l-4 ${borderClass} shadow-sm hover:shadow-md hover:border-stone-600 transition-all duration-150 p-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
    >
      {/* Client name + stuck badge - primary, loudest */}
      <div className="flex items-start justify-between gap-1">
        <p className="font-bold text-stone-50 text-sm leading-snug truncate flex-1">
          {inquiry.client_name || 'Unknown Lead'}
        </p>
        {isStuck && (
          <span className="shrink-0 text-xxs font-semibold text-red-400 bg-red-950 ring-1 ring-inset ring-red-800 px-1.5 py-0.5 rounded">
            {daysSinceUpdate}d
          </span>
        )}
        {isSlowing && !isStuck && (
          <span className="shrink-0 text-xxs font-semibold text-amber-400 bg-amber-950 ring-1 ring-inset ring-amber-800 px-1.5 py-0.5 rounded">
            {daysSinceUpdate}d
          </span>
        )}
      </div>

      {/* Budget - key metric, visually prominent */}
      {budgetFormatted && (
        <div className="flex items-center gap-0.5 mt-1 text-sm font-semibold text-emerald-400">
          <DollarSign className="h-3.5 w-3.5 shrink-0" />
          <span>{budgetFormatted.replace('$', '')}</span>
        </div>
      )}

      {/* Occasion - secondary info */}
      {inquiry.occasion && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-stone-400">
          <Tag className="h-3 w-3 shrink-0" />
          <span className="truncate">{inquiry.occasion}</span>
        </div>
      )}

      {/* Event date - metadata, muted */}
      {formattedDate && (
        <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{formattedDate}</span>
        </div>
      )}

      {/* Guest count - metadata, muted */}
      {inquiry.guest_count != null && (
        <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
          <Users className="h-3 w-3 shrink-0" />
          <span>{inquiry.guest_count} guests</span>
        </div>
      )}

      {/* Stuck label for severely overdue - danger callout */}
      {isStuck && daysSinceUpdate !== null && daysSinceUpdate >= 14 && (
        <div className="flex items-center gap-1 mt-1.5 text-xs font-medium text-red-400">
          <Clock className="h-3 w-3 shrink-0" />
          <span>Stuck - no movement in {daysSinceUpdate} days</span>
        </div>
      )}
    </button>
  )
}
