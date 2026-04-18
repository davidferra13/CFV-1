import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { CommunityProfileEditor } from '@/components/community/community-profile-editor'
import { DirectoryListingEditor } from '@/components/community/directory-listing-editor'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Community Profile | Community' }

export default async function CommunityProfilePage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Community Profile</h1>
      </div>

      <CommunityProfileEditor />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Directory Listing</h2>
        <DirectoryListingEditor />
      </div>
    </div>
  )
}
