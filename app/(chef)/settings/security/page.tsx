import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getSecuritySettingsData } from '@/lib/security/security-settings-actions'
import { SecuritySettingsClient } from '@/components/settings/security-settings-client'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Security Settings' }

export default async function SecuritySettingsPage() {
  const user = await requireChef()
  const data = await getSecuritySettingsData()

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-stone-400">Unable to load security settings. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Security</h1>
          <p className="mt-0.5 text-sm text-stone-400">
            Manage your account security, sessions, and authentication methods
          </p>
        </div>
      </div>

      {/* MFA Status */}
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-stone-400">
          Add an extra layer of security to your account.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                data.mfaEnabled ? 'bg-green-500' : 'bg-stone-600'
              }`}
            />
            <span className="text-sm text-stone-300">
              {data.mfaEnabled ? 'Enabled' : 'Not enabled'}
            </span>
          </div>
          <Link
            href="/settings/security/mfa"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-700"
          >
            {data.mfaEnabled ? 'Manage' : 'Enable 2FA'}
          </Link>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Password</h2>
        <p className="mt-1 text-sm text-stone-400">Change your account password.</p>
        <div className="mt-4">
          <Link
            href="/settings/change-password"
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-700"
          >
            Change password
          </Link>
        </div>
      </section>

      {/* Phone Numbers */}
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Phone Numbers</h2>
        <p className="mt-1 text-sm text-stone-400">
          Phone numbers linked to your account for verification and alerts.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-stone-300">
            {data.phoneCount === 0
              ? 'No verified phone numbers'
              : `${data.phoneCount} verified phone ${data.phoneCount === 1 ? 'number' : 'numbers'}`}
          </span>
        </div>
      </section>

      {/* Active Sessions + Recent Logins (client component for interactivity) */}
      <SecuritySettingsClient
        activeSessions={JSON.parse(JSON.stringify(data.activeSessions))}
        recentLogins={JSON.parse(JSON.stringify(data.recentLogins))}
      />
    </div>
  )
}
