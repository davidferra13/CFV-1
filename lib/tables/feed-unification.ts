import type { SocialFeedItem } from '@/lib/hub/social-feed-actions'
import type { SocialPost } from '@/lib/social/chef-social/types'

export type TablesPostSource = 'circle' | 'network' | 'open-table' | 'community'

export type TablesPost = {
  id: string
  source: TablesPostSource
  author: { name: string; avatarUrl: string | null }
  body: string | null
  media: string[]
  reactions: { emoji: string; count: number }[] | null
  timestamp: string
  sourceLabel: string
  sourceHref: string
}

export function normalizeHubFeedItem(item: SocialFeedItem): TablesPost {
  return {
    id: item.id,
    source: 'circle',
    author: {
      name: item.author_name,
      avatarUrl: item.author_avatar_url,
    },
    body: item.body,
    media: item.media_urls,
    reactions: null,
    timestamp: item.created_at,
    sourceLabel: item.group_emoji ? `${item.group_emoji} ${item.group_name}` : item.group_name,
    sourceHref: `/hub/circles/${item.group_token}`,
  }
}

export function normalizeChefSocialPost(post: SocialPost): TablesPost {
  const authorName = post.author.display_name || post.author.business_name || 'Unknown Chef'

  return {
    id: post.id,
    source: 'network',
    author: {
      name: authorName,
      avatarUrl: post.author.profile_image_url,
    },
    body: post.content,
    media: post.media_urls,
    reactions: post.reactions_count > 0 ? [{ emoji: '❤️', count: post.reactions_count }] : null,
    timestamp: post.created_at,
    sourceLabel: 'Chef Network',
    sourceHref: '/social',
  }
}

export function unifyFeeds(hubPosts: TablesPost[], socialPosts: TablesPost[]): TablesPost[] {
  const seen = new Set<string>()
  const deduped: TablesPost[] = []

  for (const post of [...hubPosts, ...socialPosts]) {
    if (!seen.has(post.id)) {
      seen.add(post.id)
      deduped.push(post)
    }
  }

  return deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
