// Service Day Live - Real-time visibility into chef prep and service progress
// Clients see milestones as the chef moves through shopping, prep, travel, service.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getServiceDayStatus } from '@/lib/events/service-day-live-actions'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { ServiceDayTimeline } from './service-day-timeline'

export const metadata: Metadata = { title: 'Service Day Live' }

export default async function ServiceDayLivePage({ params }: { params: { id: string } }) {
  await requireClient()

  const status = await getServiceDayStatus(params.id)

  if (!status) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link
          href={`/my-events/${params.id}`}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Event
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Service Day Live</h1>
        <p className="text-stone-400 mt-1">
          {status.eventName} &middot; {format(new Date(status.eventDate), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Timeline */}
      <ServiceDayTimeline milestones={status.milestones} lastUpdatedAt={status.lastUpdatedAt} />
    </div>
  )
}
