import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRailCompact } from '@/components/discovery/universal-rail'

/**
 * PartnerRailStrip - server component.
 * Mounts the Universal Rail for partner users at the top of the partner portal.
 * Surfaces referral stats, upcoming co-hosted events, and compliance deadlines.
 */
export async function PartnerRailStrip({
  userId,
  tenantId,
}: {
  userId: string
  tenantId: string | undefined
}) {
  try {
    const result = await assembleRailForPage('partner', 'dashboard', userId, tenantId)
    if (result.items.length === 0) return null

    return (
      <div className="border-b border-stone-700 bg-stone-800/60 px-4 py-2">
        <UniversalRailCompact
          items={result.items}
          role="partner"
          userId={userId}
          tenantId={tenantId}
          pageContext="dashboard"
          maxVisible={6}
        />
      </div>
    )
  } catch {
    return null
  }
}

export function PartnerRailStripSkeleton() {
  return <div className="h-10 border-b border-stone-700 bg-stone-800/60 animate-pulse" />
}
