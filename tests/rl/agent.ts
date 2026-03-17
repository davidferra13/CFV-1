// RL Agent - Core episode runner that executes the observe-act-learn loop.
// Each episode simulates a user session with a specific archetype and goal.

import { Page, BrowserContext, chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import type {
  RLAction,
  RLState,
  EpisodeConfig,
  EpisodeResult,
  TerminalReason,
  RewardBreakdown,
  Anomaly,
  RLConfig,
} from './types'
import { hashState, actionKey, totalReward } from './types'
import { observeStateWithHash } from './state-observer'
import { discoverActions } from './action-discoverer'
import { executeAction } from './action-executor'
import { filterSafeActions } from './safety-filter'
import { QTable } from './q-table'
import { calculateImmediateReward } from './reward-calculator'
import { checkGoal } from './goal-detectors'
import * as db from './database'

const SCREENSHOT_DIR = path.resolve(__dirname, '../../data/rl-screenshots')

export class RLAgent {
  private config: RLConfig
  private qTable: QTable

  constructor(config: RLConfig, qTable: QTable) {
    this.config = config
    this.qTable = qTable
  }

  /**
   * Run a single episode (one simulated user session).
   */
  async runEpisode(context: BrowserContext, episodeConfig: EpisodeConfig): Promise<EpisodeResult> {
    const episodeId = db.createEpisode(episodeConfig)
    const startedAt = new Date().toISOString()
    const startTime = Date.now()

    const page = await context.newPage()
    await page.setViewportSize({
      width: episodeConfig.viewportWidth,
      height: episodeConfig.viewportHeight,
    })

    // Track metrics across the episode
    let totalEpisodeReward = 0
    let step = 0
    let terminalReason: TerminalReason = 'max_steps'
    let goalAchieved = false
    const visitedRoutes = new Set<string>()
    let totalConsoleErrors = 0
    let totalNetworkFailures = 0
    const actionHistory: RLAction[] = []
    let maxHeapMb = 0
    let maxDomNodes = 0
    let totalPageLoadMs = 0
    let pageLoadCount = 0

    try {
      // Navigate to starting page based on role
      const startPage = episodeConfig.archetypeId === 'client-hiring' ? '/my-events' : '/dashboard'

      await page.goto(`${this.config.baseUrl}${startPage}`, {
        timeout: this.config.pageLoadTimeoutMs,
        waitUntil: 'commit',
      })
      await page.waitForTimeout(1000) // Let React hydrate

      // Identify RL agent traffic in PostHog
      await page
        .evaluate(() => {
          if ((window as any).posthog) {
            ;(window as any).posthog.identify('rl-agent', { is_rl_agent: true })
          }
        })
        .catch(() => {})

      // Main episode loop
      while (step < episodeConfig.maxSteps) {
        // Check timeout
        if (Date.now() - startTime > this.config.sessionTimeoutMs) {
          terminalReason = 'timeout'
          break
        }

        // Observe current state
        const { state: currentState, hash: currentHash } = await observeStateWithHash(page)
        visitedRoutes.add(currentState.route)

        // Track performance peaks
        if (currentState.heapUsedMB > maxHeapMb) maxHeapMb = currentState.heapUsedMB
        if (currentState.domNodeCount > maxDomNodes) maxDomNodes = currentState.domNodeCount

        // Check for route discovery
        if (!db.isRouteDiscovered(currentState.route)) {
          db.recordDiscovery(
            episodeId,
            'route',
            currentState.route,
            `New route discovered: ${currentState.route}`
          )
          console.log(`  [discovery] New route: ${currentState.route}`)
        }

        // Check goal completion
        if (episodeConfig.goalId) {
          goalAchieved = await checkGoal(episodeConfig.goalId, page)
          if (goalAchieved) {
            terminalReason = 'goal_achieved'
            totalEpisodeReward += 50
            break
          }
        }

        // Discover available actions
        let actions = await discoverActions(page)
        actions = filterSafeActions(actions, currentState.route)

        // Check for dead end
        const meaningfulActions = actions.filter(
          (a) =>
            a.type !== 'go_back' &&
            a.type !== 'go_home' &&
            a.type !== 'scroll_down' &&
            a.type !== 'scroll_up'
        )
        if (meaningfulActions.length === 0 && step > 5) {
          // Still allow navigation-only actions
          if (actions.length === 0) {
            terminalReason = 'dead_end'
            totalEpisodeReward -= 5

            // Record dead end anomaly
            db.recordAnomaly({
              detectedAt: new Date().toISOString(),
              episodeId,
              severity: 'warning',
              category: 'dead_end',
              route: currentState.route,
              description: `Dead end: no available actions on ${currentState.route}`,
              reproductionSteps: actionHistory.slice(-5),
              screenshotPath: await this.takeScreenshot(page, episodeId, step, 'dead-end'),
            })
            break
          }
        }

        if (actions.length === 0) {
          terminalReason = 'dead_end'
          break
        }

        // Select action via Q-learning policy
        const selectedAction = this.qTable.selectAction(currentHash, actions)
        actionHistory.push(selectedAction)

        // Execute action
        const actionResult = await executeAction(page, selectedAction, {
          pageLoadTimeoutMs: this.config.pageLoadTimeoutMs,
        })

        // Track metrics
        totalConsoleErrors += actionResult.newConsoleErrors.length
        totalNetworkFailures += actionResult.newNetworkFailures.length
        if (actionResult.pageLoadMs > 0) {
          totalPageLoadMs += actionResult.pageLoadMs
          pageLoadCount++
        }

        // Observe next state
        const { state: nextState, hash: nextHash } = await observeStateWithHash(page)

        // Calculate reward
        const rewardBreakdown = calculateImmediateReward(currentState, nextState, actionResult)
        const reward = totalReward(rewardBreakdown)
        totalEpisodeReward += reward

        // Update Q-table
        this.qTable.update(currentHash, selectedAction, reward, nextHash)

        // Record transition
        db.recordTransition({
          episodeId,
          stepNumber: step,
          timestamp: new Date().toISOString(),
          stateHash: currentHash,
          route: currentState.route,
          routeGroup: currentState.routeGroup,
          pageTitle: currentState.pageTitle,
          domNodeCount: currentState.domNodeCount,
          heapUsedMB: currentState.heapUsedMB,
          actionType: selectedAction.type,
          actionSelector: selectedAction.selector ?? null,
          actionText: selectedAction.text ?? null,
          actionValue: selectedAction.value ?? null,
          nextStateHash: nextHash,
          nextRoute: nextState.route,
          reward,
          rewardBreakdown,
          consoleErrors: actionResult.newConsoleErrors,
          networkFailures: actionResult.newNetworkFailures,
          screenshotPath: null,
          actionDurationMs: actionResult.durationMs,
          pageLoadMs: actionResult.pageLoadMs,
        })

        // Record route visit
        db.recordRouteVisit(
          nextState.route,
          actionResult.pageLoadMs,
          actionResult.newConsoleErrors.length > 0
        )

        // Detect anomalies
        await this.detectAnomalies(
          episodeId,
          step,
          currentState,
          nextState,
          actionResult,
          rewardBreakdown,
          actionHistory,
          page
        )

        // Periodic screenshot
        if (
          this.config.screenshotEveryNthAction > 0 &&
          step % this.config.screenshotEveryNthAction === 0
        ) {
          await this.takeScreenshot(page, episodeId, step, 'periodic')
        }

        // Random delay to simulate human timing
        const delay =
          this.config.actionDelayMinMs +
          Math.random() * (this.config.actionDelayMaxMs - this.config.actionDelayMinMs)
        await page.waitForTimeout(delay)

        step++

        // Check for page crash
        try {
          await page.evaluate(() => true)
        } catch {
          terminalReason = 'crash'
          totalEpisodeReward -= 20
          db.recordAnomaly({
            detectedAt: new Date().toISOString(),
            episodeId,
            severity: 'critical',
            category: 'crash',
            route: currentState.route,
            description: `Page crashed after action: ${selectedAction.type} "${selectedAction.text}"`,
            reproductionSteps: actionHistory.slice(-10),
            screenshotPath: null,
          })
          break
        }
      }
    } catch (err) {
      terminalReason = 'error'
      totalEpisodeReward -= 10
      console.error(
        `  [error] Episode ${episodeId} failed:`,
        err instanceof Error ? err.message : err
      )
    } finally {
      await page.close().catch(() => {})
    }

    // Record episode result
    const result: EpisodeResult = {
      episodeId,
      startedAt,
      endedAt: new Date().toISOString(),
      archetypeId: episodeConfig.archetypeId,
      goalId: episodeConfig.goalId,
      goalAchieved,
      totalSteps: step,
      totalReward: totalEpisodeReward,
      terminalReason,
      uniqueRoutesVisited: visitedRoutes.size,
      consoleErrors: totalConsoleErrors,
      networkFailures: totalNetworkFailures,
    }

    db.completeEpisode(result)

    // Record session metrics
    db.recordSessionMetrics(episodeId, {
      avgPageLoadMs: pageLoadCount > 0 ? totalPageLoadMs / pageLoadCount : 0,
      maxHeapMb: maxHeapMb,
      maxDomNodes: maxDomNodes,
      totalConsoleErrors,
      totalNetworkFailures,
      uniqueRoutesVisited: visitedRoutes.size,
      actionsPerMinute: step / ((Date.now() - startTime) / 60000),
      goalCompletionTimeS: goalAchieved ? (Date.now() - startTime) / 1000 : null,
    })

    return result
  }

  // ── Anomaly Detection ──────────────────────────────────────────────────

  private async detectAnomalies(
    episodeId: number,
    step: number,
    prevState: RLState,
    nextState: RLState,
    actionResult: { newConsoleErrors: string[]; newNetworkFailures: string[]; pageLoadMs: number },
    rewardBreakdown: RewardBreakdown,
    actionHistory: RLAction[],
    page: Page
  ): Promise<void> {
    // Unhandled exceptions
    if (!prevState.errorState && nextState.errorState) {
      db.recordAnomaly({
        detectedAt: new Date().toISOString(),
        episodeId,
        severity: 'critical',
        category: 'unhandled_exception',
        route: nextState.route,
        description: `Error state appeared on ${nextState.route}`,
        reproductionSteps: actionHistory.slice(-5),
        screenshotPath: await this.takeScreenshot(page, episodeId, step, 'error'),
      })
    }

    // Server errors (5xx)
    const serverErrors = actionResult.newNetworkFailures.filter(
      (f) => f.includes('500') || f.includes('502') || f.includes('503')
    )
    if (serverErrors.length > 0) {
      db.recordAnomaly({
        detectedAt: new Date().toISOString(),
        episodeId,
        severity: 'critical',
        category: 'network_failure',
        route: nextState.route,
        description: `Server error: ${serverErrors[0]}`,
        reproductionSteps: actionHistory.slice(-5),
        screenshotPath: await this.takeScreenshot(page, episodeId, step, 'server-error'),
      })
    }

    // Memory leak detection
    if (prevState.heapUsedMB > 0 && nextState.heapUsedMB > prevState.heapUsedMB * 2) {
      db.recordAnomaly({
        detectedAt: new Date().toISOString(),
        episodeId,
        severity: 'warning',
        category: 'memory_leak',
        route: nextState.route,
        description: `Memory doubled: ${prevState.heapUsedMB.toFixed(1)}MB -> ${nextState.heapUsedMB.toFixed(1)}MB`,
        reproductionSteps: actionHistory.slice(-5),
        screenshotPath: null,
      })
    }

    // Slow page
    if (actionResult.pageLoadMs > 8000) {
      db.recordAnomaly({
        detectedAt: new Date().toISOString(),
        episodeId,
        severity: 'warning',
        category: 'slow_page',
        route: nextState.route,
        description: `Slow page load: ${actionResult.pageLoadMs}ms on ${nextState.route}`,
        reproductionSteps: actionHistory.slice(-3),
        screenshotPath: null,
      })
    }

    // Significant console errors (not noise)
    for (const error of actionResult.newConsoleErrors) {
      if (
        error.includes('TypeError') ||
        error.includes('ReferenceError') ||
        error.includes('Cannot read')
      ) {
        db.recordAnomaly({
          detectedAt: new Date().toISOString(),
          episodeId,
          severity: 'warning',
          category: 'console_error',
          route: nextState.route,
          description: `JS Error: ${error.substring(0, 200)}`,
          reproductionSteps: actionHistory.slice(-3),
          screenshotPath: null,
        })
      }
    }
  }

  // ── Screenshots ────────────────────────────────────────────────────────

  private async takeScreenshot(
    page: Page,
    episodeId: number,
    step: number,
    reason: string
  ): Promise<string | null> {
    try {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
      const filename = `ep${episodeId}-step${step}-${reason}.png`
      const filepath = path.join(SCREENSHOT_DIR, filename)
      await page.screenshot({ path: filepath, fullPage: false })
      return filepath
    } catch {
      return null
    }
  }
}
