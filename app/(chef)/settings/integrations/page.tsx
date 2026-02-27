import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import {
  getIntegrationProviderOverview,
  getRecentIntegrationEvents,
} from '@/lib/integrations/core/query-actions'
import { IntegrationCenter } from '@/components/settings/integration-center'
import { getOAuthConnectionStatuses } from '@/lib/integrations/core/connection-status-actions'
import { TakeAChefSetup } from '@/components/integrations/take-a-chef-setup'
import { getTakeAChefStats } from '@/lib/gmail/take-a-chef-stats'
import { createServerClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { IntegrationCallbackToast } from '@/components/settings/integration-callback-toast'
import { listConnectedAccounts } from '@/lib/integrations/integration-hub'
import { ConnectedAccounts } from '@/components/integrations/connected-accounts'

export const metadata: Metadata = { title: 'Integrations - ChefFlow' }

export default async function IntegrationsSettingsPage() {
  const user = await requireChef()

  const [overview, recentEvents, tacStats, gmailConn, oauthStatuses, connectedAccounts] =
    await Promise.all([
      getIntegrationProviderOverview(),
      getRecentIntegrationEvents(30),
      getTakeAChefStats().catch(() => ({
        newLeads: 0,
        awaitingResponse: 0,
        confirmed: 0,
        totalAllTime: 0,
        lastSyncAt: null,
      })),
      createServerClient()
        .from('google_connections')
        .select('gmail_connected, gmail_last_sync_at')
        .eq('chef_id', user.entityId)
        .maybeSingle()
        .then((r) => r.data),
      getOAuthConnectionStatuses(),
      listConnectedAccounts().catch(() => []),
    ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Suspense>
        <IntegrationCallbackToast />
      </Suspense>
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Integrations</h1>
        <p className="text-stone-400 mt-1">
          Connect ChefFlow to your accounting, payments, contracts, scheduling, and automation
          tools.
        </p>
      </div>

      {/* TakeAChef Integration — featured prominently since 80% of business flows through it */}
      <TakeAChefSetup
        gmailConnected={gmailConn?.gmail_connected ?? false}
        lastSyncAt={gmailConn?.gmail_last_sync_at ?? null}
        tacLeadCount={tacStats.totalAllTime}
      />

      <IntegrationCenter
        overview={overview}
        recentEvents={recentEvents}
        oauthStatuses={oauthStatuses}
      />

      <ConnectedAccounts initialAccounts={connectedAccounts} />
    </div>
  )
}
