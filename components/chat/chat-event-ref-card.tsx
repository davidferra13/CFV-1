'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { UtensilsCrossed, Users, Calendar } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'

interface ChatEventRefCardProps {
  eventId: string
  eventDate?: string
  occasion?: string
  status?: string
  guestCount?: number
  isChef?: boolean
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  proposed: 'info',
  accepted: 'info',
  paid: 'success',
  confirmed: 'success',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
}

export function ChatEventRefCard({
  eventId,
  eventDate,
  occasion,
  status,
  guestCount,
  isChef = true,
}: ChatEventRefCardProps) {
  const href = isChef ? `/events/${eventId}` : `/my-events/${eventId}`

  return (
    <Link
      href={href}
      className="block border border-stone-200 rounded-lg p-3 mt-1 hover:bg-stone-50 transition-colors max-w-[280px]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <UtensilsCrossed className="w-4 h-4 text-brand-600" />
        <span className="text-sm font-medium text-stone-800 truncate">{occasion || 'Event'}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-stone-500">
        {eventDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(eventDate), 'MMM d, yyyy')}
          </span>
        )}
        {guestCount != null && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {guestCount} guests
          </span>
        )}
      </div>
      {status && (
        <div className="mt-2">
          <Badge variant={STATUS_VARIANTS[status] || 'default'}>{status.replace('_', ' ')}</Badge>
        </div>
      )}
    </Link>
  )
}
