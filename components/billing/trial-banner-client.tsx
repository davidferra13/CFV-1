'use client'

// Trial Banner UI - NEUTRALIZED.
// All features are now free. This component renders nothing.
// Retained so any parent that renders <TrialBanner> still compiles.

type Props = {
  type: 'expiring' | 'expired'
  daysLeft: number | null
}

export function TrialBannerClient(_props: Props) {
  // All features are free - no trial banner needed
  return null
}
