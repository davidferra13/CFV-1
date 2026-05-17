// Dashboard Onboarding Zone - banner, profile warning, checklist, getting started
// Self-contained server component moved from page.tsx during decomposition.

import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getCachedIsPrivileged } from '@/lib/chef/layout-data-cache'
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner'
import { OnboardingChecklistWidget } from '@/components/dashboard/onboarding-checklist-widget'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getTenantDataPresence } from '@/lib/progressive-disclosure/tenant-data-presence'
import { isBrandNewChef } from '@/lib/progressive-disclosure/nav-visibility'
import { GettingStartedSection } from '@/components/dashboard/getting-started-section'
import { getWorkspaceDensity } from '@/lib/chef/preferences-actions'
import { createServerClient } from '@/lib/db/server'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Onboarding] ${label} failed:`, err)
    return fallback
  }
}

export async function OnboardingZone() {
  const user = await requireChef()
  const [onboardingProgress, presence, userIsPrivileged, workspaceDensity, profileGated] =
    await Promise.all([
      safe('onboardingProgress', () => getOnboardingProgress(), null),
      safe('presence', () => getTenantDataPresence(user.tenantId!), null),
      safe('privilegedAccess', () => getCachedIsPrivileged(user.id), false),
      safe('workspaceDensity', getWorkspaceDensity, 'standard' as const),
      safe(
        'profileGated',
        async () => {
          const db: any = createServerClient()
          const { data } = await db
            .from('chefs')
            .select('bio, tagline, display_name, slug')
            .eq('id', user.tenantId)
            .single()
          if (!data?.slug) return false
          const isEmailPrefix =
            data.display_name?.includes('@') || /^[a-z0-9]+$/i.test(data.display_name?.trim() || '')
          return !(data.bio || data.tagline) || isEmailPrefix
        },
        false
      ),
    ])

  const isNewChef = presence ? isBrandNewChef(presence) : false
  const bypassProgressiveDisclosure = userIsPrivileged || process.env.DEMO_MODE_ENABLED === 'true'
  const simplifyForNewChef = isNewChef && !bypassProgressiveDisclosure
  const isMinimalDensity = workspaceDensity === 'minimal'

  return (
    <>
      <OnboardingBanner />
      {!isMinimalDensity && profileGated && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-300">
            Your public profile is hidden because it&apos;s missing a bio or tagline.
          </p>
          <Link
            href="/settings/my-profile"
            className="text-sm font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap"
          >
            Complete Profile &rarr;
          </Link>
        </div>
      )}
      {!isMinimalDensity && onboardingProgress && (
        <OnboardingChecklistWidget progress={onboardingProgress} />
      )}
      {!isMinimalDensity && presence && simplifyForNewChef && (
        <GettingStartedSection presence={presence} />
      )}
    </>
  )
}
