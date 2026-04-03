'use client'

import { CookieConsent } from '@/components/ui/cookie-consent'
import { SwRegister } from '@/components/pwa/sw-register'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { PerformanceTelemetry } from '@/components/analytics/performance-telemetry'
import { GlobalTooltipProvider } from '@/components/ui/global-tooltip-provider'

export function DeferredRootRuntime() {
  return (
    <>
      <PostHogProvider />
      <PerformanceTelemetry />
      <GlobalTooltipProvider />
      <CookieConsent />
      <SwRegister />
    </>
  )
}
