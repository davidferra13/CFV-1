// Chef Social Platform - shared types

export type ReactionType = 'like' | 'fire' | 'clap' | 'wow' | 'hungry' | 'insightful'
export type PostVisibility = 'public' | 'followers' | 'connections' | 'private'
export type PostType = 'text' | 'photo' | 'video' | 'reel' | 'poll' | 'share' | 'opportunity'

export type SocialPostAuthor = {
  id: string
  display_name: string | null
  business_name: string
  profile_image_url: string | null
  city: string | null
  state: string | null
  // populated when viewing a specific profile
  followers_count?: number
  following_count?: number
}

export type SocialPost = {
  id: string
  chef_id: string
  content: string
  media_urls: string[]
  media_types: string[]
  post_type: PostType
  visibility: PostVisibility
  channel_id: string | null
  channel?: { slug: string; name: string; icon: string | null; color: string | null }
  hashtags: string[]
  location_tag: string | null
  original_post_id: string | null
  original_post?: SocialPost | null
  share_comment: string | null
  poll_question: string | null
  poll_options: Array<{ id: string; text: string; votes: number }> | null
  poll_closes_at: string | null
  reactions_count: number
  comments_count: number
  saves_count: number
  shares_count: number
  is_edited: boolean
  created_at: string
  author: SocialPostAuthor
  // viewer-context fields
  my_reaction: ReactionType | null
  is_saved: boolean
  is_mine: boolean
}

export type SocialComment = {
  id: string
  post_id: string
  chef_id: string
  content: string
  parent_comment_id: string | null
  reactions_count: number
  replies_count: number
  is_deleted: boolean
  is_edited: boolean
  created_at: string
  author: SocialPostAuthor
  my_reaction: ReactionType | null
  replies?: SocialComment[]
}

export type SocialChannel = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  category: string
  is_official: boolean
  member_count: number
  post_count: number
  visibility: 'public' | 'private'
  is_member: boolean
  notifications_enabled: boolean
}

export type SocialStory = {
  id: string
  chef_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  duration_seconds: number
  views_count: number
  reactions_count: number
  expires_at: string
  created_at: string
  author: SocialPostAuthor
  is_viewed: boolean
  my_reaction: string | null
}

export type StoryGroup = {
  chef: SocialPostAuthor
  stories: SocialStory[]
  has_unseen: boolean
}

export type SocialNotification = {
  id: string
  notification_type: string
  entity_type: string
  entity_id: string
  agg_count: number
  is_read: boolean
  created_at: string
  actor: SocialPostAuthor | null
}

export type FollowCounts = {
  followers: number
  following: number
}
