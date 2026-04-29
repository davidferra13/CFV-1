// Calls & Meetings - list view
// All calls grouped by upcoming vs. past, with status/type filter tabs.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Phone } from '@/components/ui/icons'
import { getCalls, type CallType } from '@/lib/calls/actions'
import { getCallIntelligenceSnapshot } from '@/lib/calls/intelligence-actions'
import { CallCard } from '@/components/calls/call-card'
import { CallIntelligencePanel } from '@/components/calls/call-intelligence-panel'

export const metadata: Metadata = { title: 'Calls & Meetings' }

type Props = {
  searchParams: { status?: string; type?: string }
}

export default async function CallsPage({ searchParams }: Props) {
  const statusFilter = searchParams.status
  const typeFilter = searchParams.type

  // Fetch upcoming + past in parallel
  const [upcoming, past, intelligence] = await Promise.all([
    getCalls({
      status: ['scheduled', 'confirmed'],
      ...(typeFilter ? { call_type: typeFilter as CallType } : {}),
    }),
    getCalls({
      status:
        statusFilter === 'no_show'
          ? 'no_show'
          : statusFilter === 'cancelled'
            ? 'cancelled'
            : 'completed',
      ...(typeFilter ? { call_type: typeFilter as CallType } : {}),
      limit: 50,
    }),
    getCallIntelligenceSnapshot(),
  ])

  const showAll = !statusFilter || statusFilter === 'all'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            <Phone className="w-6 h-6 text-brand-500" />
            Calls & Meetings
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Schedule, prep, and log outcomes for every call you have.
          </p>
        </div>
        <Link
          href="/calls/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule call
        </Link>
      </div>

      <CallIntelligencePanel snapshot={intelligence.snapshot} />

      {/* Status filter tabs */}
      <div className="overflow-x-auto border-b border-stone-700">
        <div className="flex w-max min-w-full gap-1 text-sm">
          {[
            { label: 'All', href: '/calls' },
            { label: 'Upcoming', href: '/calls?status=scheduled' },
            { label: 'Completed', href: '/calls?status=completed' },
            { label: 'No-show', href: '/calls?status=no_show' },
            { label: 'Cancelled', href: '/calls?status=cancelled' },
          ].map((tab) => {
            const isActive =
              (!statusFilter && tab.href === '/calls') ||
              (statusFilter && tab.href.includes(statusFilter))
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`whitespace-nowrap px-3 py-2 border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-brand-600 text-brand-400 font-medium'
                    : 'border-transparent text-stone-500 hover:text-stone-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Upcoming section */}
      {(showAll || statusFilter === 'scheduled') && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-10 bg-stone-900 rounded-xl border border-dashed border-stone-700">
              <Phone className="w-8 h-8 text-stone-600 mx-auto mb-2" />
              <p className="text-sm text-stone-500">No upcoming calls scheduled</p>
              <Link
                href="/calls/new"
                className="mt-2 inline-block text-sm text-brand-600 hover:underline"
              >
                Schedule one now
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((call) => (
                <CallCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Past section */}
      {(showAll || ['completed', 'no_show', 'cancelled'].includes(statusFilter ?? '')) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">
            Past ({past.length})
          </h2>
          {past.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="h-8 w-8 mx-auto text-stone-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
              <p className="text-sm text-stone-500">No past calls yet</p>
              <p className="text-xs text-stone-600 mt-1">
                Completed and missed calls will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((call) => (
                <CallCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
