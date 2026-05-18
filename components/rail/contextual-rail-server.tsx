import { requireChef } from '@/lib/auth/get-user'
import { headers } from 'next/headers'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'
import { matchRailProfile } from '@/lib/discovery/rail-profiles'
import { assembleContextualRail } from '@/lib/discovery/contextual-rail-assembly'
import { ContextualRailClient } from './contextual-rail-client'

export async function ContextualRailServer() {
  try {
    const headersList = await headers()
    const pathname = headersList.get(PATHNAME_HEADER) ?? '/dashboard'
    const { profile, entityContext } = matchRailProfile(pathname)
    const user = await requireChef()
    const data = await assembleContextualRail(
      profile,
      entityContext,
      user.id,
      user.tenantId ?? user.entityId
    )

    if (data.totalItems === 0) return null

    return <ContextualRailClient data={data} />
  } catch (err) {
    console.error('[ContextualRailServer] render failed:', err)
    return null
  }
}

export function ContextualRailSkeleton() {
  return <div className="h-9 bg-stone-950/60 border-b border-stone-800/30 animate-pulse" />
}
