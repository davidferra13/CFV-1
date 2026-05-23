// Public Profile Settings - Set slug, tagline, manage showcase partners

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getMyDiscoveryProfile } from '@/lib/discovery/actions'
import { getChefSlug } from '@/lib/profile/actions'
import { getPartners } from '@/lib/partners/actions'
import { DiscoveryProfileSettings } from '@/components/settings/discovery-profile-settings'
import { PublicProfileSettings } from '@/components/settings/public-profile-settings'
import { ShowcaseStudioOverview } from '@/components/public/showcase-studio-overview'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Public Profile | ChefFlow' }

export default async function PublicProfileSettingsPage() {
  await requireChef()

  const [profile, partners, discoveryProfile] = await Promise.all([
    getChefSlug(),
    getPartners(),
    getMyDiscoveryProfile(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Public Profile</h1>
          <p className="text-stone-400 mt-1">
            Set the public URL clients can open, then tune the live page, SEO-facing headline, and
            partner showcase.
          </p>
        </div>
        {profile.slug && (
          <Link href={`/chef/${profile.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Open Live Profile</Button>
          </Link>
        )}
      </div>

      <ShowcaseStudioOverview
        publicSlug={profile.slug}
        hasTagline={Boolean(profile.tagline)}
        hasHeroImage={Boolean(
          profile.portal_background_image_url || discoveryProfile?.hero_image_url
        )}
        visiblePartnerCount={partners.filter((p: any) => p.is_showcase_visible).length}
        acceptingInquiries={Boolean(discoveryProfile?.accepting_inquiries)}
      />

      <PublicProfileSettings
        currentSlug={profile.slug}
        currentTagline={profile.tagline}
        currentPrimaryColor={profile.portal_primary_color}
        currentBackgroundColor={profile.portal_background_color}
        currentBackgroundImageUrl={profile.portal_background_image_url}
        partners={partners.map((p: any) => ({
          id: p.id,
          name: p.name,
          partner_type: p.partner_type,
          is_showcase_visible: p.is_showcase_visible,
          showcase_order: p.showcase_order ?? 0,
        }))}
      />

      <DiscoveryProfileSettings profile={discoveryProfile} />
    </div>
  )
}
