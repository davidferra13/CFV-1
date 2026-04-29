// Client Portal Monitoring - /clients/presence
// Real-time view of recent client portal activity signals and engagement level.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveClientsWithContext, getRecentClientActivity } from '@/lib/activity/actions'
import { ClientPresenceMonitor } from '@/components/activity/client-presence-monitor'

export const metadata: Metadata = { title: 'Client Portal Monitoring' }

export default async function ClientPresencePage() {
  const user = await requireChef()

  const [activeClientsResult, recentActivityResult] = await Promise.allSettled([
    getActiveClientsWithContext(60),
    getRecentClientActivity({ limit: 30, daysBack: 1 }),
  ])

  const loadErrors = [
    activeClientsResult.status === 'rejected' ? 'active client signals' : null,
    recentActivityResult.status === 'rejected' ? 'recent activity stream' : null,
  ].filter(Boolean)

  const activeClients = activeClientsResult.status === 'fulfilled' ? activeClientsResult.value : []
  const recentActivity =
    recentActivityResult.status === 'fulfilled' ? recentActivityResult.value.items : []

  const activeNowCount = activeClients.filter((c) => {
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
          {loadErrors.length === 0 && activeNowCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeNowCount} active now
            </span>
          )}
        </div>
        <p className="text-stone-500 mt-1 text-sm">
          Real-time view of recent client portal activity. Updates automatically as clients browse.
        </p>
      </div>

      {/* Monitor */}
      {loadErrors.length > 0 ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-5">
          <h2 className="text-sm font-semibold text-red-200">Could not load client activity</h2>
          <p className="mt-2 text-sm text-red-100/80">
            ChefFlow could not load the {loadErrors.join(' and ')}. Refresh this page before making
            decisions from client presence.
          </p>
        </div>
      ) : (
        <ClientPresenceMonitor
          tenantId={user.tenantId!}
          initialClients={activeClients}
          initialActivity={recentActivity}
        />
      )}
    </div>
  )
}
