// Availability Broadcaster
// Shows the chef's upcoming confirmed bookings (their blocked dates) and
// provides a one-stop action list to update availability on each connected
// marketplace platform. Reduces the manual work of visiting 5+ platforms
// individually after every booking.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { CalendarDays } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AvailabilityChecklist } from '@/components/availability/availability-checklist'

export const metadata: Metadata = {
  title: 'Availability Broadcaster',
}

const PLATFORMS = [
  {
    key: 'take_a_chef',
    label: 'Take a Chef',
    url: 'https://www.take-a-chef.com/chefs/dashboard',
    note: 'Go to Calendar in your dashboard',
  },
  {
    key: 'private_chef_manager',
    label: 'Private Chef Manager',
    url: 'https://www.privatechefmanager.com',
    note: 'Update your availability in your profile',
  },
  {
    key: 'bark',
    label: 'Bark',
    url: 'https://www.bark.com/en/us/pro/dashboard/',
    note: 'Update your service availability',
  },
  {
    key: 'thumbtack',
    label: 'Thumbtack',
    url: 'https://www.thumbtack.com/pro/',
    note: 'Go to Schedule in your account settings',
  },
  {
    key: 'yhangry',
    label: 'Yhangry',
    url: 'https://app.yhangry.com/chef',
    note: 'Update your availability calendar',
  },
  {
    key: 'gigsalad',
    label: 'GigSalad',
    url: 'https://app.gigsalad.com/',
    note: 'Update your availability in My Account',
  },
  {
    key: 'cozymeal',
    label: 'Cozymeal',
    url: 'https://www.cozymeal.com/chef',
    note: 'Mark dates unavailable in your calendar',
  },
  {
    key: 'theknot',
    label: 'The Knot',
    url: 'https://vendor.theknot.com/',
    note: 'Update availability via your storefront dashboard',
  },
]

async function getUpcomingBookedDates(tenantId: string) {
  const db: any = createServerClient()
  const _n = new Date()
  const today = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, '0')}-${String(_n.getDate()).padStart(2, '0')}`

  const { data } = await db
    .from('events')
    .select('id, event_date, occasion, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'in_progress'])
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(30)

  return (data ?? []) as Array<{
    id: string
    event_date: string
    occasion: string | null
    status: string
    client: { full_name: string } | null
  }>
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusVariant(status: string): 'success' | 'warning' | 'info' {
  if (status === 'confirmed' || status === 'paid') return 'success'
  if (status === 'in_progress') return 'info'
  return 'warning'
}

export default async function AvailabilityPage() {
  const user = await requireChef()
  const bookedDates = await getUpcomingBookedDates(user.tenantId!)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/dashboard" className="transition-colors hover:text-stone-300">
            Dashboard
          </Link>
          <span className="text-stone-600">/</span>
          <span className="text-stone-300">Availability</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Availability Broadcaster</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            Your confirmed bookings below are dates you need to block on each platform. Use the
            checklist to track which platforms you have updated after each new booking.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/content"
              className="inline-flex items-center rounded-md border border-stone-700 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800"
            >
              Open Content Pipeline
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming booked dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-stone-400" />
            Your confirmed dates ({bookedDates.length})
          </CardTitle>
          <p className="mt-1 text-sm text-stone-400">
            These are dates you are already booked for. Block them on every platform so you do not
            receive conflicting inquiries.
          </p>
        </CardHeader>
        <CardContent>
          {bookedDates.length === 0 ? (
            <p className="text-sm text-stone-500">
              No upcoming confirmed bookings. When you confirm events, they will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {bookedDates.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/60 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-stone-100">
                      {formatDate(event.event_date)}
                    </span>
                    {event.occasion && (
                      <span className="ml-2 text-sm text-stone-400">{event.occasion}</span>
                    )}
                    {event.client?.full_name && (
                      <span className="ml-2 text-sm text-stone-500">{event.client.full_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                    <Link
                      href={`/events/${event.id}`}
                      className="text-xs text-brand-500 hover:text-brand-400"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update availability on each platform</CardTitle>
          <p className="mt-1 text-sm text-stone-400">
            Check each platform off after you have blocked the dates above. Your progress is saved
            locally in this browser.
          </p>
        </CardHeader>
        <CardContent>
          <AvailabilityChecklist platforms={PLATFORMS} />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-4 text-sm text-stone-400">
        <p>
          <strong className="text-stone-300">Why can ChefFlow not do this automatically?</strong>{' '}
          These platforms do not expose public APIs for availability. Until they do, the fastest
          workflow is: confirm a booking in ChefFlow, open this page, and click through the list.
          Each link opens your dashboard on that platform directly.
        </p>
      </div>
    </div>
  )
}
