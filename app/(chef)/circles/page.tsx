import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { CirclesPageTabs } from '@/components/hub/circles-page-tabs'

export const metadata = { title: 'Dinner Circles' }

export default async function CirclesPage() {
  const [circles, feedResult] = await Promise.all([
    getChefCircles(),
    getChefSocialFeed({ limit: 30 }),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Dinner Circles</h1>
        <p className="mt-1 text-sm text-stone-400">Every dinner, every guest, one place</p>
      </div>

      <CirclesPageTabs
        circles={circles}
        feedItems={feedResult.items}
        feedCursor={feedResult.nextCursor}
      />
    </div>
  )
}
