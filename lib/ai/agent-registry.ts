// Remy Agent - Action Registry
// Declarative registry for all agent write actions.
// Each action defines: executor (prepares preview), commitAction (executes on approval).
// No 'use server' - this is a pure registry. Executors/commits are called from the orchestrator.

import type { AgentSafetyLevel, AgentActionPreview } from '@/lib/ai/command-types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentActionContext {
  tenantId: string
  userId: string
}

export interface AgentActionDefinition {
  taskType: string
  name: string
  tier: 2 | 3
  safety: AgentSafetyLevel
  description: string
  inputSchema: string
  tierNote?: string
  /** Prepare the action: validate inputs, resolve entities, build preview */
  executor: (
    inputs: Record<string, unknown>,
    ctx: AgentActionContext
  ) => Promise<{ preview: AgentActionPreview; commitPayload: Record<string, unknown> }>
  /** Execute the action on chef approval */
  commitAction: (
    payload: Record<string, unknown>,
    ctx: AgentActionContext
  ) => Promise<{ success: boolean; message: string; redirectUrl?: string }>
}

// ─── Registry ───────────────────────────────────────────────────────────────

const registry = new Map<string, AgentActionDefinition>()

export function registerAgentAction(definition: AgentActionDefinition): void {
  if (registry.has(definition.taskType)) {
    console.warn(`[agent-registry] Overwriting existing action: ${definition.taskType}`)
  }
  registry.set(definition.taskType, definition)
}

export function registerAgentActions(definitions: AgentActionDefinition[]): void {
  for (const def of definitions) {
    registerAgentAction(def)
  }
}

export function getAgentAction(taskType: string): AgentActionDefinition | undefined {
  return registry.get(taskType)
}

export function isAgentAction(taskType: string): boolean {
  return registry.has(taskType)
}

export function listAgentActions(): AgentActionDefinition[] {
  return Array.from(registry.values())
}

/**
 * Build the agent action list for the intent parser system prompt.
 * Mirrors the format used by buildTaskListForPrompt() in command-task-descriptions.ts.
 */
export function buildAgentTaskListForPrompt(): string {
  const actions = listAgentActions()
  if (actions.length === 0) return ''

  const header = '\n// ─── Agent Write Actions (ALWAYS tier 2 - require chef approval) ───\n'
  const items = actions.map(
    (a) =>
      `- ${a.taskType} (Tier ${a.tier}, "${a.name}"): ${a.description}\n  Inputs: ${a.inputSchema}${a.tierNote ? `\n  IMPORTANT: ${a.tierNote}` : ''}`
  )
  return header + items.join('\n\n')
}
