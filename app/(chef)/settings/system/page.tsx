import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'
import { hasDemoData } from '@/lib/onboarding/demo-data'
import { DemoDataManager } from '@/components/onboarding/demo-data-manager'
import { FeedbackForm } from '@/components/feedback/feedback-form'
import { DesktopAppSettings } from '@/components/settings/desktop-app-settings'
import { isAdmin } from '@/lib/auth/admin'

export const metadata: Metadata = { title: 'Settings - System & Account' }

export default async function SystemSettingsPage() {
  await requireChef()

  const [demoDataExists, userIsAdmin] = await Promise.all([
    hasDemoData().catch(() => false),
    isAdmin().catch(() => false),
  ])

  return (
    <div>
      <div className="mb-4 md:hidden">
        <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200">
          <ArrowLeft className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">System &amp; Account</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Sample data, desktop app, feedback, and account security.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Sample Data & Setup"
          description="Load sample data to explore ChefFlow, or revisit the setup guide."
          icon="Database"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-4">
            <DemoDataManager hasDemoData={demoDataExists} />
            <div className="border-t border-stone-700 pt-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 text-sm text-stone-300 hover:text-stone-100 transition-colors"
              >
                View Setup Guide
              </Link>
            </div>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Desktop App"
          description="System tray, auto-start, and native desktop notifications for the ChefFlow desktop app."
          icon="Monitor"
          tone="neutral"
          defaultOpen={true}
        >
          <DesktopAppSettings />
        </SettingsCategory>

        <SettingsCategory
          title="Share Feedback"
          description="Tell us what you love, what frustrates you, or anything in between. We read every submission."
          icon="MessageCircle"
          tone="brand"
          defaultOpen={true}
        >
          <FeedbackForm pageContext="/settings" />
        </SettingsCategory>

        <SettingsCategory
          title="Account & Security"
          description="Email, password, devices, and account management."
          icon="Lock"
          tone="neutral"
          defaultOpen={true}
          summary={['Account settings', 'Security', 'System health', 'Incidents']}
        >
          <div className="space-y-3">
            <Link
              href="/settings/account"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">Account Settings</p>
              <p className="text-sm text-brand-400 mt-1">
                Manage your email, password, devices, and account-level controls.
              </p>
            </Link>
            <Link
              href="/settings/security"
              className="block border border-brand-700 rounded-lg p-4 hover:bg-brand-950/50 transition-colors"
            >
              <p className="font-medium text-stone-100">Security</p>
              <p className="text-sm text-stone-500 mt-1">
                Multi-factor authentication, session management, and security events.
              </p>
            </Link>
            <Link
              href="/settings/health"
              className="block border border-emerald-200 rounded-lg p-4 hover:bg-emerald-950/50 transition-colors"
            >
              <p className="font-medium text-stone-100">System Health</p>
              <p className="text-sm text-stone-500 mt-1">
                Check Stripe, Gmail, and DOP task status at a glance.
              </p>
            </Link>
            {userIsAdmin && (
              <Link
                href="/settings/incidents"
                className="block border border-amber-200 rounded-lg p-4 hover:bg-amber-950/50 transition-colors"
              >
                <p className="font-medium text-stone-100">System Incidents</p>
                <p className="text-sm text-stone-500 mt-1">
                  View failure reports from Ollama, task queue, and circuit breakers.
                </p>
              </Link>
            )}
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
