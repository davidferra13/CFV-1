'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { TrendingUp, Users } from 'lucide-react'
import type { SocialPostAuthor } from '@/lib/social/chef-social-actions'
import { followChef, unfollowChef } from '@/lib/social/chef-social-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

function DiscoverChefCard({
  chef,
  isFollowing: initialFollowing,
}: {
  chef: SocialPostAuthor
  isFollowing: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [, startTransition] = useTransition()
  const authorName = chef.display_name ?? chef.business_name

  function toggle() {
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      if (next) await followChef(chef.id)
      else await unfollowChef(chef.id)
    })
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Link href={`/network/${chef.id}`}>
        <Avatar className="w-10 h-10 flex-shrink-0">
          {chef.profile_image_url && <AvatarImage src={chef.profile_image_url} alt={authorName} />}
          <AvatarFallback className="bg-amber-900 text-amber-800 text-xs font-semibold">
            {authorName
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/network/${chef.id}`}
          className="text-sm font-semibold text-stone-100 hover:underline block truncate"
        >
          {authorName}
        </Link>
        {(chef.city || chef.state) && (
          <p className="text-xs text-stone-400 truncate">
            {[chef.city, chef.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
      <Button
        variant={following ? 'secondary' : 'primary'}
        onClick={toggle}
        className="text-xs px-3 py-1.5 h-auto flex-shrink-0"
      >
        {following ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}

export function SocialDiscoverPanel({
  suggestedChefs,
  trendingHashtags,
}: {
  suggestedChefs: SocialPostAuthor[]
  trendingHashtags: Array<{ tag: string; post_count: number }>
}) {
  return (
    <div className="space-y-6">
      {/* Suggested chefs */}
      {suggestedChefs.length > 0 && (
        <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-stone-200">Chefs to Follow</h3>
          </div>
          <div className="divide-y divide-stone-800">
            {suggestedChefs.map((chef) => (
              <DiscoverChefCard key={chef.id} chef={chef} isFollowing={false} />
            ))}
          </div>
          <Link
            href="/network?tab=discover"
            className="block text-center text-xs text-amber-700 font-medium mt-3 hover:underline"
          >
            See more chefs →
          </Link>
        </div>
      )}

      {/* Trending hashtags */}
      {trendingHashtags.length > 0 && (
        <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-stone-200">Trending This Week</h3>
          </div>
          <div className="space-y-2">
            {trendingHashtags.slice(0, 10).map((item, i) => (
              <div key={item.tag} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-amber-700">#{item.tag}</span>
                </div>
                <span className="text-xs text-stone-400">{item.post_count} posts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
