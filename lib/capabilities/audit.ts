import {
  CHEFFLOW_BUILD_STATUSES,
  CHEFFLOW_PRIORITIES,
  CHEFFLOW_SHELL_AREAS,
  CHEFFLOW_STRATEGIES,
  CHEFFLOW_TEST_STATUSES,
  type ChefFlowCapability,
  type ChefFlowPriority,
  type ChefFlowShellArea,
  type ChefFlowStrategy,
} from "./types"

export function isCapabilityGap(capability: ChefFlowCapability): boolean {
  return capability.strategy === "LAUNCH_ONLY"
    || capability.buildStatus !== "VERIFIED"
    || capability.testStatus !== "VERIFIED"
    || capability.externalInteractionRemaining.trim().length > 0
    || capability.productDebt
}

export function validateCapabilityRegistry(registry: ChefFlowCapability[]): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const entry of registry) {
    if (!entry.id.trim()) errors.push("Capability with empty id")
    if (ids.has(entry.id)) errors.push(`Duplicate capability id: ${entry.id}`)
    ids.add(entry.id)
    if (!entry.capability.trim()) errors.push(`${entry.id}: empty capability`)
    if (!entry.jobToBeDone.trim()) errors.push(`${entry.id}: empty jobToBeDone`)
    if (!entry.chefPersonas.length) errors.push(`${entry.id}: no personas`)
    if (!entry.operationTypes.length) errors.push(`${entry.id}: no operation types`)
    if (!entry.existingMarketLeaders.length) errors.push(`${entry.id}: no market leaders`)
    if (!entry.bestFeatures.length) errors.push(`${entry.id}: no best features`)
    if (!entry.painPoints.length) errors.push(`${entry.id}: no pain points`)
    if (!entry.chefFlowImplementation.trim()) errors.push(`${entry.id}: no ChefFlow implementation`)
    if (!entry.completionCriteria.length) errors.push(`${entry.id}: no completion criteria`)
    if (!CHEFFLOW_STRATEGIES.includes(entry.strategy)) errors.push(`${entry.id}: invalid strategy`)
    if (!CHEFFLOW_BUILD_STATUSES.includes(entry.buildStatus)) errors.push(`${entry.id}: invalid build status`)
    if (!CHEFFLOW_TEST_STATUSES.includes(entry.testStatus)) errors.push(`${entry.id}: invalid test status`)
    if (entry.strategy === "LAUNCH_ONLY" && !entry.externalInteractionRemaining.trim()) errors.push(`${entry.id}: LAUNCH_ONLY requires explicit external debt`)
    if (entry.strategy === "LAUNCH_ONLY" && !entry.productDebt) errors.push(`${entry.id}: LAUNCH_ONLY must be product debt`)
  }

  const covered = new Set(registry.map((entry) => entry.shell))
  for (const shell of CHEFFLOW_SHELL_AREAS) {
    if (!covered.has(shell)) errors.push(`Missing universal shell coverage: ${shell}`)
  }
  return errors
}

const priorityWeight: Record<ChefFlowPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }

export function getCapabilityBacklog(registry: ChefFlowCapability[]): ChefFlowCapability[] {
  return registry
    .filter(isCapabilityGap)
    .sort((a, b) => {
      const priority = priorityWeight[a.priority] - priorityWeight[b.priority]
      if (priority !== 0) return priority
      const launchDebt = Number(b.strategy === "LAUNCH_ONLY") - Number(a.strategy === "LAUNCH_ONLY")
      if (launchDebt !== 0) return launchDebt
      return a.shell.localeCompare(b.shell) || a.capability.localeCompare(b.capability)
    })
}

export interface CapabilityAuditSummary {
  total: number
  gaps: ChefFlowCapability[]
  stackEliminated: number
  byShell: Map<ChefFlowShellArea, ChefFlowCapability[]>
  byStrategy: Map<ChefFlowStrategy, ChefFlowCapability[]>
  byPriority: Map<ChefFlowPriority, ChefFlowCapability[]>
  launchOnlyDebt: ChefFlowCapability[]
}

export function getCapabilityAuditSummary(registry: ChefFlowCapability[]): CapabilityAuditSummary {
  const byShell = new Map<ChefFlowShellArea, ChefFlowCapability[]>()
  const byStrategy = new Map<ChefFlowStrategy, ChefFlowCapability[]>()
  const byPriority = new Map<ChefFlowPriority, ChefFlowCapability[]>()
  for (const shell of CHEFFLOW_SHELL_AREAS) byShell.set(shell, [])
  for (const strategy of CHEFFLOW_STRATEGIES) byStrategy.set(strategy, [])
  for (const priority of CHEFFLOW_PRIORITIES) byPriority.set(priority, [])

  for (const entry of registry) {
    byShell.get(entry.shell)?.push(entry)
    byStrategy.get(entry.strategy)?.push(entry)
    byPriority.get(entry.priority)?.push(entry)
  }

  const gaps = getCapabilityBacklog(registry)
  return {
    total: registry.length,
    gaps,
    stackEliminated: registry.length - gaps.length,
    byShell,
    byStrategy,
    byPriority,
    launchOnlyDebt: registry.filter((entry) => entry.strategy === "LAUNCH_ONLY"),
  }
}
