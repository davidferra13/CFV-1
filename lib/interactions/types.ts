export type InteractionLayer =
  | 'content'
  | 'social'
  | 'communication'
  | 'discovery'
  | 'creation'
  | 'moderation'
  | 'engagement'
  | 'presence'
  | 'personalization'
  | 'structure'
  | 'transactional'
  | 'chef_native'
  | 'automation'

export type InteractionTargetType = 'content' | 'user' | 'event' | 'menu' | 'system'
export type InteractionContextType = 'event' | 'menu' | 'client' | 'message' | null
export type InteractionState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'hidden'
export type InteractionVisibility = 'public' | 'private' | 'role' | 'event' | 'system'
export type InteractionActorRole = 'anonymous' | 'chef' | 'client' | 'staff' | 'partner' | 'system'

export type InteractionPermissionSnapshot = {
  allowed: boolean
  actorRole: InteractionActorRole
  reason?: string
  checks: {
    validAction: boolean
    roleAllowed: boolean
    eventAccess: boolean
    userBlocking: boolean
  }
}

export type InteractionDefinition = {
  actionType: string
  layer: InteractionLayer
  targetTypes: InteractionTargetType[]
  contextTypes: InteractionContextType[]
  defaultState: InteractionState
  defaultVisibility: InteractionVisibility
  allowedRoles: InteractionActorRole[]
  sideEffects: Array<'notification' | 'activity' | 'automation'>
  duplicateWindowMs?: number
}

export type InteractionActorContext = {
  role: InteractionActorRole
  actorId: string
  tenantId?: string | null
  entityId?: string | null
}

export type ExecuteInteractionInput = {
  action_type: string
  actor_id?: string | null
  target_type: InteractionTargetType
  target_id: string
  context_type?: InteractionContextType
  context_id?: string | null
  state?: InteractionState
  visibility?: InteractionVisibility
  permissions?: Record<string, unknown>
  metadata?: Record<string, unknown>
  actor?: Partial<InteractionActorContext>
  idempotency_key?: string | null
}

export type InteractionEvent = {
  id: string
  action_type: string
  actor_id: string
  target_type: InteractionTargetType
  target_id: string
  context_type: InteractionContextType
  context_id: string | null
  state: InteractionState
  visibility: InteractionVisibility
  permissions: InteractionPermissionSnapshot | Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ExecuteInteractionResult =
  | {
      ok: true
      event: InteractionEvent
      duplicate: boolean
      sideEffects: Array<{ name: string; ok: boolean }>
    }
  | {
      ok: false
      error: {
        code:
          | 'unknown_action'
          | 'invalid_target'
          | 'invalid_context'
          | 'permission_denied'
          | 'write_failed'
        message: string
      }
      permissions?: InteractionPermissionSnapshot
    }
