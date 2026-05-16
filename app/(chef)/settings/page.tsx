// Chef Settings Page
// Overview page: header, fix actions, guided overview, and mobile category navigation.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getGoogleConnection } from '@/lib/google/auth'
import { getSchedulingRules } from '@/lib/availability/rules-actions'
import { getBookingSettings } from '@/lib/booking/booking-settings-actions'
import { getGoogleReviewUrl } from '@/lib/reviews/actions'
import { getWixConnection } from '@/lib/wix/actions'
import { getChefSlug } from '@/lib/profile/actions'
import { hasChefFeatureFlag, CHEF_FEATURE_FLAGS } from '@/lib/features/chef-feature-flags'
import { resolveSettingsFixTasks } from '@/lib/interface/action-layer'
import { SettingsFixActions } from '@/components/settings/settings-fix-actions'
import { SettingsGuidedOverview } from '@/components/settings/settings-guided-overview'
import { SettingsMobileNav } from '@/components/settings/settings-mobile-nav'
import { FeedbackForm } from '@/components/feedback/feedback-form'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const [
    googleConnection,
    schedulingRules,
    bookingSettings,
    googleReviewUrl,
    wixConnection,
    profileReadiness,
    developerToolsEnabled,
  ] = await Promise.all([
    getGoogleConnection().catch((err) => {
      console.error('[Settings] getGoogleConnection failed:', err)
      return {
        gmail: { connected: false, email: null, lastSync: null, errorCount: 0 },
        calendar: {
          connected: false,
          email: null,
          lastSync: null,
          checkedAt: null,
          health: 'unknown',
          healthDetail: null,
          busyRangeCount: 0,
          conflictCount: 0,
          calendarCount: 0,
        },
      } as Awaited<ReturnType<typeof getGoogleConnection>>
    }),
    getSchedulingRules().catch(() => null),
    getBookingSettings().catch(() => null),
    getGoogleReviewUrl().catch(() => null),
    getWixConnection().catch(() => null),
    db
      .from('chefs')
      .select('slug, tagline, bio, profile_image_url')
      .eq('id', user.entityId)
      .single()
      .then(({ data }: { data: any }) => ({
        slug: data?.slug ?? null,
        tagline: data?.tagline ?? null,
        bio: data?.bio ?? null,
        profileImageUrl: data?.profile_image_url ?? null,
        publicProfileHidden:
          Boolean(data?.slug) &&
          (!String(data?.bio ?? '').trim() || !String(data?.tagline ?? '').trim()),
      }))
      .catch(() => ({
        slug: null,
        tagline: null,
        bio: null,
        profileImageUrl: null,
        publicProfileHidden: false,
      })),
    hasChefFeatureFlag(CHEF_FEATURE_FLAGS.developerTools).catch(() => false),
  ])

  const fixTasks = resolveSettingsFixTasks({
    profile: profileReadiness,
    googleConnection,
    schedulingRules,
    bookingSettings,
    googleReviewUrl,
    wixConnection,
  })

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Your business configuration, organized by area. Pick a category from the sidebar or start
          with a fix action below.
        </p>
      </div>

      {/* Fix actions */}
      <SettingsFixActions tasks={fixTasks} />

      {/* Guided overview cards - desktop */}
      <div className="mt-8 hidden md:block">
        <h2 className="text-lg font-semibold text-stone-200 mb-4">Quick access</h2>
        <SettingsGuidedOverview />
      </div>

      {/* Mobile category navigation */}
      <div className="mt-8 md:hidden">
        <h2 className="text-lg font-semibold text-stone-200 mb-4">Categories</h2>
        <SettingsMobileNav developerToolsEnabled={developerToolsEnabled} />
      </div>

      <FeedbackForm pageContext="/settings" />
    </>
  )
}
