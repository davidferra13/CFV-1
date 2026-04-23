import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import {
  getIntegrationProviderOverview,
  getRecentIntegrationEvents,
} from '@/lib/integrations/core/query-actions'
import { IntegrationCenter } from '@/components/settings/integration-center'
import { getOAuthConnectionStatuses } from '@/lib/integrations/core/connection-status-actions'
import { TakeAChefSetup } from '@/components/integrations/take-a-chef-setup'
import { PlatformSetup } from '@/components/integrations/platform-setup'
import { getTakeAChefStats } from '@/lib/gmail/take-a-chef-stats'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { IntegrationCallbackToast } from '@/components/settings/integration-callback-toast'
import { listConnectedAccounts } from '@/lib/integrations/integration-hub'
import { ConnectedAccounts } from '@/components/integrations/connected-accounts'
import { getTakeAChefIntegrationSettings } from '@/lib/integrations/take-a-chef-settings'
import { getChefPlatformSettings } from '@/lib/integrations/platform-settings'
import { BusinessToolStrip } from '@/components/integrations/business-tool-strip'
import { IntegrationsAdvancedSection } from '@/components/integrations/integrations-advanced-section'
import { TwilioByoSetup } from '@/components/integrations/twilio-byo-setup'
import { getManagedCommunicationControlPlaneSummary } from '@/lib/communication/managed-channels'

export const metadata: Metadata = { title: 'Integrations' }

