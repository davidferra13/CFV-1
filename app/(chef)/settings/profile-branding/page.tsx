import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getChefSlug } from '@/lib/profile/actions'
import { getNetworkDiscoverable } from '@/lib/network/actions'
import { getAvailabilitySignalSetting } from '@/lib/calendar/signal-settings-actions'
import { SettingsCategory } from '@/components/settings/settings-category'
import { BrandingCard } from '@/components/settings/branding-card'
import { ChefBackgroundSettings } from '@/components/settings/chef-background-settings'
import { AvailabilitySignalToggle } from '@/components/calendar/availability-signal-toggle'
import { DiscoverabilityToggle } from '@/components/network/discoverability-toggle'
import { ActivitySharingToggle } from '@/components/network/activity-sharing-toggle'
import { getActivitySharingStatus, getOwnActivitySnapshot } from '@/lib/network/activity/actions'

export const metadata: Metadata = { title: 'Settings - Profile & Identity' }

export default async function ProfileBrandingSettingsPage() {
  const user = await requireChef()
  const db: any = createServerClient()
  const [
    profile,
    networkDiscoverable,
    availabilitySignalEnabled,
    activitySharingEnabled,
    ownSnapshot,
  ] = await Promise.all([
    getChefSlug(),
    getNetworkDiscoverable().catch(() => false),
    getAvailabilitySignalSetting().catch(() => false),
    getActivitySharingStatus().catch(() => false),
    getOwnActivitySnapshot().catch(() => null),
  ])

  const profileData = await db
    .from('chefs')
    .select(
      'slug, tagline, bio, profile_image_url, portal_primary_color, portal_background_color, portal_background_image_url, business_name, logo_url'
    )
    .eq('id', user.entityId)
    .single()
    .then(({ data }: { data: any }) => data ?? {})
    .catch(() => ({}))

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
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Profile &amp; Identity</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Your brand, public profile, appearance, professional growth, and network presence.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Profile & Branding"
          description="Your business identity and public presence."
          icon="Palette"
          primary
          tone="neutral"
          defaultOpen={true}
        >
          <BrandingCard
            logoUrl={profileData.logo_url}
            businessName={profileData.business_name}
            primaryColor={profileData.portal_primary_color}
          />

          <div className="mt-4">
            <Link
              href="/settings/my-profile"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">My Profile</p>
              <p className="text-sm text-brand-400 mt-1">
                Edit the name, bio, image, website, and review links clients see.
              </p>
            </Link>
          </div>

          <div className="mt-4">
            <ChefBackgroundSettings
              currentBackgroundColor={profileData.portal_background_color}
              currentBackgroundImageUrl={profileData.portal_background_image_url}
            />
          </div>

          <div className="mt-4">
            <AvailabilitySignalToggle initialEnabled={availabilitySignalEnabled} />
          </div>

          <div className="mt-4 space-y-3">
            <Link
              href="/settings/public-profile"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Public Profile</p>
              <p className="text-sm text-stone-500 mt-1">
                Set your public URL, page theme, and partner listings.
              </p>
            </Link>

            <Link
              href="/settings/favorite-chefs"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Inspiration Board</p>
              <p className="text-sm text-stone-500 mt-1">
                Chefs and creators you follow for inspiration.
              </p>
            </Link>

            <Link
              href="/settings/client-preview"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">Client Preview</p>
              <p className="text-sm text-brand-400 mt-1">
                See what your clients see when they visit your portal.
              </p>
            </Link>

            <Link
              href="/settings/embed"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Website Widget</p>
              <p className="text-sm text-stone-500 mt-1">
                Add a booking form to your existing website. Works with Wix, Squarespace, WordPress,
                and any site.
              </p>
            </Link>
          </div>

          {profileData.slug && (
            <div className="mt-4">
              <Link
                href={`/chef/${profileData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Open Live Profile
              </Link>
            </div>
          )}
        </SettingsCategory>

        <SettingsCategory
          title="Appearance"
          description="Theme and display preferences."
          icon="Sun"
          tone="neutral"
          defaultOpen={true}
        >
          <Link
            href="/settings/appearance"
            className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
          >
            <p className="font-medium text-stone-100">Theme</p>
            <p className="text-sm text-stone-500 mt-1">Switch between light and dark mode.</p>
          </Link>
        </SettingsCategory>

        <SettingsCategory
          title="Chef Network"
          description="Directory presence and discoverability."
          icon="Users"
          tone="neutral"
          defaultOpen={true}
        >
          <DiscoverabilityToggle currentValue={networkDiscoverable} />

          <div className="mt-3">
            <ActivitySharingToggle
              currentValue={activitySharingEnabled}
              ownSnapshot={ownSnapshot}
            />
          </div>

          <div className="mt-4">
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
    </div>
  )
}
