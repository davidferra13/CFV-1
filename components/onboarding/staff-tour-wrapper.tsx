// StaffTourWrapper - Server component that loads tour progress
// and passes it to the client-side TourShell.

import { getTourProgress } from '@/lib/onboarding/tour-actions'
import { STAFF_TOUR } from '@/lib/onboarding/tour-config'
import { TourShell } from './tour-shell'
import type { ReactNode } from 'react'

export async function StaffTourWrapper({ children }: { children: ReactNode }) {
  const progress = await getTourProgress().catch(() => ({
    completedSteps: [],
    welcomeSeenAt: null,
    checklistDismissedAt: null,
    tourDismissedAt: null,
  }))

  return (
    <TourShell config={STAFF_TOUR} initialProgress={progress}>
      {children}
    </TourShell>
  )
}
