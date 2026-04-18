import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { CommunityDirectory } from '@/components/community/community-directory'
import { DirectorySearch } from '@/components/community/directory-search'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Chef Directory | Community' }

export default async function DirectoryPage() {
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
        <h1 className="text-2xl font-bold text-stone-100">Chef Directory</h1>
      </div>

      <DirectorySearch />
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Community Members</h2>
        <CommunityDirectory />
      </div>
    </div>
  )
}
