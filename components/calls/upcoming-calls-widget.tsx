// UpcomingCallsWidget — dashboard widget showing next N calls

import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Phone, Plus, ArrowRight } from 'lucide-react'
import type { ScheduledCall } from '@/lib/calls/actions'
import { callTypeLabel } from './call-type-badge'

function getContactLabel(call: ScheduledCall): string {
  if (call.client) return call.client.full_name
  if (call.contact_name) return call.contact_name
  if (call.contact_company) return call.contact_company
  return 'Unknown contact'
}

export function UpcomingCallsWidget({ calls }: { calls: ScheduledCall[] }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm text-gray-900">Upcoming Calls</h3>
        </div>
        <Link
          href="/calls/new"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule
        </Link>
      </div>

      {calls.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No upcoming calls</p>
          <Link
            href="/calls/new"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Schedule your first call
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {calls.map(call => (
            <li key={call.id}>
              <Link
                href={`/calls/${call.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
              >
                {/* Time bubble */}
                <div className="flex-shrink-0 text-center min-w-[44px]">
                  <p className="text-xs font-semibold text-blue-600">
                    {format(new Date(call.scheduled_at), 'MMM d')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(call.scheduled_at), 'h:mm a')}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getContactLabel(call)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {callTypeLabel(call.call_type)} · {call.duration_minutes}min ·{' '}
                    <span className="text-gray-400">
                      {formatDistanceToNow(new Date(call.scheduled_at), { addSuffix: true })}
                    </span>
                  </p>
                </div>

                {/* Agenda progress */}
                {call.agenda_items.length > 0 && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs text-gray-400">
                      {call.agenda_items.filter(i => i.completed).length}/{call.agenda_items.length}
                    </span>
                  </div>
                )}

                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {calls.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-50">
          <Link
            href="/calls"
            className="text-xs text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            View all calls <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
