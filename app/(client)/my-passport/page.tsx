import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyPassport } from '@/lib/passport/client-passport-actions'
import { PassportClient } from './passport-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Passport' }

export default async function MyPassportPage() {
  await requireClient()
  const passport = await getMyPassport()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Passport</h1>
        <p className="text-stone-400 mt-1">
          Communication preferences, autonomy settings, and delegate access.
        </p>
      </div>
      <PassportClient initialPassport={passport} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
