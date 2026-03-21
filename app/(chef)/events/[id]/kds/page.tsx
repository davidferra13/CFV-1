// Kitchen Display System - Live service course tracker
// Shows courses and their status during active service for the event.
// Mobile-optimized: large touch targets, fullscreen toggle, voice commands.

import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getServiceCourses } from '@/lib/operations/kds-actions'
import { KDSView } from '@/components/operations/kds-view'

export const metadata: Metadata = { title: 'Kitchen Display - ChefFlow' }

// Mobile standalone viewport for KDS (prevents accidental zoom while cooking)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function KDSPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  let rawCourses: Awaited<ReturnType<typeof getServiceCourses>> = []
  try {
    rawCourses = await getServiceCourses(params.id)
  } catch {
    rawCourses = []
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link
            href={`/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            &larr; Back to Event
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Kitchen Display</h1>
          <p className="text-stone-400 mt-1">
            Track course readiness and plating status during live service.
          </p>
        </div>
      </div>

      <KDSView
        eventId={params.id}
        courses={rawCourses.map((c) => ({
          id: c.id,
          courseName: c.courseName,
          courseNumber: c.courseNumber,
          status: c.status,
          firedAt: c.firedAt,
          servedAt: c.servedAt,
        }))}
      />
    </div>
  )
}
