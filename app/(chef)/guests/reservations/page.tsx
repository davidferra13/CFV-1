// Guest Reservations & Waitlist Page
// Full reservation management with walk-in waitlist.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { ReservationManager } from '@/components/guests/reservation-manager'
import { WaitlistPanel } from '@/components/guests/waitlist-panel'
import { ReservationPageTabs } from './tabs'

export const metadata: Metadata = { title: 'Reservations & Waitlist - ChefFlow' }

export default async function ReservationsPage() {
  await requireChef()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/guests" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Back to Guest Directory
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Reservations & Waitlist</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage reservations and walk-in guests. Guest notes and comps are visible at check-in.
        </p>
      </div>

      <ReservationPageTabs
        reservationsPanel={<ReservationManager />}
        waitlistPanel={<WaitlistPanel />}
      />
    </div>
  )
}
