// Client Portal Monitoring - /clients/presence
// Real-time view of who's on the portal, what they're doing, and their engagement level.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveClientsWithContext, getRecentClientActivity } from '@/lib/activity/actions'
import { ClientPresenceMonitor } from '@/components/activity/client-presence-monitor'

export const metadata: Metadata = { title: 'Client Portal Monitoring - ChefFlow' }

export default async function ClientPresencePage() {
  const user = await requireChef()

  const [activeClients, recentActivityResult] = await Promise.all([
    getActiveClientsWithContext(60).catch(() => []),
    getRecentClientActivity({ limit: 30, daysBack: 1 }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
  ])

  const onlineCount = activeClients.filter((c) => {
    return Date.now() - new Date(c.last_activity).getTime() < 5 * 60 * 1000
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Clients
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-stone-100">Client Portal Monitoring</h1>
          {onlineCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCount} online now
            </span>
          )}
        </div>
        <p className="text-stone-500 mt-1 text-sm">
          Real-time view of who&apos;s on your portal and what they&apos;re doing. Updates
          automatically as clients browse.
        </p>
      </div>

      {/* Monitor */}
      <ClientPresenceMonitor
        tenantId={user.tenantId!}
        initialClients={activeClients}
        initialActivity={recentActivityResult.items}
      />
    </div>
  )
}
