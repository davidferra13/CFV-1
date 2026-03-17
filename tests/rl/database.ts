// RL Database - SQLite storage for all reinforcement learning data.
// Uses WAL mode for crash safety and concurrent read performance.

import Database from 'better-sqlite3'
import path from 'path'
import type {
  Anomaly,
  EpisodeConfig,
  EpisodeResult,
  QEntry,
  RLAction,
  RewardBreakdown,
  Transition,
} from './types'

const DB_PATH = path.resolve(__dirname, '../../data/rl-db/chefflow-rl.sqlite')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      archetype_id TEXT NOT NULL,
      goal_id TEXT,
      goal_achieved INTEGER DEFAULT 0,
      total_steps INTEGER DEFAULT 0,
      total_reward REAL DEFAULT 0,
      terminal_reason TEXT,
      viewport_width INTEGER,
      viewport_height INTEGER,
      network_throttle TEXT,
      cpu_throttle REAL DEFAULT 1.0,
      sub_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS transitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id INTEGER NOT NULL REFERENCES episodes(id),
      step_number INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      state_hash TEXT NOT NULL,
      route TEXT NOT NULL,
      route_group TEXT,
      page_title TEXT,
      dom_node_count INTEGER,
      heap_used_mb REAL,
      action_type TEXT NOT NULL,
      action_selector TEXT,
      action_text TEXT,
      action_value TEXT,
      next_state_hash TEXT,
      next_route TEXT,
      reward REAL NOT NULL,
      reward_breakdown TEXT,
      console_errors TEXT,
      network_failures TEXT,
      screenshot_path TEXT,
      action_duration_ms INTEGER,
      page_load_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS discoveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discovered_at TEXT NOT NULL,
      episode_id INTEGER NOT NULL REFERENCES episodes(id),
      discovery_type TEXT NOT NULL,
      route TEXT,
      description TEXT,
      screenshot_path TEXT
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      detected_at TEXT NOT NULL,
      episode_id INTEGER REFERENCES episodes(id),
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      route TEXT,
      description TEXT,
      reproduction_steps TEXT,
      screenshot_path TEXT,
      resolved INTEGER DEFAULT 0,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS optimal_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id TEXT NOT NULL UNIQUE,
      archetype_id TEXT NOT NULL,
      step_count INTEGER NOT NULL,
      total_reward REAL NOT NULL,
      steps TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      episode_id INTEGER NOT NULL REFERENCES episodes(id)
    );

    CREATE TABLE IF NOT EXISTS q_table (
      state_hash TEXT NOT NULL,
      action_key TEXT NOT NULL,
      q_value REAL NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (state_hash, action_key)
    );

    CREATE TABLE IF NOT EXISTS session_metrics (
      episode_id INTEGER PRIMARY KEY REFERENCES episodes(id),
      avg_page_load_ms REAL,
      max_heap_mb REAL,
      max_dom_nodes INTEGER,
      total_console_errors INTEGER,
      total_network_failures INTEGER,
      unique_routes_visited INTEGER,
      actions_per_minute REAL,
      goal_completion_time_s REAL
    );

    CREATE TABLE IF NOT EXISTS route_coverage (
      route TEXT PRIMARY KEY,
      first_visited_at TEXT NOT NULL,
      visit_count INTEGER DEFAULT 1,
      last_visited_at TEXT NOT NULL,
      avg_load_time_ms REAL,
      error_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_transitions_episode ON transitions(episode_id);
    CREATE INDEX IF NOT EXISTS idx_transitions_route ON transitions(route);
    CREATE INDEX IF NOT EXISTS idx_transitions_state ON transitions(state_hash);
    CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity, resolved);
    CREATE INDEX IF NOT EXISTS idx_episodes_archetype ON episodes(archetype_id);
    CREATE INDEX IF NOT EXISTS idx_episodes_goal ON episodes(goal_id, goal_achieved);
  `)
}

// ── Episode Operations ───────────────────────────────────────────────────────

export function createEpisode(config: EpisodeConfig): number {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO episodes (started_at, archetype_id, goal_id, viewport_width, viewport_height, network_throttle, cpu_throttle, sub_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      new Date().toISOString(),
      config.archetypeId,
      config.goalId,
      config.viewportWidth,
      config.viewportHeight,
      config.networkThrottle,
      config.cpuThrottle,
      config.subAgent
    )
  return result.lastInsertRowid as number
}

export function completeEpisode(result: EpisodeResult): void {
  const db = getDb()
  db.prepare(
    `UPDATE episodes SET
      ended_at = ?, goal_achieved = ?, total_steps = ?,
      total_reward = ?, terminal_reason = ?
    WHERE id = ?`
  ).run(
    result.endedAt,
    result.goalAchieved ? 1 : 0,
    result.totalSteps,
    result.totalReward,
    result.terminalReason,
    result.episodeId
  )
}

export function getEpisodeCount(): number {
  const db = getDb()
  const row = db
    .prepare('SELECT COUNT(*) as count FROM episodes WHERE ended_at IS NOT NULL')
    .get() as { count: number }
  return row.count
}

// ── Transition Operations ────────────────────────────────────────────────────

const insertTransitionStmt = () =>
  getDb().prepare(
    `INSERT INTO transitions (
      episode_id, step_number, timestamp, state_hash, route, route_group,
      page_title, dom_node_count, heap_used_mb, action_type, action_selector,
      action_text, action_value, next_state_hash, next_route, reward,
      reward_breakdown, console_errors, network_failures, screenshot_path,
      action_duration_ms, page_load_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

export function recordTransition(t: Transition): void {
  insertTransitionStmt().run(
    t.episodeId,
    t.stepNumber,
    t.timestamp,
    t.stateHash,
    t.route,
    t.routeGroup,
    t.pageTitle,
    t.domNodeCount,
    t.heapUsedMB,
    t.actionType,
    t.actionSelector,
    t.actionText,
    t.actionValue,
    t.nextStateHash,
    t.nextRoute,
    t.reward,
    JSON.stringify(t.rewardBreakdown),
    JSON.stringify(t.consoleErrors),
    JSON.stringify(t.networkFailures),
    t.screenshotPath,
    t.actionDurationMs,
    t.pageLoadMs
  )
}

// ── Q-Table Operations ───────────────────────────────────────────────────────

export function getQValue(stateHash: string, actionKey: string): number {
  const db = getDb()
  const row = db
    .prepare('SELECT q_value FROM q_table WHERE state_hash = ? AND action_key = ?')
    .get(stateHash, actionKey) as { q_value: number } | undefined
  return row?.q_value ?? 0
}

export function getQValues(stateHash: string): QEntry[] {
  const db = getDb()
  return db.prepare('SELECT * FROM q_table WHERE state_hash = ?').all(stateHash) as QEntry[]
}

export function updateQValue(
  stateHash: string,
  actionKey: string,
  qValue: number,
  visitCount: number
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO q_table (state_hash, action_key, q_value, visit_count, last_updated)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(state_hash, action_key) DO UPDATE SET
       q_value = ?, visit_count = ?, last_updated = ?`
  ).run(
    stateHash,
    actionKey,
    qValue,
    visitCount,
    new Date().toISOString(),
    qValue,
    visitCount,
    new Date().toISOString()
  )
}

export function getMaxQValue(stateHash: string): number {
  const db = getDb()
  const row = db
    .prepare('SELECT MAX(q_value) as max_q FROM q_table WHERE state_hash = ?')
    .get(stateHash) as { max_q: number | null } | undefined
  return row?.max_q ?? 0
}

export function getVisitCount(stateHash: string, actionKey: string): number {
  const db = getDb()
  const row = db
    .prepare('SELECT visit_count FROM q_table WHERE state_hash = ? AND action_key = ?')
    .get(stateHash, actionKey) as { visit_count: number } | undefined
  return row?.visit_count ?? 0
}

// ── Anomaly Operations ───────────────────────────────────────────────────────

export function recordAnomaly(anomaly: Anomaly): number {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO anomalies (detected_at, episode_id, severity, category, route, description, reproduction_steps, screenshot_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      anomaly.detectedAt,
      anomaly.episodeId,
      anomaly.severity,
      anomaly.category,
      anomaly.route,
      anomaly.description,
      JSON.stringify(anomaly.reproductionSteps),
      anomaly.screenshotPath
    )
  return result.lastInsertRowid as number
}

export function getUnresolvedAnomalies(): Anomaly[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM anomalies WHERE resolved = 0 ORDER BY severity, detected_at DESC')
    .all() as Anomaly[]
}

export function getAnomalyCount(severity?: string): number {
  const db = getDb()
  if (severity) {
    const row = db
      .prepare('SELECT COUNT(*) as count FROM anomalies WHERE severity = ? AND resolved = 0')
      .get(severity) as { count: number }
    return row.count
  }
  const row = db.prepare('SELECT COUNT(*) as count FROM anomalies WHERE resolved = 0').get() as {
    count: number
  }
  return row.count
}

// ── Route Coverage ───────────────────────────────────────────────────────────

export function recordRouteVisit(route: string, loadTimeMs: number, hadError: boolean): void {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO route_coverage (route, first_visited_at, visit_count, last_visited_at, avg_load_time_ms, error_count)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(route) DO UPDATE SET
       visit_count = visit_count + 1,
       last_visited_at = ?,
       avg_load_time_ms = (avg_load_time_ms * visit_count + ?) / (visit_count + 1),
       error_count = error_count + ?`
  ).run(route, now, now, loadTimeMs, hadError ? 1 : 0, now, loadTimeMs, hadError ? 1 : 0)
}

