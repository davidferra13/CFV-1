// Public Profile Settings — Set slug, tagline, manage showcase partners

import { requireChef } from '@/lib/auth/get-user'
import { getChefSlug } from '@/lib/profile/actions'
import { getPartners } from '@/lib/partners/actions'
import { Card } from '@/components/ui/card'
import { PublicProfileSettings } from '@/components/settings/public-profile-settings'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PublicProfileSettingsPage() {
  await requireChef()

  const [profile, partners] = await Promise.all([
    getChefSlug(),
    getPartners(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Public Profile</h1>
          <p className="text-stone-600 mt-1">
            Manage your public profile URL and partner showcase
          </p>
        </div>
        {profile.slug && (
          <Link href={`/chef/${profile.slug}`} target="_blank">
            <Button variant="secondary">View Public Page</Button>
          </Link>
        )}
      </div>

      <PublicProfileSettings
        currentSlug={profile.slug}
        currentTagline={profile.tagline}
        partners={partners.map(p => ({
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
