import { requireClient } from '@/lib/auth/get-user'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { UniversalRail } from '@/components/discovery/universal-rail'

export async function ClientUniversalRail() {
  const user = await requireClient()

  let result
  try {
    result = await assembleRailForPage('client', 'my-events', user.id, user.tenantId ?? undefined)
  } catch (err) {
    console.error('[ClientUniversalRail] Assembly failed:', err)
    return null
  }

  if (result.items.length === 0) return null

  return (
    <UniversalRail
      items={result.items}
      role="client"
      userId={user.id}
      tenantId={user.tenantId ?? undefined}
      pageContext="my-events"
      title="For You"
    />
  )
}

export function ClientUniversalRailSkeleton() {
  return <div className="h-20 rounded-xl loading-bone loading-bone-muted" />
}
