// Trial Banner - Server Component
// Fetches subscription status for the current chef and renders a soft warning
// banner when the trial is expiring (≤3 days) or has expired.
// Renders nothing for: grandfathered chefs, active subscribers, comped chefs,
// VIP/Admin/Owner users, and trials with more than 3 days remaining.
// Never crashes the layout - errors are swallowed.

import { getSubscriptionStatus } from '@/lib/stripe/subscription'
import { hasProAccess } from '@/lib/billing/tier'
import { TrialBannerClient } from './trial-banner-client'

export async function TrialBanner({ chefId }: { chefId: string }) {
  let status
  try {
    status = await getSubscriptionStatus(chefId)
  } catch {
    // Non-blocking - a billing lookup failure must never break the chef portal
    return null
  }

  if (status.isGrandfathered) return null
  if (status.isActive) return null

  // VIP/Admin/Owner bypass: they have pro access via platform_admins even
  // if subscription_status is null. Don't show them a trial banner.
  const hasPro = await hasProAccess(chefId).catch(() => false)
  if (hasPro) return null

  // Trial with >3 days left: no banner yet
  if (status.isTrial && !status.isTrialExpiring) return null

  const type: 'expiring' | 'expired' = status.isExpired ? 'expired' : 'expiring'

  return <TrialBannerClient type={type} daysLeft={status.daysRemaining} />
}
