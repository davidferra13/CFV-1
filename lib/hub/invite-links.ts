import * as crypto from 'crypto'
import { createServerClient } from '@/lib/db/server'
import { deriveInviteCopyRole, type HubInviteCopyRole } from './invite-copy'
export type { HubInviteCopyRole } from './invite-copy'
export {
  buildCircleInviteShareMessage,
  deriveInviteCopyRole,
  formatInviteSenderLabel,
  getInviteRoleLabel,
} from './invite-copy'

type HubInvitePayload = {
  gt: string
  pid: string
  type: 'hub_invite'
}

function getInviteSecret() {
  return (
    process.env.HUB_INVITE_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    'chefflow-hub-invite-secret'
  )
}

export function createHubInviteAttributionToken(input: {
  groupToken: string
  inviterProfileId: string
}): string {
  const payload: HubInvitePayload = {
    gt: input.groupToken,
    pid: input.inviterProfileId,
    type: 'hub_invite',
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getInviteSecret())
    .update(encoded)
    .digest('base64url')
  return `${encoded}.${signature}`
}

export function verifyHubInviteAttributionToken(input: {
  groupToken: string
  inviteToken?: string | null
}): { inviterProfileId: string } | null {
  if (!input.inviteToken) return null

  try {
    const [encoded, signature] = input.inviteToken.split('.')
    if (!encoded || !signature) return null

    const expectedSignature = crypto
      .createHmac('sha256', getInviteSecret())
      .update(encoded)
      .digest('base64url')

    if (signature !== expectedSignature) return null

    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as HubInvitePayload

    if (payload.type !== 'hub_invite') return null
    if (payload.gt !== input.groupToken) return null

    return { inviterProfileId: payload.pid }
  } catch {
    return null
  }
}

export async function getHubInviteLinkContext(input: {
  groupToken: string
  profileToken: string
  roleHint?: HubInviteCopyRole | null
}): Promise<{
  invitePath: string
  copyRole: HubInviteCopyRole
  inviterDisplayName: string | null
}> {
  const db: any = createServerClient({ admin: true })

  const { data: group } = await db
    .from('hub_groups')
    .select('id, allow_member_invites')
    .eq('group_token', input.groupToken)
    .maybeSingle()

  if (!group) {
    throw new Error('Group not found')
  }

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name, client_id, auth_user_id')
    .eq('profile_token', input.profileToken)
    .maybeSingle()

  if (!profile) {
    throw new Error('Invalid profile token')
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('role, can_invite')
    .eq('group_id', group.id)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!membership) {
    throw new Error('Not a group member')
  }

  const canInvite =
    ['owner', 'admin', 'chef'].includes(membership.role) ||
    membership.can_invite ||
    (group.allow_member_invites && membership.role !== 'viewer')

  if (!canInvite) {
    throw new Error('No permission to invite')
  }

  const copyRole = deriveInviteCopyRole({
    membershipRole: membership.role,
    clientId: profile.client_id,
    authUserId: profile.auth_user_id,
    roleHint: input.roleHint ?? null,
  })

  const inviteToken = createHubInviteAttributionToken({
    groupToken: input.groupToken,
    inviterProfileId: profile.id,
  })

  return {
    invitePath: `/hub/join/${input.groupToken}?invite=${inviteToken}`,
    copyRole,
    inviterDisplayName: profile.display_name ?? null,
  }
}

export async function resolveHubInviteAttribution(input: {
  groupToken: string
  inviteToken?: string | null
}): Promise<{
  inviterProfileId: string
  inviterDisplayName: string
  copyRole: HubInviteCopyRole
  membershipRole: string
} | null> {
  const verified = verifyHubInviteAttributionToken(input)
  if (!verified) return null

  const db: any = createServerClient({ admin: true })

  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('group_token', input.groupToken)
    .maybeSingle()

  if (!group) return null

  const { data: inviter } = await db
    .from('hub_group_members')
    .select('role, hub_guest_profiles!profile_id(display_name, client_id, auth_user_id)')
    .eq('group_id', group.id)
    .eq('profile_id', verified.inviterProfileId)
    .maybeSingle()

  if (!inviter) return null

  const inviterProfile = inviter.hub_guest_profiles as {
    display_name: string | null
    client_id: string | null
    auth_user_id: string | null
  } | null

  return {
    inviterProfileId: verified.inviterProfileId,
    inviterDisplayName: inviterProfile?.display_name?.trim() || 'Someone',
    copyRole: deriveInviteCopyRole({
      membershipRole: inviter.role,
      clientId: inviterProfile?.client_id ?? null,
      authUserId: inviterProfile?.auth_user_id ?? null,
    }),
    membershipRole: inviter.role,
  }
}
