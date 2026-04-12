import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { AccountAccessMonitor } from '@/components/settings/account-access-monitor'
import { getAccountAccessOverview } from '@/lib/auth/account-access'
import { requireAccessSessionSubject } from '@/lib/auth/access-session'

export const metadata: Metadata = { title: 'Account Security' }

export default async function AccountSecurityPage() {
  const user = await requireAccessSessionSubject()
  const accessOverview = await getAccountAccessOverview(user.authUserId, headers())
  const returnPath = getReturnPathForRole(user.role)

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8 text-stone-100 sm:px-6 lg:px-8">
      <ToastProvider />

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-stone-50">Account Security</h1>
              <p className="mt-1 text-sm text-stone-400">
                Review flagged sign-ins and secure the account immediately if something is off.
              </p>
            </div>

            <Link
              href={returnPath}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-stone-700/80 px-4 text-sm text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
            >
              Return to workspace
            </Link>
          </div>

          <p className="text-xs text-stone-500">
            This page stays focused on sign-in review only. For profile changes, billing, or device
            setup, use your usual workspace settings.
          </p>
        </div>

        <AccountAccessMonitor overview={accessOverview} />
      </div>
    </div>
  )
}

function getReturnPathForRole(role: string | null): string {
  if (role === 'client') return '/my-events'
  if (role === 'staff') return '/staff-dashboard'
  if (role === 'partner') return '/partner/dashboard'
  if (role === 'chef') return '/settings/account'
  return '/auth/signin'
}
