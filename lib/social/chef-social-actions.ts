'use server'

import {
  getSocialFeed as getSocialFeedAction,
  getChannelFeed as getChannelFeedAction,
  getProfilePosts as getProfilePostsAction,
  getTrendingPosts as getTrendingPostsAction,
  getSavedPosts as getSavedPostsAction,
  createSocialPost as createSocialPostAction,
  deleteSocialPost as deleteSocialPostAction,
  uploadPostMedia as uploadPostMediaAction,
} from './chef-social/posts'
import {
  togglePostReaction as togglePostReactionAction,
  toggleCommentReaction as toggleCommentReactionAction,
} from './chef-social/reactions'
import {
  getPostComments as getPostCommentsAction,
  createComment as createCommentAction,
  deleteComment as deleteCommentAction,
} from './chef-social/comments'
import {
  followChef as followChefAction,
  unfollowChef as unfollowChefAction,
  getFollowStatus as getFollowStatusAction,
  getFollowCounts as getFollowCountsAction,
} from './chef-social/follows'
import {
  listChannels as listChannelsAction,
  joinChannel as joinChannelAction,
  leaveChannel as leaveChannelAction,
  getMyChannels as getMyChannelsAction,
} from './chef-social/channels'
import {
  getActiveStories as getActiveStoriesAction,
  createStory as createStoryAction,
  markStoryViewed as markStoryViewedAction,
  reactToStory as reactToStoryAction,
} from './chef-social/stories'
import { toggleSavePost as toggleSavePostAction } from './chef-social/sharing'
import {
  getSocialNotifications as getSocialNotificationsAction,
  markSocialNotificationsRead as markSocialNotificationsReadAction,
  getUnreadSocialNotificationCount as getUnreadSocialNotificationCountAction,
} from './chef-social/notifications'
import {
  getDiscoverChefs as getDiscoverChefsAction,
  getTrendingHashtags as getTrendingHashtagsAction,
  getPublicChefSocialProfile as getPublicChefSocialProfileAction,
} from './chef-social/discovery'

export type {
  ReactionType,
  PostVisibility,
  PostType,
  SocialPostAuthor,
  SocialPost,
  SocialComment,
  SocialChannel,
  SocialStory,
  StoryGroup,
  SocialNotification,
  FollowCounts,
} from './chef-social/types'

export async function getSocialFeed(...args: Parameters<typeof getSocialFeedAction>) {
  return getSocialFeedAction(...args)
}

export async function getChannelFeed(...args: Parameters<typeof getChannelFeedAction>) {
  return getChannelFeedAction(...args)
}

export async function getProfilePosts(...args: Parameters<typeof getProfilePostsAction>) {
  return getProfilePostsAction(...args)
}

export async function getTrendingPosts(...args: Parameters<typeof getTrendingPostsAction>) {
  return getTrendingPostsAction(...args)
}

export async function getSavedPosts(...args: Parameters<typeof getSavedPostsAction>) {
  return getSavedPostsAction(...args)
}

export async function createSocialPost(...args: Parameters<typeof createSocialPostAction>) {
  return createSocialPostAction(...args)
}

export async function deleteSocialPost(...args: Parameters<typeof deleteSocialPostAction>) {
  return deleteSocialPostAction(...args)
}

export async function uploadPostMedia(...args: Parameters<typeof uploadPostMediaAction>) {
  return uploadPostMediaAction(...args)
}

export async function togglePostReaction(...args: Parameters<typeof togglePostReactionAction>) {
  return togglePostReactionAction(...args)
}

export async function toggleCommentReaction(
  ...args: Parameters<typeof toggleCommentReactionAction>
) {
  return toggleCommentReactionAction(...args)
}

export async function getPostComments(...args: Parameters<typeof getPostCommentsAction>) {
  return getPostCommentsAction(...args)
}

export async function createComment(...args: Parameters<typeof createCommentAction>) {
  return createCommentAction(...args)
}

export async function deleteComment(...args: Parameters<typeof deleteCommentAction>) {
  return deleteCommentAction(...args)
}

export async function followChef(...args: Parameters<typeof followChefAction>) {
  return followChefAction(...args)
}

export async function unfollowChef(...args: Parameters<typeof unfollowChefAction>) {
  return unfollowChefAction(...args)
}

export async function getFollowStatus(...args: Parameters<typeof getFollowStatusAction>) {
  return getFollowStatusAction(...args)
}

export async function getFollowCounts(...args: Parameters<typeof getFollowCountsAction>) {
  return getFollowCountsAction(...args)
}

export async function listChannels(...args: Parameters<typeof listChannelsAction>) {
  return listChannelsAction(...args)
}

export async function joinChannel(...args: Parameters<typeof joinChannelAction>) {
  return joinChannelAction(...args)
}

export async function leaveChannel(...args: Parameters<typeof leaveChannelAction>) {
  return leaveChannelAction(...args)
}

export async function getMyChannels(...args: Parameters<typeof getMyChannelsAction>) {
  return getMyChannelsAction(...args)
}

export async function getActiveStories(...args: Parameters<typeof getActiveStoriesAction>) {
  return getActiveStoriesAction(...args)
}

export async function createStory(...args: Parameters<typeof createStoryAction>) {
  return createStoryAction(...args)
}

export async function markStoryViewed(...args: Parameters<typeof markStoryViewedAction>) {
  return markStoryViewedAction(...args)
}

export async function reactToStory(...args: Parameters<typeof reactToStoryAction>) {
  return reactToStoryAction(...args)
}

export async function toggleSavePost(...args: Parameters<typeof toggleSavePostAction>) {
  return toggleSavePostAction(...args)
}

export async function getSocialNotifications(
  ...args: Parameters<typeof getSocialNotificationsAction>
) {
  return getSocialNotificationsAction(...args)
}

export async function markSocialNotificationsRead(
  ...args: Parameters<typeof markSocialNotificationsReadAction>
) {
  return markSocialNotificationsReadAction(...args)
}

export async function getUnreadSocialNotificationCount(
  ...args: Parameters<typeof getUnreadSocialNotificationCountAction>
) {
  return getUnreadSocialNotificationCountAction(...args)
}

export async function getDiscoverChefs(...args: Parameters<typeof getDiscoverChefsAction>) {
  return getDiscoverChefsAction(...args)
}

export async function getTrendingHashtags(...args: Parameters<typeof getTrendingHashtagsAction>) {
  return getTrendingHashtagsAction(...args)
}

export async function getPublicChefSocialProfile(
  ...args: Parameters<typeof getPublicChefSocialProfileAction>
) {
  return getPublicChefSocialProfileAction(...args)
}
