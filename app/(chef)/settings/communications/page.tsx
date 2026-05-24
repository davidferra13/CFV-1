import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'
import { SmsBridgePanel } from '@/components/settings/sms-bridge-panel'
import { getSmsBridgeStatus } from '@/lib/sms-bridge/actions'

export const metadata: Metadata = { title: 'Settings - Communications' }

export default async function CommunicationsSettingsPage() {
  await requireChef()
  const bridgeStatus = await getSmsBridgeStatus()

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
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Communications</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Messaging, automations, notifications, and alerts.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Messages & Automation"
          description="Auto-response, touchpoints, templates, and automation rules."
          icon="MessageSquare"
          primary
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/communication"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">Communication Settings</p>
              <p className="text-sm text-brand-400 mt-1">
                Auto-response rules, business hours, message cadence, and default reply behavior.
              </p>
            </Link>

            <Link
              href="/settings/touchpoints"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Touchpoints</p>
              <p className="text-sm text-stone-500 mt-1">
                Automated client follow-ups for birthdays, post-event check-ins, and periodic
                outreach.
              </p>
            </Link>

            <Link
              href="/settings/templates"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Response Templates</p>
              <p className="text-sm text-stone-500 mt-1">
                Pre-written messages you can quickly copy and customize when logging communication.
              </p>
            </Link>

            <Link
              href="/settings/automations"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Automations</p>
              <p className="text-sm text-stone-500 mt-1">
                Set up rules to auto-create follow-ups, notifications, and draft messages when
                events happen.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Notifications & Alerts"
          description="Control email, browser push, and SMS alerts by category."
          icon="Bell"
          primary
          tone="neutral"
          defaultOpen={true}
        >
          <Link
            href="/settings/notifications"
            className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
          >
            <p className="font-semibold text-brand-200">Notification Channels</p>
            <p className="text-sm text-brand-400 mt-1">
              Manage email, browser push, and SMS preferences per category. Set up your SMS number
              here.
            </p>
          </Link>
        </SettingsCategory>

        <SettingsCategory
          title="SMS Bridge"
          description="Forward texts from your personal phone into ChefFlow. Known clients route automatically; unknown numbers become leads."
          icon="Smartphone"
          primary
          tone="neutral"
          defaultOpen={true}
        >
          <SmsBridgePanel initial={bridgeStatus} />
        </SettingsCategory>
      </div>
    </div>
  )
}
