// Calls & Meetings — list view
// All calls grouped by upcoming vs. past, with status/type filter tabs.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Phone } from 'lucide-react'
import { getCalls, type CallType } from '@/lib/calls/actions'
import { CallCard } from '@/components/calls/call-card'

export const metadata: Metadata = { title: 'Calls & Meetings - ChefFlow' }

type Props = {
  searchParams: { status?: string; type?: string }
}

export default async function CallsPage({ searchParams }: Props) {
  const statusFilter = searchParams.status
  const typeFilter = searchParams.type

  // Fetch upcoming + past in parallel
  const [upcoming, past] = await Promise.all([
    getCalls({
      status: ['scheduled', 'confirmed'],
      ...(typeFilter ? { call_type: typeFilter as CallType } : {}),
    }),
    getCalls({
      status: statusFilter === 'no_show' ? 'no_show'
             : statusFilter === 'cancelled' ? 'cancelled'
             : 'completed',
      ...(typeFilter ? { call_type: typeFilter as CallType } : {}),
      limit: 50,
    }),
  ])

  const showAll = !statusFilter || statusFilter === 'all'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-6 h-6 text-blue-500" />
            Calls & Meetings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule, prep, and log outcomes for every call you have.
          </p>
        </div>
        <Link
          href="/calls/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule call
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 text-sm border-b border-gray-200">
        {[
          { label: 'All', href: '/calls' },
          { label: 'Upcoming', href: '/calls?status=scheduled' },
          { label: 'Completed', href: '/calls?status=completed' },
          { label: 'No-show', href: '/calls?status=no_show' },
          { label: 'Cancelled', href: '/calls?status=cancelled' },
        ].map(tab => {
          const isActive =
            (!statusFilter && tab.href === '/calls') ||
            (statusFilter && tab.href.includes(statusFilter))
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`px-3 py-2 border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Upcoming section */}
      {(showAll || statusFilter === 'scheduled') && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No upcoming calls scheduled</p>
              <Link
                href="/calls/new"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                Schedule one now
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(call => (
                <CallCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Past section */}
      {(showAll || ['completed', 'no_show', 'cancelled'].includes(statusFilter ?? '')) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Past ({past.length})
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No past calls yet</p>
          ) : (
            <div className="space-y-2">
              {past.map(call => (
                <CallCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
