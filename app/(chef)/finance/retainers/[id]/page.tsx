import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRetainerDetail } from '@/lib/retainers/actions'
import { Card } from '@/components/ui/card'
import { RetainerStatusBadge } from '@/components/retainers/retainer-status-badge'
import { RetainerBillingTimeline } from '@/components/retainers/retainer-billing-timeline'
import { RetainerDetailActions } from './detail-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { BILLING_CYCLE_LABELS } from '@/lib/retainers/constants'

export const metadata: Metadata = { title: 'Retainer Detail' }

export default async function RetainerDetailPage({ params }: { params: { id: string } }) {
  await requireChef()
  const retainer = await getRetainerDetail(params.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-stone-100">{retainer.name}</h1>
            <RetainerStatusBadge status={retainer.status} />
          </div>
          <p className="text-stone-500">
            {retainer.clients?.full_name || 'Unknown Client'} &middot;{' '}
            {BILLING_CYCLE_LABELS[retainer.billing_cycle] || retainer.billing_cycle} &middot;{' '}
            {formatCurrency(retainer.amount_cents)} per cycle
          </p>
        </div>
        <Link href="/finance/retainers" className="text-sm text-brand-600 hover:underline">
          Back to Retainers
        </Link>
      </div>

      {/* Action Buttons */}
      <RetainerDetailActions retainerId={retainer.id} status={retainer.status} />

      {/* Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Agreement Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Client</dt>
              <dd className="text-stone-100 font-medium">
                {retainer.clients?.full_name || 'Unknown'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Amount</dt>
              <dd className="text-stone-100 font-medium">
                {formatCurrency(retainer.amount_cents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Billing Cycle</dt>
              <dd className="text-stone-100">
                {BILLING_CYCLE_LABELS[retainer.billing_cycle] || retainer.billing_cycle}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Start Date</dt>
              <dd className="text-stone-100">
                {new Date(retainer.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">End Date</dt>
              <dd className="text-stone-100">
                {retainer.end_date
                  ? new Date(retainer.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Ongoing'}
              </dd>
            </div>
            {retainer.next_billing_date && (
              <div className="flex justify-between">
                <dt className="text-stone-500">Next Billing</dt>
                <dd className="text-stone-100">
                  {new Date(retainer.next_billing_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {retainer.includes_events_count != null && (
              <div className="flex justify-between">
                <dt className="text-stone-500">Included Events</dt>
                <dd className="text-stone-100">{retainer.includes_events_count} per period</dd>
              </div>
            )}
            {retainer.includes_hours != null && (
              <div className="flex justify-between">
                <dt className="text-stone-500">Included Hours</dt>
                <dd className="text-stone-100">{retainer.includes_hours} per period</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Terms / Notes Card */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Notes & Terms</h2>
          {retainer.terms_summary ? (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-stone-400 mb-1">Terms Summary</h3>
              <pre className="whitespace-pre-wrap text-sm text-stone-300 bg-stone-800 rounded-lg p-3">
                {retainer.terms_summary}
              </pre>
            </div>
          ) : null}
          {retainer.notes ? (
            <div>
              <h3 className="text-sm font-medium text-stone-400 mb-1">Internal Notes</h3>
              <pre className="whitespace-pre-wrap text-sm text-stone-300 bg-stone-800 rounded-lg p-3">
                {retainer.notes}
              </pre>
            </div>
          ) : null}
          {!retainer.terms_summary && !retainer.notes && (
            <p className="text-sm text-stone-400">No notes or terms added.</p>
          )}
        </Card>
      </div>

      {/* Billing Timeline */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Billing Periods</h2>
        <RetainerBillingTimeline periods={retainer.periods || []} retainerId={retainer.id} />
      </div>

      {/* Linked Events */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Linked Events</h2>
        {retainer.linked_events && retainer.linked_events.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-800/60">
                    <th className="text-left py-3 px-4 font-medium text-stone-400">Event</th>
                    <th className="text-left py-3 px-4 font-medium text-stone-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-stone-400">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-stone-400">Guests</th>
                  </tr>
                </thead>
                <tbody>
                  {retainer.linked_events.map((event: any) => (
                    <tr key={event.id} className="border-b border-stone-50 hover:bg-stone-800/40">
                      <td className="py-3 px-4">
                        <Link
                          href={`/events/${event.id}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {event.occasion || 'Untitled Event'}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-stone-400">
                        {event.event_date
                          ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '\u2014'}
                      </td>
                      <td className="py-3 px-4 text-stone-400 capitalize">{event.status}</td>
                      <td className="py-3 px-4 text-right text-stone-400">
                        {event.guest_count ?? '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-stone-500">
              No events linked to this retainer yet. Events can be linked from the event detail
              page.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
