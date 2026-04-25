import { getCurrentUser } from '@/lib/auth/get-user'
import { executeInteraction as executeInteractionBase } from './execute'
import type {
  ExecuteInteractionInput,
  ExecuteInteractionResult,
  InteractionActorContext,
} from './types'

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>

type ExecuteInteractionActionDeps = {
  executeInteraction?: (input: ExecuteInteractionInput) => Promise<ExecuteInteractionResult>
  getCurrentUser?: () => Promise<CurrentUser>
}

function actorFromCurrentUser(user: NonNullable<CurrentUser>): InteractionActorContext {
  return {
    role: user.role,
    actorId: user.id,
    tenantId: user.tenantId,
    entityId: user.entityId,
  }
}

export function createExecuteInteractionAction(deps: ExecuteInteractionActionDeps = {}) {
  return async function executeInteractionAction(
    input: ExecuteInteractionInput
  ): Promise<ExecuteInteractionResult> {
    const executeInteraction = deps.executeInteraction ?? executeInteractionBase

    if (input.actor) {
      return executeInteraction(input)
    }

    const currentUser = await (deps.getCurrentUser ?? getCurrentUser)()
    if (!currentUser) {
      return executeInteraction(input)
    }

    return executeInteraction({
      ...input,
      actor_id: currentUser.id,
      actor: actorFromCurrentUser(currentUser),
    })
  }
}

export async function executeInteractionAction(
  input: ExecuteInteractionInput
): Promise<ExecuteInteractionResult> {
  'use server'

  return createExecuteInteractionAction()(input)
}
