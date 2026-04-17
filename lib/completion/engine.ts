// Completion Engine - Central Dispatcher
// Routes evaluation requests to entity-specific evaluators.
// No 'use server' - called by actions.ts which has the directive.

import type { EntityType, CompletionResult } from './types'
import { evaluateEvent } from './evaluators/event'
import { evaluateClient } from './evaluators/client'
import { evaluateMenu } from './evaluators/menu'
import { evaluateRecipe } from './evaluators/recipe'
import { evaluateIngredient } from './evaluators/ingredient'

export async function evaluateCompletion(
  entityType: EntityType,
  entityId: string,
  tenantId: string,
  opts?: { shallow?: boolean }
): Promise<CompletionResult | null> {
  switch (entityType) {
    case 'event':
      return evaluateEvent(entityId, tenantId, opts)
    case 'client':
      return evaluateClient(entityId, tenantId)
    case 'menu':
      return evaluateMenu(entityId, tenantId, opts)
    case 'recipe':
      return evaluateRecipe(entityId, tenantId)
    case 'ingredient':
      return evaluateIngredient(entityId, tenantId)
    default:
      return null
  }
}
