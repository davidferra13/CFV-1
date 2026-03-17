// RL System Type Definitions
// All types used across the reinforcement learning agent system.

// ── State ────────────────────────────────────────────────────────────────────

export interface RLState {
  // Page identity
  route: string
  pageTitle: string
  routeGroup: string // chef | client | admin | staff | public

  // UI state
  visibleModals: string[]
  activeTab: string | null
  toastVisible: boolean
  toastType: string | null
  loadingSpinners: number

  // Form state
  formPresent: boolean
  formFieldCount: number
  formFilledCount: number
  formErrors: string[]

  // Data state
  listItemCount: number
  emptyState: boolean
  errorState: boolean

  // Navigation context
  sidebarExpanded: boolean

  // Performance signals
  domNodeCount: number
  heapUsedMB: number
  consoleErrors: number
  networkFailures: number
}

export function hashState(state: RLState): string {
  return [
    state.route,
    state.routeGroup,
    state.visibleModals.length,
    state.activeTab ?? 'none',
    state.formPresent ? 'form' : 'noform',
    state.emptyState ? 'empty' : 'data',
    state.errorState ? 'error' : 'ok',
  ].join('|')
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type ActionType =
  | 'click_nav_item'
  | 'click_button'
  | 'click_link'
  | 'click_tab'
  | 'click_dropdown_item'
  | 'click_card'
  | 'toggle_checkbox'
  | 'fill_text'
  | 'fill_number'
  | 'fill_date'
  | 'select_option'
  | 'fill_textarea'
  | 'submit_form'
  | 'clear_field'
  | 'confirm_dialog'
  | 'cancel_dialog'
  | 'dismiss_toast'
  | 'scroll_down'
  | 'scroll_up'
  | 'go_back'
  | 'go_home'

export interface RLAction {
  type: ActionType
  selector?: string
  text?: string
  value?: string
  href?: string
}

export function actionKey(action: RLAction): string {
  return [action.type, action.selector ?? '', action.text ?? ''].join('::')
}

// ── Rewards ──────────────────────────────────────────────────────────────────

export interface RewardBreakdown {
  navigation: number
  formSuccess: number
  formError: number
  consoleError: number
  networkFailure: number
  unhandledException: number
  deadEnd: number
  redundant: number
  loadingTimeout: number
  performance: number
}

export function totalReward(breakdown: RewardBreakdown): number {
  return Object.values(breakdown).reduce((sum, v) => sum + v, 0)
}

// ── Archetypes ───────────────────────────────────────────────────────────────

export interface ArchetypeProfile {
  id: string
  role: 'chef' | 'client' | 'staff' | 'partner'
  description: string
  technicalProficiency: 'low' | 'medium' | 'high'
  usageFrequency: 'first-time' | 'occasional' | 'weekly' | 'daily'
  primaryWorkflows: string[]
  goalSet: string[]
  viewport: { width: number; height: number }
  sessionDurationMinutes: number
}

export interface BehavioralModifiers {
  patience: number // 0-1
  attentionSpan: number // 0-1
  technicalSkill: number // 0-1
  errorRecovery: number // 0-1
  explorationTendency: number // 0-1
}

// ── Episodes ─────────────────────────────────────────────────────────────────

export interface EpisodeConfig {
  archetypeId: string
  goalId: string | null
  maxSteps: number
  viewportWidth: number
  viewportHeight: number
  networkThrottle: string | null
  cpuThrottle: number
  subAgent: string | null
}

export type TerminalReason =
  | 'goal_achieved'
  | 'dead_end'
  | 'error'
  | 'timeout'
  | 'max_steps'
  | 'crash'

export interface EpisodeResult {
  episodeId: number
  startedAt: string
  endedAt: string
  archetypeId: string
  goalId: string | null
  goalAchieved: boolean
  totalSteps: number
  totalReward: number
  terminalReason: TerminalReason
  uniqueRoutesVisited: number
  consoleErrors: number
  networkFailures: number
}

// ── Transitions ──────────────────────────────────────────────────────────────

export interface Transition {
  episodeId: number
  stepNumber: number
  timestamp: string
  stateHash: string
  route: string
  routeGroup: string
  pageTitle: string
  domNodeCount: number
  heapUsedMB: number
  actionType: ActionType
  actionSelector: string | null
  actionText: string | null
  actionValue: string | null
  nextStateHash: string | null
  nextRoute: string | null
  reward: number
  rewardBreakdown: RewardBreakdown
  consoleErrors: string[]
  networkFailures: string[]
  screenshotPath: string | null
  actionDurationMs: number
  pageLoadMs: number
}

// ── Anomalies ────────────────────────────────────────────────────────────────

export type AnomalySeverity = 'critical' | 'warning' | 'info'

export type AnomalyCategory =
  | 'crash'
  | 'memory_leak'
  | 'dead_end'
  | 'slow_page'
  | 'console_error'
  | 'network_failure'
  | 'unhandled_exception'

export interface Anomaly {
  detectedAt: string
  episodeId: number
  severity: AnomalySeverity
  category: AnomalyCategory
  route: string
  description: string
  reproductionSteps: RLAction[]
  screenshotPath: string | null
}

// ── Q-Table ──────────────────────────────────────────────────────────────────

export interface QEntry {
  stateHash: string
  actionKey: string
  qValue: number
  visitCount: number
  lastUpdated: string
}

// ── Checkpoint ───────────────────────────────────────────────────────────────

export interface CheckpointMeta {
  timestamp: string
  episodeNumber: number
  epsilon: number
  totalReward: number
  routesCovered: number
  anomaliesFound: number
}

// ── Config ───────────────────────────────────────────────────────────────────

export interface RLConfig {
  // Target
  baseUrl: string

  // Learning
  alpha: number // learning rate
  gamma: number // discount factor
  epsilonStart: number
  epsilonMin: number
  epsilonDecay: number

  // Episode limits
  maxStepsPerEpisode: number
  sessionTimeoutMs: number

  // Browser
  maxConcurrentBrowsers: number
  actionDelayMinMs: number
  actionDelayMaxMs: number
  pageLoadTimeoutMs: number

  // Checkpointing
  checkpointEveryEpisodes: number
  checkpointEveryMinutes: number

  // Screenshots
  screenshotOnAnomaly: boolean
  screenshotEveryNthAction: number

  // Data retention
  maxStoredEpisodes: number
  maxStoredScreenshots: number
}

export const DEFAULT_CONFIG: RLConfig = {
  baseUrl: 'https://beta.cheflowhq.com',
  alpha: 0.1,
  gamma: 0.95,
  epsilonStart: 0.3,
  epsilonMin: 0.05,
  epsilonDecay: 0.999,
  maxStepsPerEpisode: 200,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  maxConcurrentBrowsers: 3,
  actionDelayMinMs: 200,
  actionDelayMaxMs: 800,
  pageLoadTimeoutMs: 15_000,
  checkpointEveryEpisodes: 100,
  checkpointEveryMinutes: 60,
  screenshotOnAnomaly: true,
  screenshotEveryNthAction: 10,
  maxStoredEpisodes: 10_000,
  maxStoredScreenshots: 1_000,
}
