// Chef notification when a social post fails 3 consecutive publish attempts.
// Uses the centralized notification pipeline.

import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/actions'
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
  const supabase: any = createAdminClient()
  const label = PLATFORM_LABELS[platform] ?? platform

  const { data: role } = await supabase
    .from('user_roles')
    .select('auth_user_id')
    .eq('entity_id', tenantId)
    .eq('role', 'chef')
    .single()

  if (!role?.auth_user_id) return

  await createNotification({
    tenantId,
    recipientId: role.auth_user_id,
    category: 'system',
    action: 'system_alert',
    title: `Publishing failed: ${label}`,
    body: `"${postTitle || 'Your post'}" failed to publish to ${label} after 3 attempts. Go to the Social planner to review and retry.`,
    actionUrl: `/social/posts/${postId}`,
    metadata: {
      kind: 'social_publish_failed',
      platform,
      post_id: postId,
    },
  })
}
