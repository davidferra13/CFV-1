// Create a new dinner event - stub + hub group

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { CreateEventForm } from '@/components/hub/create-event-form'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Plan a Dinner' }

export default async function CreateDinnerPage() {
  await requireClient()
  const profileToken = await getClientProfileToken()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/my-hub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Hub
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-100">Plan a Dinner</h1>
        <p className="mt-1 text-stone-400">
          Set up the basics, then invite friends to your group to plan together
        </p>
      </div>

      <CreateEventForm profileToken={profileToken} />

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
