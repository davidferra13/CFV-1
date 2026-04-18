// Network Activity Widget - surfaces pending handoffs, connection requests, and collab messages
// Server component, streamed via Suspense

import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card } from '@/components/ui/card'

type NetworkActivity = {
  pendingHandoffs: number
  pendingConnectionRequests: number
  unreadCollabMessages: number
}

async function getNetworkActivity(): Promise<NetworkActivity> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const chefId = user.entityId

  const [handoffsResult, connectionsResult, collabResult] = await Promise.all([
    db
      .from('chef_collab_handoff_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_chef_id', chefId)
      .eq('status', 'pending'),
    db
      .from('chef_connections')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_chef_id', chefId)
      .eq('status', 'pending'),
    db
      .from('chef_collab_space_members')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId)
      .gt('unread_count', 0),
  ])

  return {
    pendingHandoffs: handoffsResult.count ?? 0,
    pendingConnectionRequests: connectionsResult.count ?? 0,
    unreadCollabMessages: collabResult.count ?? 0,
  }
}

export async function NetworkActivitySection() {
  const activity = await getNetworkActivity()

  const total =
    activity.pendingHandoffs + activity.pendingConnectionRequests + activity.unreadCollabMessages

  if (total === 0) return null

  const items: Array<{ label: string; count: number; href: string }> = []

  if (activity.pendingHandoffs > 0) {
    items.push({
      label: `handoff${activity.pendingHandoffs > 1 ? 's' : ''}`,
      count: activity.pendingHandoffs,
      href: '/network?tab=collab',
    })
  }

  if (activity.pendingConnectionRequests > 0) {
    items.push({
      label: `connection request${activity.pendingConnectionRequests > 1 ? 's' : ''}`,
      count: activity.pendingConnectionRequests,
      href: '/network?tab=connections',
    })
  }

  if (activity.unreadCollabMessages > 0) {
    items.push({
      label: `unread collab message${activity.unreadCollabMessages > 1 ? 's' : ''}`,
      count: activity.unreadCollabMessages,
      href: '/network?tab=collab',
    })
  }

  return (
    <Card className="p-4 border-brand-800/30 bg-brand-950/20">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-brand-200">Chef Network</h3>
        <Link
          href="/network"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          View all &rarr;
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-1.5 text-sm text-stone-300 hover:text-stone-100 transition-colors"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-900/60 text-brand-300 text-xs font-bold">
              {item.count}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
