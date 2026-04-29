import type { Metadata } from 'next'
import Link from 'next/link'
import { StationRealtimeData } from './realtime-data'

export const metadata: Metadata = { title: 'Station Coordination' }

export default async function StationCoordinationPage() {
  const today = new Date()

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Station Coordination</h1>
          <p className="text-sm text-stone-500">
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/stations/daily-ops" className="text-sm text-stone-500 hover:text-stone-300">
            Daily Ops
          </Link>
          <Link href="/ops" className="text-sm text-stone-500 hover:text-stone-300">
            Back to Ops
          </Link>
        </div>
      </div>

      <StationRealtimeData />
    </div>
  )
}
