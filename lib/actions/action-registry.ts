import type { ActionDef, ActionResult, ActionContext, ActionSurface } from './types'

const registry = new Map<string, ActionDef>()

export function registerAction(def: ActionDef) {
  registry.set(def.id, def)
}

export function getAction(id: string): ActionDef | undefined {
  return registry.get(id)
}

export function getActionsForSurface(surface: ActionSurface): ActionDef[] {
  return Array.from(registry.values()).filter((def) => def.availableOn.includes(surface))
}

export async function executeAction(
  actionId: string,
  entityId: string,
  context: ActionContext = {}
): Promise<ActionResult> {
  const def = registry.get(actionId)
  if (!def) return { success: false, message: `Unknown action: ${actionId}` }

  return def.execute(entityId, context)
}

export function getAllActions(): ActionDef[] {
  return Array.from(registry.values())
}
