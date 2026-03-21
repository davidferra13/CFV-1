// CallCard - compact card for the calls list view

'use client'

import Link from 'next/link'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { Phone, Clock, User, ChevronRight, AlertCircle } from '@/components/ui/icons'
import type { ScheduledCall } from '@/lib/calls/actions'
import { CallTypeBadge } from './call-type-badge'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-brand-600',
  confirmed: 'text-emerald-600',
  completed: 'text-gray-500',
  no_show: 'text-red-500',
  cancelled: 'text-gray-400',
}

function getContactLabel(call: ScheduledCall): string {
  if (call.client) return call.client.full_name
  if (call.contact_name) return call.contact_name
  if (call.contact_company) return call.contact_company
  return 'Unknown contact'
}

function getCallTitle(call: ScheduledCall): string {
  if (call.title) return call.title
  const contact = getContactLabel(call)
  const typeLabel = call.call_type.replace(/_/g, ' ')
  return `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} with ${contact}`
}

export function CallCard({ call }: { call: ScheduledCall }) {
  const isOverdue = isPast(new Date(call.scheduled_at)) && call.status === 'scheduled'
  const isTerminal =
    call.status === 'completed' || call.status === 'cancelled' || call.status === 'no_show'

  return (
    <Link href={`/calls/${call.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-stone-900 hover:bg-stone-800 transition-colors group">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isTerminal ? 'bg-stone-800' : 'bg-brand-950'}`}
        >
          <Phone className={`w-4 h-4 ${isTerminal ? 'text-stone-500' : 'text-brand-500'}`} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-sm text-stone-100 truncate">
              {getCallTitle(call)}
            </span>
            <CallTypeBadge type={call.call_type} />
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" /> Overdue
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
            {/* Date/time */}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isTerminal
                ? format(new Date(call.scheduled_at), 'MMM d, yyyy h:mm a')
                : formatDistanceToNow(new Date(call.scheduled_at), { addSuffix: true })}
            </span>

            {/* Duration */}
            <span>{call.duration_minutes}min</span>

            {/* Contact */}
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {getContactLabel(call)}
            </span>

            {/* Status */}
            <span className={`capitalize ${STATUS_COLORS[call.status] ?? ''}`}>
              {call.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Agenda progress (non-terminal) */}
        {!isTerminal && call.agenda_items.length > 0 && (
          <div className="flex-shrink-0 text-right hidden sm:block">
            <p className="text-xs text-stone-500">
              {call.agenda_items.filter((i) => i.completed).length}/{call.agenda_items.length} prep
              items
            </p>
          </div>
        )}

        <ChevronRight className="w-4 h-4 text-stone-600 flex-shrink-0 group-hover:text-stone-400 transition-colors" />
      </div>
    </Link>
  )
}
