import { createServerClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getInteractionDefinition } from './registry'
import { resolveInteractionActor, resolveInteractionPermissions } from './permissions'
import { resolveInteractionVisibility } from './visibility'
import { runInteractionSideEffects } from './automation-hooks'
import type { ExecuteInteractionInput, ExecuteInteractionResult, InteractionEvent } from './types'

type InteractionExecutorDeps = {
  db?: any
  getCurrentUser?: typeof getCurrentUser
  runSideEffects?: typeof runInteractionSideEffects
  now?: () => Date
}

function makeIdempotencyKey(input: ExecuteInteractionInput): string {
  return [
    input.action_type,
    input.actor_id ?? input.actor?.actorId ?? 'anonymous',
    input.target_type,
    input.target_id,
    input.context_type ?? 'null',
    input.context_id ?? 'null',
  ].join(':')
}

export function createInteractionExecutor(deps: InteractionExecutorDeps = {}) {
  return async function executeInteraction(
    input: ExecuteInteractionInput
  ): Promise<ExecuteInteractionResult> {
    const definition = getInteractionDefinition(input.action_type)
    if (!definition) {
      return {
        ok: false,
        error: {
          code: 'unknown_action',
          message: `Unknown interaction action_type "${input.action_type}"`,
        },
      }
    }

    if (!definition.targetTypes.includes(input.target_type)) {
      return {
        ok: false,
        error: {
          code: 'invalid_target',
          message: `${input.action_type} does not support target_type "${input.target_type}"`,
        },
      }
    }

    const contextType = input.context_type ?? null
    if (!definition.contextTypes.includes(contextType)) {
      return {
        ok: false,
        error: {
          code: 'invalid_context',
          message: `${input.action_type} does not support context_type "${String(contextType)}"`,
        },
      }
    }

    const db = deps.db ?? createServerClient({ admin: true })
    const actor = await resolveInteractionActor(input, {
      db,
      getCurrentUser: deps.getCurrentUser ?? getCurrentUser,
    })
    const permissions = await resolveInteractionPermissions(input, definition, actor, {
      db,
      getCurrentUser: deps.getCurrentUser ?? getCurrentUser,
    })

    if (!permissions.allowed) {
      return {
        ok: false,
        error: {
          code: 'permission_denied',
          message: permissions.reason ?? 'Interaction permission denied',
        },
        permissions,
      }
    }

    const now = (deps.now ?? (() => new Date()))().toISOString()
    const visibility = resolveInteractionVisibility(input, definition, actor)
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      interaction_layer: definition.layer,
    }
    const idempotencyKey = input.idempotency_key ?? makeIdempotencyKey(input)
    const duplicateWindowMs = definition.duplicateWindowMs ?? 0

    try {
      if (duplicateWindowMs > 0) {
        const since = new Date(Date.now() - duplicateWindowMs).toISOString()
        const { data: existing } = await db
          .from('interaction_events')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)

        if (existing && existing.length > 0) {
          return {
            ok: true,
            event: existing[0] as InteractionEvent,
            duplicate: true,
            sideEffects: [],
          }
        }
      }

      const payload = {
        action_type: input.action_type,
        actor_id: actor.actorId,
        target_type: input.target_type,
        target_id: input.target_id,
        context_type: contextType,
        context_id: input.context_id ?? null,
        state: input.state ?? definition.defaultState,
        visibility,
        permissions: {
          ...permissions,
          ...(input.permissions ?? {}),
        },
        metadata,
        tenant_id:
          actor.tenantId ?? (typeof metadata.tenant_id === 'string' ? metadata.tenant_id : null),
        idempotency_key: idempotencyKey,
        created_at: now,
        updated_at: now,
      }

      const { data: inserted, error } = await db
        .from('interaction_events')
        .insert(payload)
        .select('*')
        .single()

      if (error || !inserted) {
        return {
          ok: false,
          error: {
            code: 'write_failed',
            message: error?.message ?? 'Failed to write interaction event',
          },
          permissions,
        }
      }

      const event = inserted as InteractionEvent
      const sideEffects = await (deps.runSideEffects ?? runInteractionSideEffects)(
        event,
        definition.sideEffects
      )

      return {
        ok: true,
        event,
        duplicate: false,
        sideEffects,
      }
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'write_failed',
          message: err instanceof Error ? err.message : 'Failed to execute interaction',
        },
        permissions,
      }
    }
  }
}

export const executeInteraction = createInteractionExecutor()
