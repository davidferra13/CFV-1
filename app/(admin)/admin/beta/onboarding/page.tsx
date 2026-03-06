// Admin Beta Onboarding Management
// View all beta testers, their checklist progress, enroll/unenroll clients.

import { requireAdmin } from '@/lib/auth/admin'
import type { Metadata } from 'next'
import { getBetaTesters } from '@/lib/beta/onboarding-actions'
import { BetaOnboardingAdmin } from './beta-onboarding-admin'

export const metadata: Metadata = { title: 'Beta Onboarding - Admin' }

export default async function AdminBetaOnboardingPage() {
  await requireAdmin()

  let testers = await getBetaTesters().catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Beta Onboarding</h1>
        <p className="text-slate-400 text-sm mt-1">
          Track beta tester progress through the onboarding checklist. See who needs a nudge.
        </p>
      </div>

      <BetaOnboardingAdmin testers={testers} />
    </div>
  )
}
