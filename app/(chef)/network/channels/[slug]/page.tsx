// Channel feed page - posts within a specific topic channel
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getChannelFeed,
  listChannels,
  getMyChannels,
  getDiscoverChefs,
  getTrendingHashtags,
  getActiveStories,
} from '@/lib/social/chef-social-actions'
import { createServerClient } from '@/lib/db/server'
import { SocialFeedClient } from '@/components/social/social-feed-client'
import { ChannelJoinButton } from '@/components/social/social-channel-card'
import { ArrowLeft, Users, MessageSquare } from '@/components/ui/icons'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return { title: `#${slug} | Chef Community` }
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireChef()
  const { slug } = await params

  const db = createServerClient({ admin: true })
  const { data: channel } = await db
    .from('chef_social_channels')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!channel) notFound()

  const ch = channel as any

  const [posts, myChannels, allChannels, suggestedChefs, trendingHashtags, stories] =
    await Promise.all([
      getChannelFeed({ channelSlug: slug, limit: 30 }),
      getMyChannels(),
      listChannels(),
      getDiscoverChefs({ limit: 5 }),
      getTrendingHashtags({ limit: 10 }),
      getActiveStories(),
    ])

  const { data: me } = await db
    .from('chefs')
    .select('display_name, business_name, profile_image_url')
    .eq('id', user.entityId)
    .single()

  const myName = me?.display_name ?? me?.business_name ?? 'Chef'
  const myAvatar = me?.profile_image_url ?? null

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/network?tab=channels"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft className="h-4 w-4" />
        All Channels
      </Link>

      {/* Channel header */}
      <div
        className="rounded-2xl p-6 flex items-start gap-4"
        style={{
          backgroundColor: ch.color ? `${ch.color}15` : '#fafaf9',
          borderLeft: ch.color ? `4px solid ${ch.color}` : undefined,
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ backgroundColor: ch.color ? `${ch.color}30` : '#e7e5e4' }}
        >
          {ch.icon ?? '💬'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-100">{ch.name}</h1>
            {ch.is_official && (
              <span className="text-xs bg-amber-900 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Official
              </span>
            )}
          </div>
          {ch.description && <p className="text-stone-500 mt-1 text-sm">{ch.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-stone-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {ch.member_count.toLocaleString()} members
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              {ch.post_count.toLocaleString()} posts
            </span>
          </div>
        </div>

        <ChannelJoinButton channelId={ch.id} isMember={myChannels.some((mc) => mc.id === ch.id)} />
      </div>

      {/* Feed (channel-scoped) */}
      <SocialFeedClient
        initialPosts={posts}
        storyGroups={stories}
        myChannels={myChannels}
        allChannels={allChannels}
        suggestedChefs={suggestedChefs}
        trendingHashtags={trendingHashtags}
        myName={myName}
        myAvatar={myAvatar}
        showSidebar
        channelSlug={slug}
        defaultChannelId={ch.id}
      />
    </div>
  )
}
