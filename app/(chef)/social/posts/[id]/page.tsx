import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getSocialPosts, getSocialMediaAssets, getSocialPostAssetLinks } from '@/lib/social/actions'
import { getHashtagSets } from '@/lib/social/hashtag-actions'
import { getConnectedPlatformSet } from '@/lib/social/oauth-actions'
import { SocialPostEditor } from '@/components/social/social-post-editor'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'

export default async function SocialPostEditPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [allPosts, assets, allLinks, hashtagSets, connectedPlatforms] = await Promise.all([
    getSocialPosts(),
    getSocialMediaAssets(),
    getSocialPostAssetLinks(),
    getHashtagSets(),
    getConnectedPlatformSet(),
  ])

  const post = allPosts.find((p) => p.id === params.id)
  if (!post) notFound()

  const linkedAssets = allLinks.filter((l) => l.post_id === post.id)

  const scheduleDate = new Date(post.schedule_at)
  const monthNum = scheduleDate.getMonth() + 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/social/planner/${monthNum}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {format(scheduleDate, 'MMMM yyyy')}
          </Button>
        </Link>
        <div className="text-sm text-stone-500">
          {post.post_code} · Scheduled {format(scheduleDate, 'EEE, MMM d')} at {format(scheduleDate, 'h:mm a')}
        </div>
      </div>

      <SocialPostEditor
        post={post}
        linkedAssets={linkedAssets}
        allAssets={assets}
        hashtagSets={hashtagSets}
        allPosts={allPosts}
        connectedPlatforms={connectedPlatforms}
      />
    </div>
  )
}
