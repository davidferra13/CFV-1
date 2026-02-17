// Chef Settings Page
// Configure home address, default stores, timing defaults, and DOP preferences.
// Set once, rarely changed.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Settings - ChefFlow' }
import { getChefPreferences } from '@/lib/chef/actions'
import { getGoogleConnection } from '@/lib/gmail/google-auth'
import { getGmailSyncHistory } from '@/lib/gmail/actions'
import { getNetworkDiscoverable } from '@/lib/network/actions'
import { getGoogleReviewUrl } from '@/lib/reviews/actions'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { ConnectedAccounts } from '@/components/settings/connected-accounts'
import { DiscoverabilityToggle } from '@/components/network/discoverability-toggle'
import { GoogleReviewUrlForm } from '@/components/settings/google-review-url-form'
import Link from 'next/link'

export default async function SettingsPage() {
  await requireChef()
  const [preferences, gmailConnection, recentSyncs, networkDiscoverable, googleReviewUrl] = await Promise.all([
    getChefPreferences(),
    getGoogleConnection(),
    getGmailSyncHistory(10),
    getNetworkDiscoverable(),
    getGoogleReviewUrl(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-600 mt-1">
          Configure your defaults. These are used to generate timelines and operating procedures for every event.
        </p>
      </div>

      <PreferencesForm preferences={preferences} />

      {/* Connected Accounts */}
      <div className="pt-4 border-t border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Connected Accounts</h2>
        <ConnectedAccounts connection={gmailConnection} recentSyncs={recentSyncs} />
      </div>

      {/* Additional Settings Links */}
      <div className="pt-4 border-t border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Communication</h2>
        <Link
          href="/settings/templates"
          className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
        >
          <p className="font-medium text-stone-900">Response Templates</p>
          <p className="text-sm text-stone-500 mt-1">
            Pre-written messages you can quickly copy and customize when logging communication.
          </p>
        </Link>
      </div>

      <div className="pt-4 border-t border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Repertoire</h2>
        <Link
          href="/settings/repertoire"
          className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
        >
          <p className="font-medium text-stone-900">Seasonal Palettes</p>
          <p className="text-sm text-stone-500 mt-1">
            Define your creative thesis, micro-windows, context profiles, and proven wins for each season.
          </p>
        </Link>
      </div>

      {/* Client Reviews */}
      <div className="pt-4 border-t border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Client Reviews</h2>
        <div className="space-y-3">
          <GoogleReviewUrlForm currentUrl={googleReviewUrl} />
          <Link
            href="/reviews"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">View All Reviews</p>
            <p className="text-sm text-stone-500 mt-1">
              See client feedback, ratings, and Google review click-through stats.
            </p>
          </Link>
        </div>
      </div>

      {/* Chef Network */}
      <div className="pt-4 border-t border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Chef Network</h2>
        <div className="space-y-3">
          <DiscoverabilityToggle currentValue={networkDiscoverable} />
          <Link
            href="/settings/profile"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Network Profile</p>
            <p className="text-sm text-stone-500 mt-1">
              Set your display name, bio, and profile photo for the chef directory.
            </p>
          </Link>
        </div>
      </div>

      {/* Account Management */}
      <div className="pt-4 border-t border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Account</h2>
        <div className="space-y-3">
          <Link
            href="/settings/change-password"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Change Password</p>
            <p className="text-sm text-stone-500 mt-1">
              Update your account password.
            </p>
          </Link>
          <Link
            href="/settings/delete-account"
            className="block border border-red-200 rounded-lg p-4 hover:bg-red-50 transition-colors"
          >
            <p className="font-medium text-red-700">Delete Account</p>
            <p className="text-sm text-red-500 mt-1">
              Permanently delete your account and all associated data.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
