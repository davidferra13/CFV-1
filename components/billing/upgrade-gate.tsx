// Upgrade Gate — Server Component
// Wraps Pro-only page content. If the chef is on the Free tier, shows an upgrade
// prompt instead of (or overlaid on) the children.
//
// Modes:
//   'block' (default) — Shows upgrade prompt card instead of content
//   'blur'            — Shows content blurred with upgrade prompt overlay
//   'hide'            — Renders nothing (use for optional nav sections)
//
// Usage:
//   <UpgradeGate chefId={user.entityId} featureSlug="advanced-analytics">
//     <BenchmarksPage />
//   </UpgradeGate>

import { getTierForChef } from '@/lib/billing/tier'
import { getProFeature } from '@/lib/billing/pro-features'
import { isAdmin } from '@/lib/auth/admin'
import { UpgradePrompt } from './upgrade-prompt'

type Props = {
  chefId: string
  featureSlug: string
  children: React.ReactNode
  mode?: 'block' | 'blur' | 'hide'
}

export async function UpgradeGate({ chefId, featureSlug, children, mode = 'block' }: Props) {
  // Admins always bypass — full Pro access regardless of subscription
  const adminCheck = await isAdmin().catch(() => false)
  if (adminCheck) return <>{children}</>

  const { tier } = await getTierForChef(chefId)

  // Pro users (including grandfathered and trialing) — render content as-is
  if (tier === 'pro') return <>{children}</>

  // Free user — apply gating based on mode
  if (mode === 'hide') return null

  const feature = getProFeature(featureSlug)

  if (mode === 'blur') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-60" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-surface/30">
          <UpgradePrompt label={feature?.label} description={feature?.description} />
        </div>
      </div>
    )
  }

  // mode === 'block' (default)
  return <UpgradePrompt label={feature?.label} description={feature?.description} />
}
