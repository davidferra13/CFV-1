import { describe, it, expect } from 'vitest'
import type { SocialFeedItem } from '@/lib/hub/social-feed-actions'
import type { SocialPost, SocialPostAuthor } from '@/lib/social/chef-social/types'
import {
  normalizeHubFeedItem,
  normalizeChefSocialPost,
  unifyFeeds,
  type TablesPost,
} from '@/lib/tables/feed-unification'

// ---- fixtures ----

const hubItem: SocialFeedItem = {
  id: 'hub-1',
  group_id: 'g-1',
  group_name: 'Friday Night Crew',
  group_emoji: '🍕',
  group_token: 'friday-night-crew',
  author_name: 'Alice',
  author_avatar_url: 'https://img.test/alice.jpg',
  message_type: 'text',
  body: 'Who is bringing dessert?',
  media_urls: ['https://img.test/cake.jpg'],
  created_at: '2026-05-20T18:00:00Z',
}

const socialAuthor: SocialPostAuthor = {
  id: 'chef-42',
  display_name: 'Chef Marco',
  business_name: 'Marco Eats',
  profile_image_url: 'https://img.test/marco.jpg',
  city: 'Boston',
  state: 'MA',
}

const socialPost: SocialPost = {
  id: 'social-1',
  chef_id: 'chef-42',
  content: 'New summer menu just dropped',
  media_urls: ['https://img.test/menu.jpg'],
  media_types: ['image/jpeg'],
  post_type: 'photo',
  visibility: 'public',
  channel_id: null,
  hashtags: ['summer', 'menu'],
  location_tag: null,
  original_post_id: null,
  reactions_count: 12,
  comments_count: 3,
  saves_count: 1,
  shares_count: 0,
  is_edited: false,
  created_at: '2026-05-21T10:00:00Z',
  author: socialAuthor,
  my_reaction: null,
  is_saved: false,
  is_mine: false,
}

// ---- normalizeHubFeedItem ----

describe('normalizeHubFeedItem', () => {
  it('converts a SocialFeedItem to TablesPost', () => {
    const result = normalizeHubFeedItem(hubItem)

    expect(result).toEqual<TablesPost>({
      id: 'hub-1',
      source: 'circle',
      author: { name: 'Alice', avatarUrl: 'https://img.test/alice.jpg' },
      body: 'Who is bringing dessert?',
      media: ['https://img.test/cake.jpg'],
      reactions: null,
      timestamp: '2026-05-20T18:00:00Z',
      sourceLabel: '🍕 Friday Night Crew',
      sourceHref: '/hub/circles/friday-night-crew',
    })
  })

  it('handles null emoji', () => {
    const item = { ...hubItem, group_emoji: null }
    const result = normalizeHubFeedItem(item)
    expect(result.sourceLabel).toBe('Friday Night Crew')
  })

  it('handles null body', () => {
    const item = { ...hubItem, body: null }
    const result = normalizeHubFeedItem(item)
    expect(result.body).toBeNull()
  })

  it('handles empty media_urls', () => {
    const item = { ...hubItem, media_urls: [] }
    const result = normalizeHubFeedItem(item)
    expect(result.media).toEqual([])
  })
})

// ---- normalizeChefSocialPost ----

describe('normalizeChefSocialPost', () => {
  it('converts a SocialPost to TablesPost', () => {
    const result = normalizeChefSocialPost(socialPost)

    expect(result).toEqual<TablesPost>({
      id: 'social-1',
      source: 'network',
      author: { name: 'Chef Marco', avatarUrl: 'https://img.test/marco.jpg' },
      body: 'New summer menu just dropped',
      media: ['https://img.test/menu.jpg'],
      reactions: [{ emoji: '❤️', count: 12 }],
      timestamp: '2026-05-21T10:00:00Z',
      sourceLabel: 'Chef Network',
      sourceHref: '/social',
    })
  })

  it('falls back to business_name when display_name is null', () => {
    const post = {
      ...socialPost,
      author: { ...socialAuthor, display_name: null },
    }
    const result = normalizeChefSocialPost(post)
    expect(result.author.name).toBe('Marco Eats')
  })

  it('falls back to Unknown Chef when both names are empty', () => {
    const post = {
      ...socialPost,
      author: { ...socialAuthor, display_name: null, business_name: '' },
    }
    const result = normalizeChefSocialPost(post)
    expect(result.author.name).toBe('Unknown Chef')
  })

  it('sets reactions to null when reactions_count is 0', () => {
    const post = { ...socialPost, reactions_count: 0 }
    const result = normalizeChefSocialPost(post)
    expect(result.reactions).toBeNull()
  })

  it('handles null profile_image_url', () => {
    const post = {
      ...socialPost,
      author: { ...socialAuthor, profile_image_url: null },
    }
    const result = normalizeChefSocialPost(post)
    expect(result.author.avatarUrl).toBeNull()
  })
})

// ---- unifyFeeds ----

describe('unifyFeeds', () => {
  it('merges and sorts by timestamp descending', () => {
    const hub = normalizeHubFeedItem(hubItem) // 2026-05-20
    const social = normalizeChefSocialPost(socialPost) // 2026-05-21
    const result = unifyFeeds([hub], [social])

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('social-1')
    expect(result[1].id).toBe('hub-1')
  })

  it('deduplicates by id, keeping the first occurrence', () => {
    const post1: TablesPost = {
      id: 'dup-1',
      source: 'circle',
      author: { name: 'A', avatarUrl: null },
      body: 'first',
      media: [],
      reactions: null,
      timestamp: '2026-05-20T00:00:00Z',
      sourceLabel: 'Circle',
      sourceHref: '/hub',
    }
    const post2: TablesPost = {
      ...post1,
      source: 'network',
      body: 'second',
    }

    const result = unifyFeeds([post1], [post2])
    expect(result).toHaveLength(1)
    expect(result[0].body).toBe('first')
  })

  it('returns empty array when both inputs are empty', () => {
    expect(unifyFeeds([], [])).toEqual([])
  })

  it('handles one empty feed', () => {
    const hub = normalizeHubFeedItem(hubItem)
    expect(unifyFeeds([hub], [])).toHaveLength(1)
    expect(unifyFeeds([], [hub])).toHaveLength(1)
  })
})
