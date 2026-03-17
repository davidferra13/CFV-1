// Q-Table - Tabular Q-learning with SQLite persistence.
// Implements epsilon-greedy action selection with UCB1 exploration bonus.

import type { RLAction, RLConfig } from './types'
import { actionKey } from './types'
import * as db from './database'

export class QTable {
  private config: RLConfig
  private epsilon: number
  private episodeCount: number

  // In-memory cache for hot state-action pairs (flushed to SQLite periodically)
  private cache: Map<string, { qValue: number; visitCount: number }> = new Map()
  private dirty: Set<string> = new Set()

  constructor(config: RLConfig, epsilon?: number, episodeCount?: number) {
    this.config = config
    this.epsilon = epsilon ?? config.epsilonStart
    this.episodeCount = episodeCount ?? 0
  }

  /**
   * Select an action using epsilon-greedy with UCB1 tie-breaking.
   */
  selectAction(stateHash: string, availableActions: RLAction[]): RLAction {
    if (availableActions.length === 0) {
      throw new Error('No available actions to select from')
    }

    // Epsilon-greedy: random action with probability epsilon
    if (Math.random() < this.epsilon) {
      return availableActions[Math.floor(Math.random() * availableActions.length)]
    }

    // Greedy: choose action with highest Q-value (UCB1 tie-breaking)
    let bestAction = availableActions[0]
    let bestScore = -Infinity

    const totalVisits = availableActions.reduce((sum, a) => {
      return sum + this.getVisitCount(stateHash, actionKey(a))
    }, 0)

    for (const action of availableActions) {
      const key = actionKey(action)
      const qValue = this.getQValue(stateHash, key)
      const visits = this.getVisitCount(stateHash, key)

      // UCB1 exploration bonus for tie-breaking
      const ucbBonus =
        visits === 0
          ? 10 // Never-tried actions get a big bonus
          : Math.sqrt((2 * Math.log(Math.max(totalVisits, 1))) / visits)

      const score = qValue + ucbBonus * 0.1 // Small weight on exploration bonus

      if (score > bestScore) {
        bestScore = score
        bestAction = action
      }
    }

    return bestAction
  }

  /**
   * Update Q-value for a state-action pair using the Bellman equation.
   */
  update(stateHash: string, action: RLAction, reward: number, nextStateHash: string | null): void {
    const key = actionKey(action)
    const cacheKey = `${stateHash}::${key}`

    const currentQ = this.getQValue(stateHash, key)
    const currentVisits = this.getVisitCount(stateHash, key)

    // Max Q-value of next state (0 if terminal)
    const maxNextQ = nextStateHash ? this.getMaxQ(nextStateHash) : 0

    // Bellman equation
    const newQ = currentQ + this.config.alpha * (reward + this.config.gamma * maxNextQ - currentQ)

    // Update cache
    this.cache.set(cacheKey, { qValue: newQ, visitCount: currentVisits + 1 })
    this.dirty.add(cacheKey)
  }

  /**
   * Decay epsilon after an episode completes.
   */
  decayEpsilon(): void {
    this.episodeCount++
    this.epsilon = Math.max(this.config.epsilonMin, this.epsilon * this.config.epsilonDecay)
  }

  /**
   * Flush dirty cache entries to SQLite.
   */
  flush(): void {
    for (const cacheKey of this.dirty) {
      const [stateHash, aKey] = splitCacheKey(cacheKey)
      const entry = this.cache.get(cacheKey)
      if (entry) {
        db.updateQValue(stateHash, aKey, entry.qValue, entry.visitCount)
      }
    }
    this.dirty.clear()
  }

  /**
   * Get current epsilon value.
   */
  getEpsilon(): number {
    return this.epsilon
  }

  /**
   * Get current episode count.
   */
  getEpisodeCount(): number {
    return this.episodeCount
  }

  /**
   * Export state for checkpointing.
   */
  getCheckpointState(): { epsilon: number; episodeCount: number } {
    this.flush() // Ensure all data is in SQLite
    return { epsilon: this.epsilon, episodeCount: this.episodeCount }
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private getQValue(stateHash: string, aKey: string): number {
    const cacheKey = `${stateHash}::${aKey}`
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) return cached.qValue

    // Load from SQLite
    const qValue = db.getQValue(stateHash, aKey)
    return qValue
  }

  private getVisitCount(stateHash: string, aKey: string): number {
    const cacheKey = `${stateHash}::${aKey}`
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) return cached.visitCount

    return db.getVisitCount(stateHash, aKey)
  }

  private getMaxQ(stateHash: string): number {
    // Check cache first for any entries with this state
    let maxQ = -Infinity
    let foundInCache = false

    for (const [key, entry] of this.cache) {
      if (key.startsWith(stateHash + '::')) {
        maxQ = Math.max(maxQ, entry.qValue)
        foundInCache = true
      }
    }

    // Also check SQLite
    const dbMax = db.getMaxQValue(stateHash)
    if (dbMax !== 0 || !foundInCache) {
      maxQ = Math.max(maxQ === -Infinity ? 0 : maxQ, dbMax)
    }

    return maxQ === -Infinity ? 0 : maxQ
  }
}

function splitCacheKey(cacheKey: string): [string, string] {
  const firstSep = cacheKey.indexOf('::')
  return [cacheKey.substring(0, firstSep), cacheKey.substring(firstSep + 2)]
}
