import { requireAdmin } from '@/lib/auth/admin'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRailCompact } from '@/components/discovery/universal-rail'

/**
 * AdminRailStrip - server component.
 * Mounts the Universal Rail for admin users above main content.
 * Renders nothing on empty result or auth failure.
 */
export async function AdminRailStrip() {
  try {
    const admin = await requireAdmin()
    const result = await assembleRailForPage('admin', 'dashboard', admin.id, undefined)
    if (result.items.length === 0) return null

    return (
      <div className="border-b border-stone-800 bg-stone-950/80 px-4 py-2">
        <UniversalRailCompact
          items={result.items}
          role="admin"
          userId={admin.id}
          tenantId={undefined}
          pageContext="dashboard"
          maxVisible={8}
        />
      </div>
    )
  } catch {
    return null
  }
}

export function AdminRailStripSkeleton() {
  return <div className="h-10 border-b border-stone-800 bg-stone-950/80 animate-pulse" />
}
