'use client'

import dynamic from 'next/dynamic'
import { CookieConsent } from '@/components/ui/cookie-consent'
import { SwRegister } from '@/components/pwa/sw-register'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { PerformanceTelemetry } from '@/components/analytics/performance-telemetry'
import { GlobalTooltipProvider } from '@/components/ui/global-tooltip-provider'

const DevRefreshTelemetryPanel =
  process.env.NODE_ENV !== 'production'
    ? dynamic(
        () =>
          import('@/components/runtime/refresh-telemetry-panel').then((mod) => mod.RefreshTelemetryPanel),
        { ssr: false }
      )
    : null

export function DeferredRootRuntime() {
  return (
    <>
      <PostHogProvider />
      <PerformanceTelemetry />
      <GlobalTooltipProvider />
      <CookieConsent />
      <SwRegister />
      <InstallPrompt />
      {DevRefreshTelemetryPanel && <DevRefreshTelemetryPanel />}
    </>
  )
}
