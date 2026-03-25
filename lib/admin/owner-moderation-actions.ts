'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/admin/audit'

const moderationReasonSchema = z
  .string()
  .trim()
  .min(3, 'Moderation reason is required')
  .max(500, 'Moderation reason is too long')

const uuidSchema = z.string().uuid('Invalid identifier')

function parseModerationReason(reason: string): string {
  return moderationReasonSchema.parse(reason)
}

export async function adminSoftDeleteChatMessage(messageId: string, reason: string) {
  const admin = await requireAdmin()
  const parsedMessageId = uuidSchema.parse(messageId)
  const parsedReason = parseModerationReason(reason)
  const db: any = createAdminClient()

  const { data: message, error: messageError } = await db
    .from('chat_messages')
    .select('id, conversation_id, sender_id, deleted_at')
    .eq('id', parsedMessageId)
    .maybeSingle()

  if (messageError) {
    throw new Error(`Unable to load chat message: ${messageError.message}`)
  }
  if (!message) {
    throw new Error('Chat message not found')
  }

  if (!message.deleted_at) {
    const { error: updateError } = await db
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parsedMessageId)
      .is('deleted_at', null)

    if (updateError) {
      throw new Error(`Unable to moderate chat message: ${updateError.message}`)
    }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_moderated_chat_message',
    targetId: parsedMessageId,
    targetType: 'chat_message',
    details: {
      reason: parsedReason,
      conversationId: message.conversation_id ?? null,
      senderId: message.sender_id ?? null,
      alreadyDeleted: Boolean(message.deleted_at),
    },
  })

  revalidatePath('/admin/conversations')
  revalidatePath(`/admin/conversations/${message.conversation_id}`)
  revalidatePath('/admin/command-center')
  return { success: true as const }
}

export async function adminHideSocialPost(postId: string, reason: string) {
  const admin = await requireAdmin()
  const parsedPostId = uuidSchema.parse(postId)
  const parsedReason = parseModerationReason(reason)
  const db: any = createAdminClient()

  const { data: post, error: postError } = await db
    .from('chef_social_posts')
    .select('id, chef_id, visibility')
    .eq('id', parsedPostId)
    .maybeSingle()

  if (postError) {
    throw new Error(`Unable to load social post: ${postError.message}`)
  }
  if (!post) {
    throw new Error('Social post not found')
  }

  if (post.visibility !== 'private') {
    const { error: updateError } = await db
      .from('chef_social_posts')
      .update({ visibility: 'private' })
      .eq('id', parsedPostId)

    if (updateError) {
      throw new Error(`Unable to hide social post: ${updateError.message}`)
    }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_moderated_social_post',
    targetId: parsedPostId,
    targetType: 'social_post',
    details: {
      reason: parsedReason,
      chefId: post.chef_id ?? null,
      previousVisibility: post.visibility ?? null,
    },
  })

  revalidatePath('/admin/social')
  revalidatePath('/admin/command-center')
  return { success: true as const }
}

export async function adminDeactivateHubGroup(groupId: string, reason: string) {
  const admin = await requireAdmin()
  const parsedGroupId = uuidSchema.parse(groupId)
  const parsedReason = parseModerationReason(reason)
  const db: any = createAdminClient()

  const { data: group, error: groupError } = await db
    .from('hub_groups')
    .select('id, tenant_id, is_active, name')
    .eq('id', parsedGroupId)
    .maybeSingle()

  if (groupError) {
    throw new Error(`Unable to load hub group: ${groupError.message}`)
  }
  if (!group) {
    throw new Error('Hub group not found')
  }

  if (group.is_active) {
    const { error: updateError } = await db
      .from('hub_groups')
      .update({ is_active: false })
      .eq('id', parsedGroupId)

    if (updateError) {
      throw new Error(`Unable to deactivate hub group: ${updateError.message}`)
    }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_moderated_hub_group',
    targetId: parsedGroupId,
    targetType: 'hub_group',
    details: {
      reason: parsedReason,
      tenantId: group.tenant_id ?? null,
      groupName: group.name ?? null,
      alreadyInactive: !group.is_active,
    },
  })

  revalidatePath('/admin/hub')
  revalidatePath(`/admin/hub/groups/${parsedGroupId}`)
  revalidatePath('/admin/command-center')
  return { success: true as const }
}
