import type { Metadata } from 'next'
import Link from 'next/link'
import { ChefBioPanel } from '@/components/ai/chef-bio-panel'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getChefFullProfile } from '@/lib/chef/profile-actions'
import { ChefProfileForm } from './chef-profile-form'

export const metadata: Metadata = { title: 'My Profile' }

export default async function ChefMyProfilePage() {
  const user = await requireChef()
  const profile = await getChefFullProfile()

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
        <h1 className="text-3xl font-bold text-stone-100">My Profile</h1>
        <p className="text-stone-400 mt-1">
          Manage the core profile details used across your client portal and public page.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Need to upload a resume or manage career history?{' '}
          <Link
            href="/settings/credentials"
            className="text-stone-300 underline decoration-stone-600 underline-offset-4 transition-colors hover:text-stone-100"
          >
            Open Credentials
          </Link>
          .
        </p>
      </div>

      <ChefProfileForm profile={profile} chefId={user.entityId} />

      {/* AI Chef Bio & Tagline Generator */}
      <ChefBioPanel />
    </div>
  )
}
