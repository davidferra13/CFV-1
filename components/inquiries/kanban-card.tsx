// KanbanCard — A single inquiry card for the kanban board view
'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, Users, Tag } from 'lucide-react'

export interface KanbanCardInquiry {
  id: string
  status: string
  client_name?: string
  occasion?: string
  event_date?: string
  guest_count?: number
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
  awaiting_client: 'border-l-sky-400',
  quoted: 'border-l-sky-500',
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

  return (
    <button
      type="button"
      onClick={() => router.push(`/inquiries/${inquiry.id}`)}
      className={`w-full text-left bg-white rounded-lg border border-stone-200 border-l-4 ${borderClass} shadow-sm hover:shadow-md hover:border-stone-300 transition-all duration-150 p-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
    >
      {/* Client name */}
      <p className="font-semibold text-stone-900 text-sm leading-snug truncate">
        {inquiry.client_name || 'Unknown Lead'}
      </p>

      {/* Occasion */}
      {inquiry.occasion && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-stone-500">
          <Tag className="h-3 w-3 shrink-0" />
          <span className="truncate">{inquiry.occasion}</span>
        </div>
      )}

      {/* Event date */}
      {formattedDate && (
        <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{formattedDate}</span>
        </div>
      )}

      {/* Guest count */}
      {inquiry.guest_count != null && (
        <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
          <Users className="h-3 w-3 shrink-0" />
          <span>{inquiry.guest_count} guests</span>
        </div>
      )}
    </button>
  )
}
