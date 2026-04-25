import type {
  ExecuteInteractionInput,
  InteractionActorContext,
  InteractionActorRole,
  InteractionDefinition,
  InteractionPermissionSnapshot,
} from './types'

type PermissionResolverDeps = {
  getCurrentUser?: () => Promise<{
    id: string
    role: 'chef' | 'client'
    entityId: string
    tenantId: string | null
  } | null>
  db?: any
}

function normalizeRole(role: unknown): InteractionActorRole {
  if (
    role === 'chef' ||
    role === 'client' ||
    role === 'staff' ||
    role === 'partner' ||
    role === 'system'
  ) {
    return role
  }
  return 'anonymous'
}

export async function resolveInteractionActor(
  input: ExecuteInteractionInput,
  deps: PermissionResolverDeps = {}
): Promise<InteractionActorContext> {
  if (input.actor?.role || input.actor_id || input.actor?.actorId) {
    const role = normalizeRole(input.actor?.role)
    return {
      role,
      actorId:
        input.actor?.actorId || input.actor_id || (role === 'system' ? 'system' : 'anonymous'),
      tenantId: input.actor?.tenantId ?? null,
      entityId: input.actor?.entityId ?? null,
    }
  }

  const currentUser = deps.getCurrentUser ? await deps.getCurrentUser() : null
  if (currentUser) {
    return {
      role: currentUser.role,
      actorId: currentUser.id,
      tenantId: currentUser.tenantId,
      entityId: currentUser.entityId,
    }
  }

  return {
    role: 'anonymous',
    actorId: 'anonymous',
    tenantId: null,
    entityId: null,
  }
}

async function hasEventAccess(
  input: ExecuteInteractionInput,
  actor: InteractionActorContext,
  deps: PermissionResolverDeps
): Promise<boolean> {
  if (actor.role === 'system') return true

  const eventId =
    input.target_type === 'event'
      ? input.target_id
      : input.context_type === 'event'
        ? input.context_id
        : null

  if (!eventId || !deps.db) return true

  try {
    const { data: event } = await deps.db
      .from('events')
      .select('tenant_id, client_id')
      .eq('id', eventId)
      .maybeSingle()

    if (!event) return false
    if (actor.role === 'chef' || actor.role === 'staff' || actor.role === 'partner') {
      return Boolean(actor.tenantId && event.tenant_id === actor.tenantId)
    }
    if (actor.role === 'client') {
      return Boolean(actor.entityId && event.client_id === actor.entityId)
    }
  } catch {
    return false
  }

  return false
}

async function isBlocked(
  input: ExecuteInteractionInput,
  actor: InteractionActorContext,
  deps: PermissionResolverDeps
): Promise<boolean> {
  if (actor.role === 'system' || !deps.db || input.target_type !== 'user') return false
  if (!actor.actorId || actor.actorId === 'anonymous') return false

  try {
    const { data } = await deps.db
      .from('interaction_events')
      .select('id')
      .eq('action_type', 'block')
      .eq('target_type', 'user')
      .eq('target_id', actor.actorId)
      .eq('actor_id', input.target_id)
      .limit(1)

    return Boolean(data && data.length > 0)
  } catch {
    return false
  }
}

export async function resolveInteractionPermissions(
  input: ExecuteInteractionInput,
  definition: InteractionDefinition,
  actor: InteractionActorContext,
  deps: PermissionResolverDeps = {}
): Promise<InteractionPermissionSnapshot> {
  const roleAllowed = definition.allowedRoles.includes(actor.role)
  const eventAccess = await hasEventAccess(input, actor, deps)
  const blocked = await isBlocked(input, actor, deps)
  const allowed = roleAllowed && eventAccess && !blocked

  return {
    allowed,
    actorRole: actor.role,
    reason: !roleAllowed
      ? 'role_not_allowed'
      : !eventAccess
        ? 'event_access_denied'
        : blocked
          ? 'blocked_by_target_user'
          : undefined,
    checks: {
      validAction: true,
      roleAllowed,
      eventAccess,
      userBlocking: !blocked,
    },
  }
}