export default async function IntegrationsSettingsPage() {
  const user = await requireChef()

  const [
    overview,
    recentEvents,
    tacStats,
    oauthStatuses,
    connectedAccounts,
    tacSettings,
    platformSettings,
    commsControlPlane,
  ] = await Promise.all([
    getIntegrationProviderOverview(),
    getRecentIntegrationEvents(30),
    getTakeAChefStats().catch(() => ({
      newLeads: 0,
      awaitingResponse: 0,
      confirmed: 0,
      totalAllTime: 0,
      lastSyncAt: null,
    })),
    getOAuthConnectionStatuses(),
    listConnectedAccounts().catch(() => []),
    getTakeAChefIntegrationSettings(),
    getChefPlatformSettings().catch(() => ({ platforms: {} })),
    getManagedCommunicationControlPlaneSummary({
      chefId: user.entityId!,
      tenantId: user.tenantId!,
    }),
  ])

  // Business tool strip: show connection state from oauthStatuses
  const businessTools = [
    {
      name: 'QuickBooks',
      description: 'Connect for accounting sync',
      href: '/settings/integrations',
      connected: oauthStatuses?.quickbooks?.connected === true,
    },
    {
      name: 'DocuSign',
      description: 'Connect for contract sending',
      href: '/settings/integrations',
      connected: oauthStatuses?.docusign?.connected === true,
    },
    {
      name: 'Square',
      description: 'Connect for payment processing',
      href: '/settings/integrations',
      connected: oauthStatuses?.square?.connected === true,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <WidgetErrorBoundary name="Integration Callback">
        <Suspense>
          <IntegrationCallbackToast />
        </Suspense>
      </WidgetErrorBoundary>
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
          Connect ChefFlow to your email capture, booking platforms, and business tools.
        </p>
      </div>

      {/* SMS integration - bring your own Twilio */}
      <TwilioByoSetup
        connected={commsControlPlane.twilio.connected}
        phoneNumber={commsControlPlane.twilio.phoneNumber}
        accountSid={commsControlPlane.twilio.accountSid}
        inboundWebhookUrl={commsControlPlane.twilio.inboundWebhookUrl}
        statusCallbackUrl={commsControlPlane.twilio.statusCallbackUrl}
      />

      <section className="rounded-lg border border-stone-700 bg-stone-900 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">Managed communication channels</h2>
          <p className="mt-1 text-xs text-stone-400">
            Existing ownership tables are the control plane for inbound alias routing, Gmail mailbox
            ownership, outbound identity, and Twilio delivery callbacks.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-stone-800 bg-stone-950/60 p-4 space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Inbound alias</div>
            <div className="font-mono text-sm text-stone-100">
              {commsControlPlane.inboundEmailAlias.address}
            </div>
            <div className="text-xs text-stone-400">
              ChefFlow-managed alias for direct managed email ingress.
            </div>
          </div>

          <div className="rounded-md border border-stone-800 bg-stone-950/60 p-4 space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
              Outbound email owner
            </div>
            {commsControlPlane.email.outboundOwner ? (
              <>
                <div className="font-mono text-sm text-stone-100">
                  {commsControlPlane.email.outboundOwner.address}
                </div>
                <div className="text-xs text-stone-400">
                  Provider: {commsControlPlane.email.outboundOwner.provider}
                </div>
              </>
            ) : (
              <div className="text-sm text-amber-300">
                No managed outbound mailbox is currently available.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Gmail mailbox health
          </div>
          {commsControlPlane.email.mailboxes.length > 0 ? (
            <div className="space-y-2">
              {commsControlPlane.email.mailboxes.map((mailbox) => (
                <div
                  key={mailbox.id}
                  className="rounded-md border border-stone-800 bg-stone-950/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-stone-100">{mailbox.address}</span>
                    {mailbox.isPrimary && (
                      <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] text-brand-300">
                        Primary outbound
                      </span>
                    )}
                    {!mailbox.gmailConnected && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                        Disconnected
                      </span>
                    )}
                    {!mailbox.isActive && (
                      <span className="rounded-full bg-stone-700 px-2 py-0.5 text-[11px] text-stone-300">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-stone-400">
                    Last sync:{' '}
                    {mailbox.lastSyncAt
                      ? new Date(mailbox.lastSyncAt).toLocaleString()
                      : 'Never synced'}
                    {' · '}Sync errors: {mailbox.syncErrors}
                    {' · '}Historical scan:{' '}
                    {mailbox.historicalScanEnabled ? mailbox.historicalScanStatus : 'disabled'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-stone-700 px-4 py-3 text-sm text-stone-400">
              No `google_mailboxes` records are active for this chef. Gmail auth may still exist in
              the legacy connection row, but mailbox ownership is not fully surfaced until a mailbox
              record is present.
            </div>
          )}

          {commsControlPlane.email.legacyConnection && (
            <div className="rounded-md border border-stone-800 bg-stone-950/40 px-4 py-3 text-xs text-stone-400">
              Legacy Gmail connection:{' '}
              <span className="font-mono text-stone-200">
                {commsControlPlane.email.legacyConnection.address || 'unknown'}
              </span>
              {' · '}Connected:{' '}
              {commsControlPlane.email.legacyConnection.gmailConnected ? 'yes' : 'no'}
              {' · '}Last sync:{' '}
              {commsControlPlane.email.legacyConnection.lastSyncAt
                ? new Date(commsControlPlane.email.legacyConnection.lastSyncAt).toLocaleString()
                : 'never'}
            </div>
          )}
        </div>
      </section>

      {/* Email lead capture - guided setup for booking platform notifications via Gmail */}
      <TakeAChefSetup
        gmailConnected={Boolean(commsControlPlane.email.outboundOwner)}
        lastSyncAt={
          commsControlPlane.email.mailboxes.find((mailbox) => mailbox.isPrimary)?.lastSyncAt ??
          commsControlPlane.email.mailboxes[0]?.lastSyncAt ??
          commsControlPlane.email.legacyConnection?.lastSyncAt ??
          null
        }
        tacLeadCount={tacStats.totalAllTime}
        defaultCommissionPercent={tacSettings.defaultCommissionPercent}
      />

      {/* Multi-platform configuration */}
      <PlatformSetup settings={platformSettings.platforms} />

      {/* Business tool connection status strip */}
      <BusinessToolStrip tools={businessTools} />

      {/* Advanced: provider inventory + manual connector (collapsed by default) */}
      <IntegrationsAdvancedSection>
        <IntegrationCenter
          overview={overview}
          recentEvents={recentEvents}
          oauthStatuses={oauthStatuses}
        />
        <ConnectedAccounts initialAccounts={connectedAccounts} />
      </IntegrationsAdvancedSection>
    </div>
  )
}
