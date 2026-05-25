import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'
import { getGoogleConnection } from '@/lib/google/auth'
import { getGmailSyncHistory } from '@/lib/gmail/actions'
import { getHistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'
import { getWixConnection, getWixSubmissions } from '@/lib/wix/actions'
import { getGoogleReviewUrl } from '@/lib/reviews/actions'
import { listLocalAiConnectors } from '@/lib/ai/connector/actions'
import { GoogleIntegrations } from '@/components/settings/google-integrations'
import { WixConnection } from '@/components/wix/wix-connection'
import { GoogleReviewUrlForm } from '@/components/settings/google-review-url-form'
import { LocalAiConnectors } from '@/components/settings/local-ai-connectors'
import { hasChefFeatureFlag, CHEF_FEATURE_FLAGS } from '@/lib/features/chef-feature-flags'

export const metadata: Metadata = { title: 'Settings - Integrations' }

export default async function ConnectionsSettingsPage() {
  await requireChef()

  const [
    googleConnection,
    recentSyncs,
    historicalScanStatus,
    wixConnection,
    wixSubmissions,
    googleReviewUrl,
    localAiConnectors,
    developerToolsEnabled,
  ] = await Promise.all([
    getGoogleConnection().catch((err) => {
      console.error('[Settings] getGoogleConnection failed:', err)
      return {
        gmail: { connected: false, email: null, lastSync: null, errorCount: 0 },
        calendar: {
          connected: false,
          email: null,
          lastSync: null,
          checkedAt: null,
          health: 'unknown',
          healthDetail: null,
          busyRangeCount: 0,
          conflictCount: 0,
          calendarCount: 0,
        },
      } as Awaited<ReturnType<typeof getGoogleConnection>>
    }),
    getGmailSyncHistory(10).catch(() => []),
    getHistoricalScanStatus().catch(() => null),
    getWixConnection().catch(() => null),
    getWixSubmissions({ limit: 10 }).catch(() => []),
    getGoogleReviewUrl().catch(() => null),
    listLocalAiConnectors().catch(() => []),
    hasChefFeatureFlag(CHEF_FEATURE_FLAGS.developerTools).catch(() => false),
  ])

  return (
    <div>
      {/* Mobile back */}
      <div className="mb-4 md:hidden">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Connect your email, website, and other services to ChefFlow.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Connected Accounts &amp; Integrations"
          description="Connect inbox and website channels, then manage system integrations."
          icon="Plug"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-3">Connected Accounts</h3>
              <div className="space-y-4">
                <GoogleIntegrations
                  connection={googleConnection}
                  recentSyncs={recentSyncs}
                  historicalScanStatus={historicalScanStatus}
                />
                <WixConnection
                  connection={wixConnection as any}
                  recentSubmissions={wixSubmissions}
                />
              </div>
            </div>
            <div className="border-t border-stone-700 pt-4">
              <h3 className="text-sm font-semibold text-stone-300 mb-3">Integration Center</h3>
              <div className="space-y-3">
                <Link
                  href="/settings/embed"
                  className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
                >
                  <p className="font-semibold text-brand-200">Website Widget</p>
                  <p className="text-sm text-brand-400 mt-1">
                    Add a booking form to your existing website. Works on Wix, Squarespace,
                    WordPress, and any site.
                  </p>
                </Link>
                <Link
                  href="/settings/integrations"
                  className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                >
                  <p className="font-medium text-stone-100">Manage Integrations</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Manage POS, website, scheduling, and CRM integrations in one place.
                  </p>
                </Link>
                <Link
                  href="/settings/calendar-sync"
                  className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                >
                  <p className="font-medium text-stone-100">Calendar Sync (iCal)</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Generate a subscribe-by-URL feed that auto-syncs events to Apple Calendar,
                    Outlook, or Google Calendar.
                  </p>
                </Link>
                <Link
                  href="/settings/platform-connections"
                  className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                >
                  <p className="font-medium text-stone-100">Platform Connections</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Connect marketplace accounts to track inquiries from external chef platforms.
                  </p>
                </Link>
                {developerToolsEnabled && (
                  <Link
                    href="/settings/zapier"
                    className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                  >
                    <p className="font-medium text-stone-100">Zapier &amp; Webhooks</p>
                    <p className="text-sm text-stone-500 mt-1">
                      Connect ChefFlow to 5,000+ apps via Zapier or Make. Manage webhook
                      subscriptions and delivery logs.
                    </p>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Client Reviews"
          description="Configure your review link and review collection flow."
          icon="Star"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <GoogleReviewUrlForm currentUrl={googleReviewUrl} />
            <Link
              href="/settings/yelp"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Yelp Reviews</p>
              <p className="text-sm text-stone-500 mt-1">
                Connect your Yelp business listing to automatically sync reviews into ChefFlow.
              </p>
            </Link>
            <Link
              href="/reviews"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">View All Reviews</p>
              <p className="text-sm text-stone-500 mt-1">
                See unified internal + external reviews with source links and sync controls.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Local AI Connector"
          description="Connect your local AI assistant. Smart features like recipe parsing and email drafting run privately on your computer."
          icon="Cpu"
          tone="neutral"
          defaultOpen={true}
        >
          <LocalAiConnectors initialConnectors={localAiConnectors} />
        </SettingsCategory>
      </div>
    </div>
  )
}
