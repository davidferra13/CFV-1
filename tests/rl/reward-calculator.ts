// Reward Calculator - Computes rewards for state transitions.
// Combines immediate feedback signals with deferred episode-level rewards.

import type { RLState, RewardBreakdown } from './types'
import { totalReward } from './types'
import type { ActionResult } from './action-executor'

/**
 * Calculate the immediate reward for a single action/transition.
 */
export function calculateImmediateReward(
  prevState: RLState,
  nextState: RLState,
  actionResult: ActionResult
): RewardBreakdown {
  const breakdown: RewardBreakdown = {
    navigation: 0,
    formSuccess: 0,
    formError: 0,
    consoleError: 0,
    networkFailure: 0,
    unhandledException: 0,
    deadEnd: 0,
    redundant: 0,
    loadingTimeout: 0,
    performance: 0,
  }

  // Successful navigation to a new page
  if (actionResult.success && actionResult.navigated) {
    breakdown.navigation = 1
  }

  // Action failed entirely
  if (!actionResult.success) {
    breakdown.navigation = -1
    if (actionResult.error?.includes('Timeout')) {
      breakdown.loadingTimeout = -3
    }
  }

  // Form submission results
  if (nextState.toastVisible) {
    if (nextState.toastType === 'success') {
      breakdown.formSuccess = 5
    } else if (nextState.toastType === 'error') {
      breakdown.formError = -2
    }
  }

  // New form validation errors appeared
  const newFormErrors = nextState.formErrors.filter((e) => !prevState.formErrors.includes(e))
  if (newFormErrors.length > 0) {
    breakdown.formError += -1 * newFormErrors.length
  }

  // Console errors
  if (actionResult.newConsoleErrors.length > 0) {
    breakdown.consoleError = -3 * actionResult.newConsoleErrors.length
  }

  // Network failures (5xx)
  const serverErrors = actionResult.newNetworkFailures.filter(
    (f) => f.includes('500') || f.includes('502') || f.includes('503')
  )
  if (serverErrors.length > 0) {
    breakdown.networkFailure = -5 * serverErrors.length
  }

  // Page crashed or showed error state
  if (!prevState.errorState && nextState.errorState) {
    breakdown.unhandledException = -10
  }

  // Redundant action (stayed on same page, same state)
  if (
    prevState.route === nextState.route &&
    !actionResult.navigated &&
    !nextState.toastVisible &&
    prevState.formFieldCount === nextState.formFieldCount
  ) {
    breakdown.redundant = -0.5
  }

  // Performance signals
  if (nextState.heapUsedMB > 0) {
    if (nextState.heapUsedMB > prevState.heapUsedMB * 1.5 && prevState.heapUsedMB > 0) {
      breakdown.performance = -2 // Significant memory jump
    }
  }

  // Slow page load
  if (actionResult.pageLoadMs > 5000) {
    breakdown.performance += -2
  } else if (actionResult.pageLoadMs > 0 && actionResult.pageLoadMs < 2000) {
    breakdown.performance += 1
  }

  return breakdown
}

/**
 * Calculate deferred rewards at the end of an episode.
 */
export function calculateEpisodeReward(
  goalAchieved: boolean,
  isNewOptimalPath: boolean,
  newRoutesDiscovered: number,
  newInteractionsDiscovered: number,
  totalConsoleErrors: number,
  totalSteps: number
): number {
  let reward = 0

  // Goal completion
  if (goalAchieved) {
    reward += 50
    if (isNewOptimalPath) {
      reward += 50 // Bonus for finding a more efficient path
    }
  }

  // New routes discovered
  reward += newRoutesDiscovered * 10

  // New interactions discovered
  reward += newInteractionsDiscovered * 5

  // Session stability bonus
  if (totalConsoleErrors === 0) {
    reward += 10
  }

  // Efficiency penalty for very long episodes with no goal
  if (!goalAchieved && totalSteps > 150) {
    reward -= 5
  }

  return reward
}

/**
 * Normalize a reward value to [-1, 1] range.
 */
export function normalizeReward(reward: number, maxObserved: number, minObserved: number): number {
  const range = Math.max(Math.abs(maxObserved), Math.abs(minObserved), 1)
  return Math.max(-1, Math.min(1, reward / range))
}
