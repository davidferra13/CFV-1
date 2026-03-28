// ChefTourWrapper - Server component that loads tour progress
// and passes it to the client-side TourShell.

import { getTourProgress } from '@/lib/onboarding/tour-actions'
import { CHEF_TOUR } from '@/lib/onboarding/tour-config'
import { TourShell } from './tour-shell'
import type { ReactNode } from 'react'

export async function ChefTourWrapper({ children }: { children: ReactNode }) {
  // Fail closed: if DB is down, assume everything is dismissed
  // so we don't re-show the welcome modal to returning users
  const progress = await getTourProgress().catch((err) => {
    console.error('[chef-tour] Failed to load tour progress', err)
    return {
      completedSteps: [],
      welcomeSeenAt: new Date().toISOString(),
      checklistDismissedAt: new Date().toISOString(),
      tourDismissedAt: new Date().toISOString(),
    }
  })

  return (
    <TourShell config={CHEF_TOUR} initialProgress={progress}>
      {children}
    </TourShell>
  )
}
