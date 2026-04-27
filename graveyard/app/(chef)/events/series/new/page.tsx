import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { SeriesFormClient } from './series-form-client'

export const metadata: Metadata = { title: 'New Series' }

export default async function NewSeriesPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Event Series</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Group recurring or themed dinners under one series for consolidated tracking.
        </p>
      </div>
      <SeriesFormClient />
    </div>
  )
}
