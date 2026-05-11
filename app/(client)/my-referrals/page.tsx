import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyReferrals, getReferralStats } from '@/lib/referrals/client-referral-actions'
import { ReferralsClient } from './referrals-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Referrals' }

export default async function MyReferralsPage() {
  await requireClient()
  const [referrals, stats] = await Promise.all([getMyReferrals(), getReferralStats()])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Referrals</h1>
        <p className="text-stone-400 mt-1">Invite friends and earn rewards when they book.</p>
      </div>
      <ReferralsClient referrals={referrals} stats={stats} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
