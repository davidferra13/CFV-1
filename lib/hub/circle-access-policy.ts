import type { HubGroup, HubGroupMember, HubMemberRole } from './types'

export type CircleActorRole =
  | HubMemberRole
  | 'staff'
  | 'vendor'
  | 'partner'
  | 'admin'
  | 'system'
  | 'public'

export interface CircleAccessActor {
  role: CircleActorRole
  profileId?: string | null
  tenantId?: string | null
  isMember?: boolean
  member?: Pick<HubGroupMember, 'role' | 'can_post' | 'can_invite' | 'can_pin'> | null
  activeContext?: 'chef' | 'client' | 'guest' | 'staff' | 'vendor' | 'partner' | 'admin' | 'system'
}

export interface CircleAccessContext {
  group: Pick<
    HubGroup,
    | 'visibility'
    | 'tenant_id'
    | 'created_by_profile_id'
    | 'allow_anonymous_posts'
    | 'allow_member_invites'
  > & {
    group_type?:
      | HubGroup['group_type']
      | 'chef_collab'
      | 'event_collab'
      | 'chef_vendor'
      | 'chef_staff'
      | 'household'
      | 'solo'
      | 'partner'
      | 'platform'
  }
  linkedObject?: {
    type: 'event' | 'order' | 'recipe' | 'vendor_order' | 'staff_assignment' | 'client_referral'
    sharedWithCircle?: boolean
    chefOnly?: boolean
    clientSafe?: boolean
  }
}

const MANAGER_ROLES = new Set<CircleActorRole>(['owner', 'admin', 'host', 'chef'])
const MEMBER_ROLES = new Set<CircleActorRole>([
  'owner',
  'admin',
  'chef',
  'host',
  'member',
  'viewer',
  'delegate',
])
const HOST_MANAGEABLE_MEMBER_ROLES = new Set<CircleActorRole>(['member', 'viewer', 'delegate'])
const PROTECTED_MEMBER_ROLES = new Set<CircleActorRole>(['owner', 'chef'])

function effectiveRole(actor: CircleAccessActor): CircleActorRole {
  return actor.member?.role ?? actor.role
}

function isMember(actor: CircleAccessActor): boolean {
  return Boolean(actor.isMember || actor.member || isAdmin(actor))
}

function isAdmin(actor: CircleAccessActor): boolean {
  return effectiveRole(actor) === 'admin' || actor.activeContext === 'admin'
}

export function canSeeCircle(actor: CircleAccessActor, context: CircleAccessContext): boolean {
  if (isAdmin(actor)) return true
  if (context.group.visibility === 'public') return true
  if (effectiveRole(actor) === 'system') return isMember(actor)
  return isMember(actor)
}

export function canPost(actor: CircleAccessActor, context: CircleAccessContext): boolean {
  if (!canSeeCircle(actor, context)) return false
  if (isAdmin(actor)) return true
  if (actor.member) return actor.member.can_post
  if (context.group.allow_anonymous_posts && context.group.visibility === 'public') return true
  return (
    isMember(actor) &&
    ['owner', 'admin', 'chef', 'host', 'member', 'delegate'].includes(effectiveRole(actor))
  )
}

export function canInvite(actor: CircleAccessActor, context: CircleAccessContext): boolean {
  if (!canSeeCircle(actor, context)) return false
  if (isAdmin(actor)) return true
  if (actor.member?.can_invite) return true
  if (!context.group.allow_member_invites && !MANAGER_ROLES.has(effectiveRole(actor))) return false
  return ['owner', 'admin', 'chef', 'host'].includes(effectiveRole(actor))
}

export function canManageThread(actor: CircleAccessActor, context: CircleAccessContext): boolean {
  if (!canSeeCircle(actor, context)) return false
  if (isAdmin(actor)) return true
  return MANAGER_ROLES.has(effectiveRole(actor))
}

export function canArchive(actor: CircleAccessActor, context: CircleAccessContext): boolean {
  return canManageThread(actor, context)
}

export function canManageCircleMember(
  actor: CircleAccessActor,
  context: CircleAccessContext,
  targetRole: CircleActorRole
): boolean {
  if (!canManageThread(actor, context)) return false
  if (PROTECTED_MEMBER_ROLES.has(targetRole)) return false

  const actorRole = effectiveRole(actor)
  if (actorRole === 'host') return HOST_MANAGEABLE_MEMBER_ROLES.has(targetRole)
  if (actorRole === 'admin') return targetRole !== 'admin'
  return true
}

export function canAssignCircleMemberRole(
  actor: CircleAccessActor,
  context: CircleAccessContext,
  targetRole: CircleActorRole,
  nextRole: CircleActorRole
): boolean {
  if (!canManageCircleMember(actor, context, targetRole)) return false

  const actorRole = effectiveRole(actor)
  if (PROTECTED_MEMBER_ROLES.has(nextRole) || nextRole === 'chef') return false
  if (actorRole === 'host') return HOST_MANAGEABLE_MEMBER_ROLES.has(nextRole)
  if (actorRole === 'admin') return nextRole !== 'admin'
  return MEMBER_ROLES.has(nextRole)
}

export function defaultCircleMemberPermissions(
  role: CircleActorRole
): Pick<HubGroupMember, 'can_post' | 'can_invite' | 'can_pin'> {
  if (role === 'admin' || role === 'host') {
    return { can_post: true, can_invite: true, can_pin: true }
  }
  if (role === 'viewer') {
    return { can_post: false, can_invite: false, can_pin: false }
  }
  return { can_post: true, can_invite: false, can_pin: false }
}

export function canSeeLinkedObject(
  actor: CircleAccessActor,
  context: CircleAccessContext
): boolean {
  if (!canSeeCircle(actor, context)) return false
  if (!context.linkedObject) return true
  if (isAdmin(actor)) return true
  if (context.linkedObject.chefOnly)
    return ['chef', 'owner', 'admin'].includes(effectiveRole(actor))
  if (context.linkedObject.clientSafe) return true
  return Boolean(context.linkedObject.sharedWithCircle)
}

export function describeCircleAccess(actor: CircleAccessActor, context: CircleAccessContext) {
  return {
    canSeeCircle: canSeeCircle(actor, context),
    canPost: canPost(actor, context),
    canInvite: canInvite(actor, context),
    canManageThread: canManageThread(actor, context),
    canArchive: canArchive(actor, context),
    canSeeLinkedObject: canSeeLinkedObject(actor, context),
  }
}
