// Guest Profile — Full guest detail with tags, comps, visits, reservations
// Part of the Guest CRM System

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getGuest, deleteGuest } from '@/lib/guests/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GuestForm } from '@/components/guests/guest-form'
import { GuestTags } from '@/components/guests/guest-tags'
import { GuestCompPanel } from '@/components/guests/guest-comp-panel'
import { VisitLog } from '@/components/guests/visit-log'
import { ReservationForm } from '@/components/guests/reservation-form'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Guest Profile — ChefFlow' }

export default async function GuestProfilePage({ params }: { params: { id: string } }) {
  await requireChef()
  const guest = await getGuest(params.id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/guests" className="hover:text-stone-300">
          Guests
        </Link>
        <span>/</span>
        <span className="text-stone-300">{guest.name}</span>
      </div>

      {/* Header with stats */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-100">{guest.name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-400">
                {guest.phone && (
                  <span>
                    Phone: <span className="text-stone-200">{guest.phone}</span>
                  </span>
                )}
                {guest.email && (
                  <span>
                    Email: <span className="text-stone-200">{guest.email}</span>
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Total Visits</p>
                  <p className="text-lg font-semibold text-stone-200">{guest.stats.totalVisits}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Total Spend</p>
                  <p className="text-lg font-semibold text-stone-200">
                    $
                    {(guest.stats.totalSpendCents / 100).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Avg Spend</p>
                  <p className="text-lg font-semibold text-stone-200">
                    ${(guest.stats.avgSpendCents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">First Visit</p>
                  <p className="text-sm font-medium text-stone-200">
                    {guest.stats.firstVisit || '—'}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Last: {guest.stats.lastVisit || '—'}
                  </p>
                </div>
              </div>
            </div>

            <form
              action={async () => {
                'use server'
                const { requireChef } = await import('@/lib/auth/get-user')
                const { deleteGuest } = await import('@/lib/guests/actions')
                const { redirect } = await import('next/navigation')
                await requireChef()
                await deleteGuest(params.id)
                redirect('/guests')
              }}
            >
              <Button type="submit" variant="ghost" size="sm" className="text-red-400">
                Delete
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <GuestTags guestId={guest.id} tags={guest.tags} />
        </CardContent>
      </Card>

      {/* Comps */}
      <GuestCompPanel guestId={guest.id} comps={guest.comps} />

      {/* Visits */}
      <VisitLog
        guestId={guest.id}
        visits={guest.visits}
        totalSpendCents={guest.stats.totalSpendCents}
      />

      {/* Reservations */}
      <ReservationForm
        guestId={guest.id}
        guestName={guest.name}
        reservations={guest.reservations}
      />

      {/* Notes & Edit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes &amp; Edit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {guest.notes && (
            <div className="rounded-lg bg-stone-800 px-4 py-3">
              <p className="text-sm text-stone-300 whitespace-pre-wrap">{guest.notes}</p>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-brand-400 hover:text-brand-300">
              Edit Guest Info
            </summary>
            <div className="mt-3">
              <GuestForm guest={guest} />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}
