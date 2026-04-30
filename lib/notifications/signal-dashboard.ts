import { applyAttentionBudget } from './attention-budget'
import { createCommandBrief } from './command-brief'
import {
  createDefaultEventDaySimulation,
  simulateNoiseScenario,
  type NoiseSimulationResult,
} from './noise-simulator'
import { createSuppressionAuditRecords } from './suppression-audit'
import { getSignalMatrix, type SignalPolicy } from './signal-os'

export type SignalDashboardSnapshot = {
  matrix: SignalPolicy[]
  simulation: NoiseSimulationResult
  attentionBudget: ReturnType<typeof applyAttentionBudget>
  suppressionAuditRecords: ReturnType<typeof createSuppressionAuditRecords>
  dailyBrief: ReturnType<typeof createCommandBrief>
}

export function createSignalDashboardSnapshot(
  generatedAt = new Date().toISOString()
): SignalDashboardSnapshot {
  const scenario = createDefaultEventDaySimulation()
  const simulation = simulateNoiseScenario(scenario)

  return {
    matrix: getSignalMatrix(),
    simulation,
    attentionBudget: applyAttentionBudget(simulation.evaluatedSignals),
    suppressionAuditRecords: createSuppressionAuditRecords(
      simulation.evaluatedSignals,
      generatedAt
    ),
    dailyBrief: createCommandBrief(scenario, 'daily', generatedAt),
  }
}
