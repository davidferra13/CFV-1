// Chef Settings Page
// Configure home base, default stores, timing defaults, and DOP preferences.
// Set once, rarely changed.

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Settings - ChefFlow' }
import { getChefPreferences } from '@/lib/chef/actions'
import { getGoogleConnection } from '@/lib/google/auth'
import { getGmailSyncHistory } from '@/lib/gmail/actions'
import { getCalendarConnection } from '@/lib/scheduling/calendar-sync-actions'
import { getHistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'
import { getWixConnection, getWixSubmissions } from '@/lib/wix/actions'
import { getNetworkDiscoverable } from '@/lib/network/actions'
import { getGoogleReviewUrl } from '@/lib/reviews/actions'
import { getChefSlug } from '@/lib/profile/actions'
import { getBusinessMode } from '@/lib/chef/actions'
import { getAvailabilitySignalSetting } from '@/lib/calendar/signal-settings-actions'
import { getSchedulingRules } from '@/lib/availability/rules-actions'
import { getBookingSettings, type BookingSettings } from '@/lib/booking/booking-settings-actions'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { SchedulingRulesForm } from '@/components/settings/scheduling-rules-form'
import { BookingPageSettings } from '@/components/settings/booking-page-settings'
import { BusinessModeToggle } from '@/components/settings/business-mode-toggle'
import { GoogleIntegrations } from '@/components/settings/google-integrations'
import { WixConnection } from '@/components/wix/wix-connection'
import { DiscoverabilityToggle } from '@/components/network/discoverability-toggle'
import { GoogleReviewUrlForm } from '@/components/settings/google-review-url-form'
import { ChefBackgroundSettings } from '@/components/settings/chef-background-settings'
import { AvailabilitySignalToggle } from '@/components/calendar/availability-signal-toggle'
import { DemoDataManager } from '@/components/onboarding/demo-data-manager'
import { hasDemoData } from '@/lib/onboarding/demo-data'
import { FeedbackForm } from '@/components/feedback/feedback-form'
import { DesktopAppSettings } from '@/components/settings/desktop-app-settings'
import Link from 'next/link'

function SettingsCategory({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string
  description: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="rounded-xl border border-stone-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </summary>
      <div className="border-t border-stone-200 p-4 sm:p-5">{children}</div>
    </details>
  )
}

export default async function SettingsPage() {
  await requireChef()
  const [
    preferences,
    googleConnection,
    recentSyncs,
    historicalScanStatus,
    wixConnection,
    wixSubmissions,
    networkDiscoverable,
    googleReviewUrl,
    profile,
    businessMode,
    availabilitySignalEnabled,
    schedulingRules,
    bookingSettings,
    demoDataExists,
  ] = await Promise.all([
    getChefPreferences(),
    getGoogleConnection(),
    getGmailSyncHistory(10),
    getHistoricalScanStatus(),
    getWixConnection(),
    getWixSubmissions({ limit: 10 }),
    getNetworkDiscoverable(),
    getGoogleReviewUrl(),
    getChefSlug(),
    getBusinessMode(),
    getAvailabilitySignalSetting(),
    getSchedulingRules().catch(() => null),
    getBookingSettings().catch(() => null),
    hasDemoData().catch(() => false),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-600 mt-1">
          Configure your defaults and account settings in organized categories.
        </p>
      </div>

      <SettingsCategory
        title="Business Defaults"
        description="Home base, stores, timing, operating procedures, revenue goals, and dashboard layout."
        defaultOpen
      >
        <div className="space-y-4">
          <BusinessModeToggle
            isBusinessMode={businessMode.is_business}
            businessLegalName={businessMode.business_legal_name}
            businessAddress={businessMode.business_address}
          />
          <Link
            href="/settings/dashboard"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Customize Dashboard</p>
            <p className="text-sm text-stone-500 mt-1">
              Turn widgets on or off. Reorder them from the dashboard corner layout control.
            </p>
          </Link>
          <Link
            href="/settings/navigation"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Primary Navigation</p>
            <p className="text-sm text-stone-500 mt-1">
              Choose which tabs are always visible in your primary bar and set their order.
            </p>
          </Link>
          <Link
            href="/goals/setup"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Goals</p>
            <p className="text-sm text-stone-500 mt-1">
              Set revenue, booking, and margin targets. Track monthly progress and get client
              outreach recommendations.
            </p>
          </Link>
          <PreferencesForm preferences={preferences} />
        </div>
      </SettingsCategory>

      <SettingsCategory
        title="Profile & Branding"
        description="Manage your core chef profile, public profile presentation, and portal background."
      >
        <div className="space-y-4">
          <Link
            href="/settings/my-profile"
            className="block border border-brand-200 rounded-lg p-4 bg-brand-50/40 hover:bg-brand-50 transition-colors"
          >
            <p className="font-semibold text-brand-900">My Profile</p>
            <p className="text-sm text-brand-700 mt-1">
              Edit your core chef profile, image, and review link in one place.
            </p>
          </Link>

          <ChefBackgroundSettings
            currentBackgroundColor={profile.portal_background_color}
            currentBackgroundImageUrl={profile.portal_background_image_url}
          />

          <AvailabilitySignalToggle initialEnabled={availabilitySignalEnabled} />

          <div className="space-y-3">
            <Link
              href="/settings/public-profile"
              className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
            >
              <p className="font-medium text-stone-900">Profile & Partner Showcase</p>
              <p className="text-sm text-stone-500 mt-1">
                See what clients can view on your profile and control your tagline and partner
                showcase.
              </p>
            </Link>
            <Link
              href="/settings/favorite-chefs"
              className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
            >
              <p className="font-medium text-stone-900">Favorite Chefs</p>
              <p className="text-sm text-stone-500 mt-1">
                Celebrate the culinary heroes who inspire your craft. Share your list on social
                media.
              </p>
            </Link>
            <Link
              href="/settings/client-preview"
              className="block border border-brand-200 rounded-lg p-4 bg-brand-50/40 hover:bg-brand-50 transition-colors"
            >
              <p className="font-semibold text-brand-900">Client Preview</p>
              <p className="text-sm text-brand-700 mt-1">
                See your public profile and client portal exactly as your clients do — with real
                data.
              </p>
            </Link>
            {profile.slug && (
              <Link
                href={`/chef/${profile.slug}`}
                target="_blank"
                className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Open Live Profile
              </Link>
            )}
          </div>
        </div>
      </SettingsCategory>

      <SettingsCategory
        title="AI & Privacy"
        description="Control Remy, understand how your data is handled, and manage AI features."
        defaultOpen
      >
        <div className="space-y-3">
          <Link
            href="/settings/ai-privacy"
            className="block border border-emerald-200 rounded-lg p-4 bg-emerald-50/40 hover:bg-emerald-50 transition-colors"
          >
            <p className="font-semibold text-emerald-900">AI Trust Center</p>
            <p className="text-sm text-emerald-700 mt-1">
              See exactly how Remy works, where your data goes, and manage all AI controls. Walk
              through privacy practices and delete data anytime.
            </p>
          </Link>
          <Link
            href="/settings/culinary-profile"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Culinary Profile</p>
            <p className="text-sm text-stone-500 mt-1">
              Tell Remy about your cooking philosophy, signature dishes, and food identity.
            </p>
          </Link>
        </div>
      </SettingsCategory>

      <SettingsCategory
        title="Connected Accounts & Integrations"
        description="Connect inbox and website channels, then manage system integrations."
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Connected Accounts</h3>
            <div className="space-y-4">
              <GoogleIntegrations
                connection={googleConnection}
                recentSyncs={recentSyncs}
                historicalScanStatus={historicalScanStatus}
              />
              <WixConnection connection={wixConnection} recentSubmissions={wixSubmissions} />
            </div>
          </div>
          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Integration Center</h3>
            <div className="space-y-3">
              <Link
                href="/settings/embed"
                className="block border border-brand-200 rounded-lg p-4 bg-brand-50/40 hover:bg-brand-50 transition-colors"
              >
                <p className="font-semibold text-brand-900">Website Widget</p>
                <p className="text-sm text-brand-700 mt-1">
                  Add a booking form to your existing website. Works on Wix, Squarespace, WordPress,
                  and any site.
                </p>
              </Link>
              <Link
                href="/settings/integrations"
                className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
              >
                <p className="font-medium text-stone-900">Manage Integrations</p>
                <p className="text-sm text-stone-500 mt-1">
                  Manage POS, website, scheduling, and CRM integrations in one place.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </SettingsCategory>

      <SettingsCategory
        title="Availability Rules"
        description="Set hard blocks, event limits, and buffer time so ChefFlow warns you before double-booking."
      >
        <SchedulingRulesForm initialRules={schedulingRules} />
      </SettingsCategory>

      <SettingsCategory
        title="Booking Page"
        description="Share a link clients can use to check your availability and submit a booking request."
      >
        <BookingPageSettings
          initialSettings={
            bookingSettings ??
            ({
              booking_enabled: false,
              booking_slug: null,
              booking_headline: null,
              booking_bio_short: null,
              booking_min_notice_days: 7,
              booking_model: 'inquiry_first',
              booking_base_price_cents: null,
              booking_pricing_type: 'flat_rate',
              booking_deposit_type: 'percent',
              booking_deposit_percent: null,
              booking_deposit_fixed_cents: null,
            } as BookingSettings)
          }
        />
      </SettingsCategory>

      <SettingsCategory
        title="Communication & Workflow"
        description="Manage messaging templates, automations, and your creative planning systems."
      >
        <div className="space-y-3">
          <Link
            href="/settings/templates"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Response Templates</p>
            <p className="text-sm text-stone-500 mt-1">
              Pre-written messages you can quickly copy and customize when logging communication.
            </p>
          </Link>
          <Link
            href="/settings/automations"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Automations</p>
            <p className="text-sm text-stone-500 mt-1">
              Set up rules to auto-create follow-ups, notifications, and draft messages when events
              happen.
            </p>
          </Link>
          <Link
            href="/settings/repertoire"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Seasonal Palettes</p>
            <p className="text-sm text-stone-500 mt-1">
              Define your creative thesis, micro-windows, context profiles, and proven wins for each
              season.
            </p>
          </Link>
          <Link
            href="/settings/journal"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Chef Journal</p>
            <p className="text-sm text-stone-500 mt-1">
              Track travel inspiration, favorite meals, lessons learned, and ideas to bring back
              into your kitchen.
            </p>
          </Link>
        </div>
      </SettingsCategory>

      <SettingsCategory
        title="Client Reviews"
        description="Configure your review link and review collection flow."
      >
        <div className="space-y-3">
          <GoogleReviewUrlForm currentUrl={googleReviewUrl} />
          <Link
            href="/reviews"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">View All Reviews</p>
            <p className="text-sm text-stone-500 mt-1">
              See unified internal + external reviews with source links and sync controls.
            </p>
          </Link>
        </div>
      </SettingsCategory>

      <SettingsCategory
        title="Chef Network"
        description="Control network visibility and your chef directory profile."
      >
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
      </SettingsCategory>

      <SettingsCategory
        title="Desktop App"
        description="System tray, auto-start, and native desktop notifications for the ChefFlow desktop app."
      >
        <DesktopAppSettings />
      </SettingsCategory>

      <SettingsCategory
        title="Notifications & Alerts"
        description="Control email, browser push, and SMS alerts by category."
      >
        <Link
          href="/settings/notifications"
          className="block border border-brand-200 rounded-lg p-4 bg-brand-50/40 hover:bg-brand-50 transition-colors"
        >
          <p className="font-semibold text-brand-900">Notification Channels</p>
          <p className="text-sm text-brand-700 mt-1">
            Manage email, browser push, and SMS preferences per category. Set up your SMS number
            here.
          </p>
        </Link>
      </SettingsCategory>

      <SettingsCategory
        title="Sample Data"
        description="Load or remove sample clients, events, and inquiries to explore ChefFlow."
      >
        <DemoDataManager hasDemoData={demoDataExists} />
      </SettingsCategory>

      <SettingsCategory
        title="Share Feedback"
        description="Tell us what you love, what frustrates you, or anything in between. We read every submission."
      >
        <FeedbackForm />
      </SettingsCategory>

      <SettingsCategory
        title="Account & Security"
        description="Password, account-level management, and system status."
      >
        <div className="space-y-3">
          <Link
            href="/settings/health"
            className="block border border-emerald-200 rounded-lg p-4 hover:bg-emerald-50/50 transition-colors"
          >
            <p className="font-medium text-stone-900">System Health</p>
            <p className="text-sm text-stone-500 mt-1">
              Check Stripe, Gmail, and DOP task status at a glance.
            </p>
          </Link>
          <Link
            href="/settings/change-password"
            className="block border rounded-lg p-4 hover:bg-stone-50 transition-colors"
          >
            <p className="font-medium text-stone-900">Change Password</p>
            <p className="text-sm text-stone-500 mt-1">Update your account password.</p>
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
      </SettingsCategory>
    </div>
  )
}
