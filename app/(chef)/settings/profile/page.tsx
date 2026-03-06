// Network Profile Settings - Edit display name, bio, and profile image
// Sub-page of Settings, following the same pattern as change-password, templates, etc.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getChefProfile } from '@/lib/network/actions'
import { ProfileForm } from './profile-form'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Network Profile - ChefFlow' }

export default async function ProfileSettingsPage() {
  await requireChef()
  const profile = await getChefProfile()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Network Profile</h1>
        <p className="text-stone-400 mt-1">
          This information is visible to other chefs who find you in the network directory.
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  )
}
