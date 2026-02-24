import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getSavedPosts } from '@/lib/social/chef-social-actions'
import { SocialPostCard } from '@/components/social/social-post-card'
import { ArrowLeft, Bookmark } from 'lucide-react'

export const metadata: Metadata = { title: 'Saved Posts — Chef Community' }

export default async function SavedPostsPage() {
  await requireChef()
  const posts = await getSavedPosts({ limit: 40 })

  return (
    <div className="space-y-6">
      <Link
        href="/network"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Community
      </Link>

      <div className="flex items-center gap-2">
        <Bookmark className="h-5 w-5 text-amber-600" />
        <h1 className="text-2xl font-bold text-stone-100">Saved Posts</h1>
      </div>

      {posts.length === 0 ? (
        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-12 text-center">
          <Bookmark className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No saved posts yet</p>
          <p className="text-stone-400 text-xs mt-1">
            Tap the bookmark icon on any post to save it here
          </p>
          <Link
            href="/network"
            className="text-amber-700 text-sm font-medium hover:underline mt-3 block"
          >
            Browse the feed →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <SocialPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
