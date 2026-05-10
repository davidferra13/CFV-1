import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { getBusinessMode } from '@/lib/chef/actions'
import { SettingsCategory } from '@/components/settings/settings-category'
import { BusinessModeToggle } from '@/components/settings/business-mode-toggle'
import { PreferencesForm } from '@/components/settings/preferences-form'

export const metadata: Metadata = { title: 'Settings - Your Business' }

export default async function BusinessSettingsPage() {
  const user = await requireChef()
  const [preferences, businessMode] = await Promise.all([getChefPreferences(), getBusinessMode()])

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
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Your Business</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Core settings for how you run your business, configure events, and handle documents.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Business Defaults"
          description="Home base, stores, timing, etc."
          icon="Building2"
          primary
          tone="brand"
          defaultOpen={true}
        >
          <BusinessModeToggle
            isBusinessMode={businessMode.is_business}
            businessLegalName={businessMode.business_legal_name}
            businessAddress={businessMode.business_address}
          />

          <div className="mt-4 space-y-3">
            <Link
              href="/settings/dashboard"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Customize Dashboard</p>
              <p className="text-sm text-stone-500 mt-1">
                Turn widgets on or off. Reorder them from the dashboard corner layout control.
              </p>
            </Link>

            <Link
              href="/settings/navigation"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Navigation Preferences</p>
              <p className="text-sm text-stone-500 mt-1">
                Review shell behavior and customize mobile bottom tabs.
              </p>
            </Link>

            <Link
              href="/settings/store-preferences"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Store Preferences</p>
              <p className="text-sm text-stone-500 mt-1">
                Select your preferred stores for personalized pricing throughout ChefFlow.
              </p>
            </Link>

            <Link
              href="/settings/menu-engine"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Menu Intelligence</p>
              <p className="text-sm text-stone-500 mt-1">
                Enable or disable intelligence features in the menu editor sidebar.
              </p>
            </Link>

            <Link
              href="/analytics/goals/setup"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Goals</p>
              <p className="text-sm text-stone-500 mt-1">
                Set revenue, booking, and margin targets.
              </p>
            </Link>
          </div>

          <div className="mt-4">
            <PreferencesForm preferences={preferences} />
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="My Services"
          description="What you offer and your policies."
          icon="Settings2"
          primary
          tone="brand"
          defaultOpen={true}
        >
          <Link
            href="/settings/my-services"
            className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
          >
            <p className="font-semibold text-brand-200">Configure My Services</p>
            <p className="text-sm text-brand-400 mt-1">
              Set what you offer, your policies, and extras. Remy uses these settings to accurately
              represent your business.
            </p>
          </Link>
        </SettingsCategory>

        <SettingsCategory
          title="Event Configuration"
          description="Customize event types and custom fields."
          icon="Settings2"
          primary
          tone="brand"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/event-types"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Event Types &amp; Labels</p>
              <p className="text-sm text-stone-500 mt-1">
                Rename occasion types and status labels to match your preferred terminology.
              </p>
            </Link>

            <Link
              href="/settings/custom-fields"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Custom Fields</p>
              <p className="text-sm text-stone-500 mt-1">
                Add extra fields to events, clients, and recipes to capture information specific to
                your business.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Print & Documents"
          description="Configure print output and document footers."
          icon="Printer"
          tone="neutral"
          defaultOpen={true}
        >
          <Link
            href="/settings/print"
            className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
          >
            <p className="font-medium text-stone-100">Print Preferences</p>
            <p className="text-sm text-stone-500 mt-1">
              Toggle the &apos;Generated by&apos; attribution line, set your default printer format,
              and customize footers.
            </p>
          </Link>
        </SettingsCategory>
      </div>
    </div>
  )
}
