// Account & Security Settings
// Unified page for email, password, devices, and account management.

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { requireChef } from '@/lib/auth/get-user'
import { getAccountAccessOverview } from '@/lib/auth/account-access'
import { AccountAccessMonitor } from '@/components/settings/account-access-monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from '@/components/settings/change-password-form'
import { EmailChangeForm } from '@/components/settings/email-change-form'
import Link from 'next/link'
import { createServerClient } from '@/lib/db/server'

export const metadata: Metadata = { title: 'Account & Security' }

export default async function AccountSettingsPage() {
  const user = await requireChef()
  const db = createServerClient()
  const requestHeaders = headers()

  const [{ data: chef }, accessOverview] = await Promise.all([
    db.from('chefs').select('email').eq('id', user.entityId).single(),
    getAccountAccessOverview(user.authUserId, requestHeaders),
  ])

  const currentEmail = chef?.email || ''

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Account & Security</h1>
        <p className="text-stone-400 mt-1">
          Manage your email, password, and account-level settings.
        </p>
      </div>

      <AccountAccessMonitor overview={accessOverview} />

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Address</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailChangeForm currentEmail={currentEmail} />
        </CardContent>
      </Card>

      {/* Password */}
      <ChangePasswordForm />

      {/* Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devices & Staff Access</CardTitle>
          <p className="text-sm text-stone-400">
            Manage kiosk devices and staff PINs for your business.
          </p>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/devices"
            className="inline-flex items-center text-sm text-brand-400 hover:text-brand-300"
          >
            Manage devices and PINs
          </Link>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-900/50">
        <CardHeader>
          <CardTitle className="text-base text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-400">
            Deleting your account removes all your data after a 30-day grace period. This cannot be
            undone once the grace period expires.
          </p>
          <Link
            href="/settings/delete-account"
            className="inline-flex items-center text-sm text-red-400 hover:text-red-300"
          >
            Delete my account
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