export function getRouteCoverageCount(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM route_coverage').get() as { count: number }
  return row.count
}

export function isRouteDiscovered(route: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT 1 FROM route_coverage WHERE route = ?').get(route)
  return !!row
}

// ── Optimal Paths ────────────────────────────────────────────────────────────

export function getOptimalPath(goalId: string): { stepCount: number; steps: RLAction[] } | null {
  const db = getDb()
  const row = db
    .prepare('SELECT step_count, steps FROM optimal_paths WHERE goal_id = ?')
    .get(goalId) as { step_count: number; steps: string } | undefined
  if (!row) return null
  return { stepCount: row.step_count, steps: JSON.parse(row.steps) }
}

export function updateOptimalPath(
  goalId: string,
  archetypeId: string,
  stepCount: number,
  totalReward: number,
  steps: RLAction[],
  episodeId: number
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO optimal_paths (goal_id, archetype_id, step_count, total_reward, steps, discovered_at, episode_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(goal_id) DO UPDATE SET
       archetype_id = ?, step_count = ?, total_reward = ?, steps = ?, discovered_at = ?, episode_id = ?`
  ).run(
    goalId,
    archetypeId,
    stepCount,
    totalReward,
    JSON.stringify(steps),
    new Date().toISOString(),
    episodeId,
    archetypeId,
    stepCount,
    totalReward,
    JSON.stringify(steps),
    new Date().toISOString(),
    episodeId
  )
}

// ── Session Metrics ──────────────────────────────────────────────────────────

export function recordSessionMetrics(
  episodeId: number,
  metrics: {
    avgPageLoadMs: number
    maxHeapMb: number
    maxDomNodes: number
    totalConsoleErrors: number
    totalNetworkFailures: number
    uniqueRoutesVisited: number
    actionsPerMinute: number
    goalCompletionTimeS: number | null
  }
): void {
  const db = getDb()
  db.prepare(
    `INSERT OR REPLACE INTO session_metrics
     (episode_id, avg_page_load_ms, max_heap_mb, max_dom_nodes, total_console_errors,
      total_network_failures, unique_routes_visited, actions_per_minute, goal_completion_time_s)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    episodeId,
    metrics.avgPageLoadMs,
    metrics.maxHeapMb,
    metrics.maxDomNodes,
    metrics.totalConsoleErrors,
    metrics.totalNetworkFailures,
    metrics.uniqueRoutesVisited,
    metrics.actionsPerMinute,
    metrics.goalCompletionTimeS
  )
}

