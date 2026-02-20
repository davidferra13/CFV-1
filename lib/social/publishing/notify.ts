// Chef notification when a social post fails 3 consecutive publish attempts.
// Uses the existing in-app notification system.

import { createAdminClient } from '@/lib/supabase/admin'
import type { SocialPlatform } from '@/lib/social/types'

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  x: 'X',
  pinterest: 'Pinterest',
  youtube_shorts: 'YouTube Shorts',
}

export async function sendChefPublishFailureNotification(
  tenantId: string,
  postId: string,
  postTitle: string,
  platform: SocialPlatform
): Promise<void> {
  const supabase = createAdminClient()
  const label = PLATFORM_LABELS[platform] ?? platform

  // Resolve chef's auth_user_id from user_roles
  const { data: role } = await (supabase as any)
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', tenantId)
    .eq('role', 'chef')
    .single()

  if (!role?.auth_user_id) return

  await (supabase as any).from('notifications').insert({
    user_id: role.auth_user_id,
    tenant_id: tenantId,
    type: 'social_publish_failed',
    title: `Publishing failed: ${label}`,
    body: `"${postTitle || 'Your post'}" failed to publish to ${label} after 3 attempts. Go to the Social planner to review and retry.`,
    entity_type: 'social_post',
    entity_id: postId,
    action_url: `/social/posts/${postId}`,
    is_read: false,
  })
}
