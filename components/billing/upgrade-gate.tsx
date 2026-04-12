// UpgradeGate - Server Component for inline paid feature gating.
//
// Unlike requirePro() (which hard-redirects), UpgradeGate renders a fallback
// inside the page rather than navigating away. Use this for sub-sections,
// panels, and widgets where you want the surrounding page to remain accessible.
//
// mode:
//   'block' (default) - shows an upgrade prompt in place of the content
//   'blur'            - renders children blurred with an upgrade overlay
//   'hide'            - renders nothing (silent omission, use sparingly)
//
// For free features or chefs with paid access, renders children unchanged.
//
// Call sites: 16+. Signature unchanged - no call site updates needed.

import { isPaidFeature } from '@/lib/billing/feature-classification'
import { hasProAccess } from '@/lib/billing/tier'

type Props = {
  chefId: string
  featureSlug: string
  children: React.ReactNode
  mode?: 'block' | 'blur' | 'hide'
}

export async function UpgradeGate({ chefId, featureSlug, children, mode = 'block' }: Props) {
  // Free feature or unrecognized slug - always show content
  if (!isPaidFeature(featureSlug)) {
    return <>{children}</>
  }

  // Check paid access
  const hasPaid = await hasProAccess(chefId)
  if (hasPaid) {
    return <>{children}</>
  }

  // No access - apply the mode
  if (mode === 'hide') {
    return null
  }

  if (mode === 'blur') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
          {children}
        </div>
        <UpgradeOverlay featureSlug={featureSlug} />
      </div>
    )
  }

  // Default: 'block' - replace content with upgrade prompt
  return <UpgradeBlock featureSlug={featureSlug} />
}

function UpgradeBlock({ featureSlug }: { featureSlug: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-stone-700 bg-stone-900 p-10 text-center">
      <p className="text-sm text-stone-400">This feature requires a paid plan.</p>
      <a
        href={`/settings/billing?feature=${encodeURIComponent(featureSlug)}`}
        className="mt-4 inline-flex items-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        View upgrade options
      </a>
    </div>
  )
}

function UpgradeOverlay({ featureSlug }: { featureSlug: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-stone-950/80 backdrop-blur-sm">
      <a
        href={`/settings/billing?feature=${encodeURIComponent(featureSlug)}`}
        className="inline-flex items-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Upgrade to access
      </a>
    </div>
  )
}