// ── Discovery ────────────────────────────────────────────────────────────────

export function recordDiscovery(
  episodeId: number,
  type: string,
  route: string | null,
  description: string,
  screenshotPath?: string
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO discoveries (discovered_at, episode_id, discovery_type, route, description, screenshot_path)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(new Date().toISOString(), episodeId, type, route, description, screenshotPath ?? null)
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getStats(): {
  totalEpisodes: number
  avgReward: number
  goalRate: number
  routesCovered: number
  anomaliesCritical: number
  anomaliesTotal: number
} {
  const db = getDb()
  const episodes = db
    .prepare(
      `SELECT COUNT(*) as total,
              AVG(total_reward) as avg_reward,
              SUM(CASE WHEN goal_achieved = 1 THEN 1 ELSE 0 END) * 100.0 / MAX(COUNT(*), 1) as goal_rate
       FROM episodes WHERE ended_at IS NOT NULL`
    )
    .get() as { total: number; avg_reward: number; goal_rate: number }

  return {
    totalEpisodes: episodes.total,
    avgReward: episodes.avg_reward ?? 0,
    goalRate: episodes.goal_rate ?? 0,
    routesCovered: getRouteCoverageCount(),
    anomaliesCritical: getAnomalyCount('critical'),
    anomaliesTotal: getAnomalyCount(),
  }
}
