// Sim-to-Real Loop - Shared Types
// No 'use server' - safe to import from any context

export type SimModule =
  | 'inquiry_parse'
  | 'client_parse'
  | 'allergen_risk'
  | 'correspondence'
  | 'menu_suggestions'
  | 'quote_draft'

export const ALL_SIM_MODULES: SimModule[] = [
  'inquiry_parse',
  'client_parse',
  'allergen_risk',
  'correspondence',
  'menu_suggestions',
  'quote_draft',
]

export const SIM_MODULE_LABELS: Record<SimModule, string> = {
  inquiry_parse: 'Inquiry Parsing',
  client_parse: 'Client Parsing',
  allergen_risk: 'Allergen Risk Detection',
  correspondence: 'Correspondence Drafting',
  menu_suggestions: 'Menu Suggestions',
  quote_draft: 'Quote Drafting',
}

/** A single generated test scenario */
export interface SimScenario {
  id: string
  module: SimModule
  /** Natural language input - what gets sent to the AI */
  inputText: string
  /** Ground truth fields used during evaluation */
  groundTruth: Record<string, unknown>
  /** Optional supporting context (e.g. lifecycle stage for correspondence) */
  context?: Record<string, unknown>
}

/** Result of running one scenario through the pipeline */
export interface SimResult {
  scenarioId: string
  module: SimModule
  rawOutput: unknown
  score: number // 0–100
  passed: boolean // score >= 70
  failures: string[] // what went wrong
  durationMs: number
  createdAt: string
}

/** Aggregate metadata for one simulation batch */
export interface SimRun {
  id: string
  startedAt: string
  completedAt: string | null
  scenarioCount: number
  passedCount: number
  passRate: number // 0–1, e.g. 0.85 = 85%
  moduleBreakdown: Partial<
    Record<SimModule, { count: number; passedCount: number; passRate: number }>
  >
  status: 'running' | 'completed' | 'failed'
}

/** Config passed to startSimulationRun() */
export interface SimRunConfig {
  modules: SimModule[]
  scenariosPerModule: number // default 5, max 20
}

/** Summary returned by getSimulationSummary() for the UI */
export interface SimSummary {
  latestRun: SimRun | null
  allTimePassRate: number | null
  totalScenariosRun: number
  modulePassRates: Partial<Record<SimModule, number>>
  fineTuningExampleCount: number
}
