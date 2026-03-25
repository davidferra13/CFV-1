'use client'

// TourShell - Assembles all onboarding tour components.
// Drop this into a layout to enable the full onboarding experience:
// welcome modal + floating checklist + spotlight tour.
// Wrapped in OverlayQueueProvider so only one overlay shows at a time.

import { OnboardingTourProvider } from './tour-provider'
import { WelcomeModal } from './welcome-modal'
import { TourChecklist } from './tour-checklist'
import { TourSpotlight } from './tour-spotlight'
import { OverlayQueueProvider } from '@/lib/overlay/overlay-queue'
import type { TourConfig } from '@/lib/onboarding/tour-config'
import type { TourProgress } from '@/lib/onboarding/tour-actions'
import type { ReactNode } from 'react'

type TourShellProps = {
  config: TourConfig
  initialProgress: TourProgress
  children: ReactNode
}

export function TourShell({ config, initialProgress, children }: TourShellProps) {
  return (
    <OverlayQueueProvider>
      <OnboardingTourProvider config={config} initialProgress={initialProgress}>
        {children}
        <WelcomeModal />
        <TourChecklist />
        <TourSpotlight />
      </OnboardingTourProvider>
    </OverlayQueueProvider>
  )
}
