// Chef Settings Page
// Configure home base, default stores, timing defaults, and DOP preferences.
// Set once, rarely changed.

import type { Metadata } from 'next'
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
import { isAdmin } from '@/lib/auth/admin'
import { SettingsCategory } from '@/components/settings/settings-category'

function SettingsGroupHeader({
  label,
  description,
  first = false,
}: {
  label: string
  description?: string
  first?: boolean
}) {
  return (
    <div className={first ? '' : 'mt-10'}>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 whitespace-nowrap">
          {label}
        </h3>
        <div className="flex-1 border-t border-stone-800" />
      </div>
      {description && <p className="text-xs text-stone-600 -mt-1 mb-3">{description}</p>}
    </div>
  )
}

export default async function SettingsPage() {
  const user = await requireChef()
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
    userIsAdmin,
  ] = await Promise.all([
    getChefPreferences(),
    getGoogleConnection().catch((err) => {
      console.error('[Settings] getGoogleConnection failed:', err)
      return {
        gmail: { connected: false, email: null, lastSync: null, errorCount: 0 },
        calendar: { connected: false, email: null, lastSync: null },
      } as Awaited<ReturnType<typeof getGoogleConnection>>
    }),
    getGmailSyncHistory(10).catch(() => []),
    getHistoricalScanStatus().catch(() => null),
    getWixConnection().catch(() => null),
    getWixSubmissions({ limit: 10 }).catch(() => []),
    getNetworkDiscoverable().catch(() => false),
    getGoogleReviewUrl().catch(() => null),
    getChefSlug(),
    getBusinessMode(),
    getAvailabilitySignalSetting().catch(() => false),
    getSchedulingRules().catch(() => null),
    getBookingSettings().catch(() => null),
    hasDemoData().catch(() => false),
    isAdmin().catch(() => false),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-100">Settings</h1>
        <p className="text-stone-400 mt-1">
          Configure your defaults and account settings in organized categories.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GROUP A: YOUR BUSINESS                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SettingsGroupHeader
        label="Your Business"
        description="Core settings for how you run your practice"
        first
      />
      <div className="space-y-3">
        {/* ── 1. Business Defaults ─────────────────────────────── */}
        <SettingsCategory
          title="Business Defaults"
          description="Home base, stores, timing, operating procedures, revenue goals, and dashboard layout."
          icon="Building2"
          primary
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
              <p className="font-medium text-stone-100">Primary Navigation</p>
              <p className="text-sm text-stone-500 mt-1">
                Choose which tabs are always visible in your primary bar and set their order.
              </p>
            </Link>
            <Link
              href="/goals/setup"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Goals</p>
              <p className="text-sm text-stone-500 mt-1">
                Set revenue, booking, and margin targets. Track monthly progress and get client
                outreach recommendations.
              </p>
            </Link>
            <PreferencesForm preferences={preferences} />
          </div>
        </SettingsCategory>

        {/* ── 2. Profile & Branding ────────────────────────────── */}
        <SettingsCategory
          title="Profile & Branding"
          description="Manage your core chef profile, public profile presentation, and portal background."
          icon="Palette"
          primary
        >
          <div className="space-y-4">
            <Link
              href="/settings/my-profile"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">My Profile</p>
              <p className="text-sm text-brand-400 mt-1">
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
                className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
              >
                <p className="font-medium text-stone-100">Profile & Partner Showcase</p>
                <p className="text-sm text-stone-500 mt-1">
                  See what clients can view on your profile and control your tagline and partner
                  showcase.
                </p>
              </Link>
              <Link
                href="/settings/favorite-chefs"
                className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
              >
                <p className="font-medium text-stone-100">Favorite Chefs</p>
                <p className="text-sm text-stone-500 mt-1">
                  Celebrate the culinary heroes who inspire your craft. Share your list on social
                  media.
                </p>
              </Link>
              <Link
                href="/settings/client-preview"
                className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
              >
                <p className="font-semibold text-brand-200">Client Preview</p>
                <p className="text-sm text-brand-400 mt-1">
                  See your public profile and client portal exactly as your clients do — with real
                  data.
                </p>
              </Link>
              {profile.slug && (
                <Link
                  href={`/chef/${profile.slug}`}
                  target="_blank"
                  className="inline-flex items-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
                >
                  Open Live Profile
                </Link>
              )}
            </div>
          </div>
        </SettingsCategory>

        {/* ── 3. Availability Rules ────────────────────────────── */}
        <SettingsCategory
          title="Availability Rules"
          description="Set hard blocks, event limits, and buffer time so ChefFlow warns you before double-booking."
          icon="CalendarClock"
          primary
        >
          <SchedulingRulesForm initialRules={schedulingRules} />
        </SettingsCategory>

        {/* ── 4. Booking Page ──────────────────────────────────── */}
        <SettingsCategory
          title="Booking Page"
          description="Share a link clients can use to check your availability and submit a booking request."
          icon="CalendarCheck"
          primary
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

        {/* ── 5. Event Configuration ───────────────────────────── */}
        <SettingsCategory
          title="Event Configuration"
          description="Customize event types, labels, and add extra fields to capture your business-specific data."
          icon="Settings2"
          primary
        >
          <div className="space-y-3">
            <Link
              href="/settings/event-types"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Event Types & Labels</p>
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

        {/* ── 6. Payments & Billing ────────────────────────────── */}
        <SettingsCategory
          title="Payments & Billing"
          description="Stripe payouts, your ChefFlow subscription, and feature module toggles."
          icon="CreditCard"
          primary
        >
          <div className="space-y-3">
            <Link
              href="/settings/stripe-connect"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">Stripe Payouts</p>
              <p className="text-sm text-brand-400 mt-1">
                Connect your Stripe account to receive client payments directly to your bank
                account.
              </p>
            </Link>
            <Link
              href="/settings/billing"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Subscription & Billing</p>
              <p className="text-sm text-stone-500 mt-1">
                Manage your ChefFlow Professional plan, view invoices, and upgrade or downgrade.
              </p>
            </Link>
            <Link
              href="/settings/modules"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Modules</p>
              <p className="text-sm text-stone-500 mt-1">
                Choose which features appear in your sidebar. Toggle modules on or off to keep your
                workspace focused.
              </p>
            </Link>
            <Link
              href="/settings/payment-methods"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Digital Wallets</p>
              <p className="text-sm text-stone-500 mt-1">
                Enable or disable Apple Pay and Google Pay for your client checkout sessions.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GROUP B: COMMUNICATION                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SettingsGroupHeader label="Communication" description="Messaging, automations, and alerts" />
      <div className="space-y-3">
        {/* ── 7. Communication & Workflow ──────────────────────── */}
        <SettingsCategory
          title="Communication & Workflow"
          description="Manage messaging templates, automations, and your creative planning systems."
          icon="MessageSquare"
          primary
        >
          <div className="space-y-3">
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
              href="/settings/menu-templates"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Front-of-House Menu Templates</p>
              <p className="text-sm text-stone-500 mt-1">
                Customize default, holiday, and special-event templates used by FOH menu generation.
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
            <Link
              href="/settings/repertoire"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Seasonal Palettes</p>
              <p className="text-sm text-stone-500 mt-1">
                Define your creative thesis, micro-windows, context profiles, and proven wins for
                each season.
              </p>
            </Link>
            <Link
              href="/settings/journal"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Chef Journal</p>
              <p className="text-sm text-stone-500 mt-1">
                Track travel inspiration, favorite meals, lessons learned, and ideas to bring back
                into your kitchen.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        {/* ── 8. Notifications & Alerts ────────────────────────── */}
        <SettingsCategory
          title="Notifications & Alerts"
          description="Control email, browser push, and SMS alerts by category."
          icon="Bell"
          primary
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
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GROUP C: CONNECTIONS & AI                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SettingsGroupHeader
        label="Connections & AI"
        description="External services, reviews, and intelligence"
      />
      <div className="space-y-3">
        {/* ── 9. Connected Accounts & Integrations ─────────────── */}
        <SettingsCategory
          title="Connected Accounts & Integrations"
          description="Connect inbox and website channels, then manage system integrations."
          icon="Plug"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-3">Connected Accounts</h3>
              <div className="space-y-4">
                <GoogleIntegrations
                  connection={googleConnection}
                  recentSyncs={recentSyncs}
                  historicalScanStatus={historicalScanStatus}
                />
                <WixConnection
                  connection={wixConnection as any}
                  recentSubmissions={wixSubmissions}
                />
              </div>
            </div>
            <div className="border-t border-stone-700 pt-4">
              <h3 className="text-sm font-semibold text-stone-300 mb-3">Integration Center</h3>
              <div className="space-y-3">
                <Link
                  href="/settings/embed"
                  className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
                >
                  <p className="font-semibold text-brand-200">Website Widget</p>
                  <p className="text-sm text-brand-400 mt-1">
                    Add a booking form to your existing website. Works on Wix, Squarespace,
                    WordPress, and any site.
                  </p>
                </Link>
                <Link
                  href="/settings/integrations"
                  className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                >
                  <p className="font-medium text-stone-100">Manage Integrations</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Manage POS, website, scheduling, and CRM integrations in one place.
                  </p>
                </Link>
                <Link
                  href="/settings/calendar-sync"
                  className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                >
                  <p className="font-medium text-stone-100">Calendar Sync (iCal)</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Generate a subscribe-by-URL feed that auto-syncs events to Apple Calendar,
                    Outlook, or Google Calendar.
                  </p>
                </Link>
                <Link
                  href="/settings/zapier"
                  className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
                >
                  <p className="font-medium text-stone-100">Zapier & Webhooks</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Connect ChefFlow to 5,000+ apps via Zapier or Make. Manage webhook subscriptions
                    and delivery logs.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </SettingsCategory>

        {/* ── 10. AI & Privacy ─────────────────────────────────── */}
        <SettingsCategory
          title="AI & Privacy"
          description="Control Remy, understand how your data is handled, and manage AI features."
          icon="Brain"
        >
          <div className="space-y-3">
            <Link
              href="/settings/ai-privacy"
              className="block border border-emerald-200 rounded-lg p-4 bg-emerald-950/40 hover:bg-emerald-950 transition-colors"
            >
              <p className="font-semibold text-emerald-900">AI Trust Center</p>
              <p className="text-sm text-emerald-700 mt-1">
                See exactly how Remy works, where your data goes, and manage all AI controls. Walk
                through privacy practices and delete data anytime.
              </p>
            </Link>
            <Link
              href="/settings/culinary-profile"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Culinary Profile</p>
              <p className="text-sm text-stone-500 mt-1">
                Tell Remy about your cooking philosophy, signature dishes, and food identity.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        {/* ── 11. Client Reviews ───────────────────────────────── */}
        <SettingsCategory
          title="Client Reviews"
          description="Configure your review link and review collection flow."
          icon="Star"
        >
          <div className="space-y-3">
            <GoogleReviewUrlForm currentUrl={googleReviewUrl} />
            <Link
              href="/settings/yelp"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Yelp Reviews</p>
              <p className="text-sm text-stone-500 mt-1">
                Connect your Yelp business listing to automatically sync reviews into ChefFlow.
              </p>
            </Link>
            <Link
              href="/reviews"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">View All Reviews</p>
              <p className="text-sm text-stone-500 mt-1">
                See unified internal + external reviews with source links and sync controls.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GROUP D: YOU & YOUR CAREER                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SettingsGroupHeader
        label="You & Your Career"
        description="Branding, growth, network, and appearance"
      />
      <div className="space-y-3">
        {/* ── 12. Appearance ───────────────────────────────────── */}
        <SettingsCategory
          title="Appearance"
          description="Customize how ChefFlow looks — theme and color mode."
          icon="Sun"
        >
          <Link
            href="/settings/appearance"
            className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
          >
            <p className="font-medium text-stone-100">Theme</p>
            <p className="text-sm text-stone-500 mt-1">Switch between light and dark mode.</p>
          </Link>
        </SettingsCategory>

        {/* ── 13. Professional Growth ──────────────────────────── */}
        <SettingsCategory
          title="Professional Growth"
          description="Track achievements, skills, career momentum, portfolio, and profile highlights."
          icon="TrendingUp"
        >
          <div className="space-y-3">
            <Link
              href="/settings/professional"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Professional Development</p>
              <p className="text-sm text-stone-500 mt-1">
                Log competitions, stages, press features, awards, courses, and learning goals.
              </p>
            </Link>
            <Link
              href="/settings/professional/skills"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Capability Inventory</p>
              <p className="text-sm text-stone-500 mt-1">
                Rate your confidence across cuisines, dietary needs, and techniques.
              </p>
            </Link>
            <Link
              href="/settings/professional/momentum"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Professional Momentum</p>
              <p className="text-sm text-stone-500 mt-1">
                Track growth across new dishes, cuisines, education, and creative projects.
              </p>
            </Link>
            <Link
              href="/settings/highlights"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Profile Highlights</p>
              <p className="text-sm text-stone-500 mt-1">
                Feature key achievements, certifications, press mentions, and awards on your
                profile.
              </p>
            </Link>
            <Link
              href="/settings/portfolio"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Portfolio</p>
              <p className="text-sm text-stone-500 mt-1">
                Curate the photos and descriptions that appear on your public profile.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        {/* ── 14. Chef Network ─────────────────────────────────── */}
        <SettingsCategory
          title="Chef Network"
          description="Control network visibility and your chef directory profile."
          icon="Users"
        >
          <div className="space-y-3">
            <DiscoverabilityToggle currentValue={networkDiscoverable} />
            <Link
              href="/settings/profile"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Network Profile</p>
              <p className="text-sm text-stone-500 mt-1">
                Set your display name, bio, and profile photo for the chef directory.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GROUP E: SYSTEM & ACCOUNT                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <SettingsGroupHeader
        label="System & Account"
        description="Developer tools, legal, and account management"
      />
      <div className="space-y-3">
        {/* ── 15. Legal & Protection ───────────────────────────── */}
        <SettingsCategory
          title="Legal & Protection"
          description="Insurance, certifications, contracts, compliance, emergency contacts, and crisis planning."
          icon="ShieldCheck"
        >
          <div className="space-y-3">
            <Link
              href="/settings/protection"
              className="block border border-amber-700 rounded-lg p-4 bg-amber-950/40 hover:bg-amber-950 transition-colors"
            >
              <p className="font-semibold text-amber-200">Protection Hub</p>
              <p className="text-sm text-amber-400 mt-1">
                Insurance, certifications, NDA, business continuity, and crisis response — all in
                one dashboard.
              </p>
            </Link>
            <Link
              href="/settings/contracts"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Contract Templates</p>
              <p className="text-sm text-stone-500 mt-1">
                Create reusable contract templates with merge fields for event-specific values.
              </p>
            </Link>
            <Link
              href="/settings/compliance"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Food Safety & Compliance</p>
              <p className="text-sm text-stone-500 mt-1">
                Track certifications, licenses, and insurance with expiry reminders.
              </p>
            </Link>
            <Link
              href="/settings/compliance/gdpr"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">GDPR & Privacy</p>
              <p className="text-sm text-stone-500 mt-1">
                Manage data privacy, exports, and compliance tools.
              </p>
            </Link>
            <Link
              href="/settings/emergency"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Emergency Contacts</p>
              <p className="text-sm text-stone-500 mt-1">
                Backup contacts for event incapacitation — a sous chef, business partner, or peer
                who can step in.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        {/* ── 16. Sample Data ──────────────────────────────────── */}
        <SettingsCategory
          title="Sample Data"
          description="Load or remove sample clients, events, and inquiries to explore ChefFlow."
          icon="Database"
        >
          <DemoDataManager hasDemoData={demoDataExists} />
        </SettingsCategory>

        {/* ── 17. API & Developer ──────────────────────────────── */}
        <SettingsCategory
          title="API & Developer"
          description="API keys and webhooks for integrating ChefFlow with external tools."
          icon="Code"
        >
          <div className="space-y-3">
            <Link
              href="/settings/api-keys"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">API Keys</p>
              <p className="text-sm text-stone-500 mt-1">
                Create API keys to integrate ChefFlow with other tools and services.
              </p>
            </Link>
            <Link
              href="/settings/webhooks"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Webhooks</p>
              <p className="text-sm text-stone-500 mt-1">
                Send real-time data to external services when events occur in ChefFlow.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        {/* ── 18. Desktop App ──────────────────────────────────── */}
        <SettingsCategory
          title="Desktop App"
          description="System tray, auto-start, and native desktop notifications for the ChefFlow desktop app."
          icon="Monitor"
        >
          <DesktopAppSettings />
        </SettingsCategory>

        {/* ── 19. Share Feedback ───────────────────────────────── */}
        <SettingsCategory
          title="Share Feedback"
          description="Tell us what you love, what frustrates you, or anything in between. We read every submission."
          icon="MessageCircle"
        >
          <FeedbackForm />
        </SettingsCategory>

        {/* ── 20. Account & Security ───────────────────────────── */}
        <SettingsCategory
          title="Account & Security"
          description="Password, account-level management, and system status."
          icon="Lock"
        >
          <div className="space-y-3">
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
            <Link
              href="/settings/change-password"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Change Password</p>
              <p className="text-sm text-stone-500 mt-1">Update your account password.</p>
            </Link>
            <Link
              href="/settings/delete-account"
              className="block border border-red-200 rounded-lg p-4 hover:bg-red-950 transition-colors"
            >
              <p className="font-medium text-red-700">Delete Account</p>
              <p className="text-sm text-red-500 mt-1">
                Permanently delete your account and all associated data.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
