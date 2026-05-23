import { requireClient } from '@/lib/auth/get-user'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRailCompact } from '@/components/discovery/universal-rail'

/**
 * ClientRailStrip - server component.
 * Mounts the Universal Rail for client users above main content.
 * Surfaces upcoming events, pending approvals, payment reminders,
 * dietary form requests, and chef messages.
 */
export async function ClientRailStrip() {
  try {
    const user = await requireClient()
    const result = await assembleRailForPage(
      'client',
      'portal',
      user.id,
      user.tenantId ?? undefined
    )
    if (result.items.length === 0) return null

    return (
      <div className="border-b border-stone-800 bg-stone-950/60 px-4 py-2">
        <UniversalRailCompact
          items={result.items}
          role="client"
          userId={user.id}
          tenantId={user.tenantId ?? undefined}
          pageContext="portal"
          maxVisible={6}
        />
      </div>
    )
  } catch {
    return null
  }
}

export function ClientRailStripSkeleton() {
  return <div className="h-10 border-b border-stone-800 bg-stone-950/60 animate-pulse" />
}
