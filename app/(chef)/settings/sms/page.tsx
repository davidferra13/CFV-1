import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { SMSSettings } from '@/components/sms/sms-settings'
import { getSMSSettings } from '@/lib/sms/sms-actions'

export const metadata: Metadata = { title: 'SMS Notifications - ChefFlow' }

export default async function SMSSettingsPage() {
  await requireChef()

  const { settings } = await getSMSSettings()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">SMS Notifications</h1>
        <p className="text-stone-400 mt-1">
          Send text messages to customers for order updates, reservations, and more. Requires a
          Twilio account.
        </p>
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-6">
        <SMSSettings initial={settings} />
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-2">SMS History</h3>
        <p className="text-xs text-stone-500 mb-3">View all sent messages and delivery status.</p>
        <Link
          href="/notifications/sms"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-300 hover:bg-stone-700 transition-colors"
        >
          View SMS History
        </Link>
      </div>
    </div>
  )
}
