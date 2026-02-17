// Chef Settings Page
// Configure home address, default stores, timing defaults, and DOP preferences.
// Set once, rarely changed.

import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { getGoogleConnection } from '@/lib/gmail/google-auth'
import { getGmailSyncHistory } from '@/lib/gmail/actions'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { ConnectedAccounts } from '@/components/settings/connected-accounts'
import Link from 'next/link'

export default async function SettingsPage() {
  await requireChef()
  const [preferences, gmailConnection, recentSyncs] = await Promise.all([
    getChefPreferences(),
    getGoogleConnection(),
    getGmailSyncHistory(10),
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
    </div>
  )
}
