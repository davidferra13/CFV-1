// Public Profile Settings — Set slug, tagline, manage showcase partners

import { requireChef } from '@/lib/auth/get-user'
import { getChefSlug } from '@/lib/profile/actions'
import { getPartners } from '@/lib/partners/actions'
import { PublicProfileSettings } from '@/components/settings/public-profile-settings'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PublicProfileSettingsPage() {
  await requireChef()

  const [profile, partners] = await Promise.all([getChefSlug(), getPartners()])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Public Profile</h1>
          <p className="text-stone-400 mt-1">
            See what clients will see when they view your profile, then update your details and
            partner showcase.
          </p>
        </div>
        {profile.slug && (
          <Link href={`/chef/${profile.slug}`} target="_blank">
            <Button variant="secondary">Client&apos;s View</Button>
          </Link>
        )}
      </div>

      <PublicProfileSettings
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
    </div>
  )
}
