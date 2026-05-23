import { requireStaff } from '@/lib/auth/get-user'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRailCompact } from '@/components/discovery/universal-rail'

/**
 * StaffRailStrip - server component.
 * Mounts the Universal Rail for staff users above main content.
 * Surfaces shift info, assigned tasks, station prep, and event dietary alerts.
 */
export async function StaffRailStrip() {
  try {
    const user = await requireStaff()
    const result = await assembleRailForPage(
      'staff',
      'dashboard',
      user.id,
      user.tenantId ?? undefined
    )
    if (result.items.length === 0) return null

    return (
      <div className="border-b border-stone-800 bg-stone-950/60 px-4 py-2">
        <UniversalRailCompact
          items={result.items}
          role="staff"
          userId={user.id}
          tenantId={user.tenantId ?? undefined}
          pageContext="dashboard"
          maxVisible={6}
        />
      </div>
    )
  } catch {
    return null
  }
}

export function StaffRailStripSkeleton() {
  return <div className="h-10 border-b border-stone-800 bg-stone-950/60 animate-pulse" />
}
