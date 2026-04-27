// Waitlist Management Page
// Chef views and manages clients waiting for a specific date.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import Link from 'next/link'
import {
  getWaitlistEntries,
  contactWaitlistEntry,
  expireWaitlistEntry,
} from '@/lib/availability/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { WaitlistAddForm } from './waitlist-add-form'

export const metadata: Metadata = { title: 'Waitlist' }

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'warning' | 'success' | 'error' }
> = {
  waiting: { label: 'Waiting', variant: 'warning' },
  contacted: { label: 'Contacted', variant: 'info' as 'default' },
  converted: { label: 'Converted', variant: 'success' },
  expired: { label: 'Expired', variant: 'default' },
}

export default async function WaitlistPage() {
  await requireChef()

  const [waiting, contacted] = await Promise.all([
    getWaitlistEntries('waiting'),
    getWaitlistEntries('contacted'),
  ])

  const all = [...waiting, ...contacted]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Waitlist</h1>
        <p className="mt-1 text-sm text-stone-500">
          Clients waiting for a date to open. Contact them when availability changes.
        </p>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-10 bg-stone-900 rounded-xl border border-dashed border-stone-700">
          <svg className="w-8 h-8 text-stone-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-sm font-medium text-stone-400">Your waitlist is clear</p>
          <p className="text-xs text-stone-600 mt-1">Clients added to the waitlist will appear here when dates fill up</p>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map((entry) => {
            const cfg = STATUS_BADGE[entry.status] ?? STATUS_BADGE.waiting
            const client = (entry as any).clients
            return (
              <Card key={entry.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-100">
                          {client?.full_name ?? 'Unknown client'}
                        </span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-stone-400">
                        {format(
                          new Date(
                            dateToDateString(entry.requested_date as Date | string) + 'T00:00:00'
                          ),
                          'MMM d, yyyy'
                        )}
                        {entry.requested_date_end
                          ? ` – ${format(new Date(dateToDateString(entry.requested_date_end as Date | string) + 'T00:00:00'), 'MMM d')}`
                          : ''}
                        {entry.occasion ? ` · ${entry.occasion}` : ''}
                        {entry.guest_count_estimate
                          ? ` · ${entry.guest_count_estimate} guests`
                          : ''}
                      </p>
                      {entry.notes && (
                        <p className="mt-0.5 text-xs text-stone-400">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {entry.status === 'waiting' && (
                        <form
                          action={async () => {
                            'use server'
                            await contactWaitlistEntry(entry.id)
                          }}
                        >
                          <Button type="submit" size="sm" variant="secondary">
                            Mark Contacted
                          </Button>
                        </form>
                      )}
                      <Link
                        href={`/events/new?${new URLSearchParams({
                          ...(entry.client_id ? { client_id: entry.client_id } : {}),
                          ...(entry.requested_date ? { date: entry.requested_date } : {}),
                          ...(entry.occasion ? { occasion: entry.occasion } : {}),
                          waitlist_id: entry.id,
                        }).toString()}`}
                      >
                        <Button type="button" size="sm" variant="primary">
                          Create Event
                        </Button>
                      </Link>
                      <form
                        action={async () => {
                          'use server'
                          await expireWaitlistEntry(entry.id)
                        }}
                      >
                        <Button type="submit" size="sm" variant="ghost" className="text-stone-400">
                          Expire
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <h2 className="text-base font-semibold text-stone-100 mb-3">Add to Waitlist</h2>
          <WaitlistAddForm />
        </CardContent>
      </Card>
    </div>
  )
}
