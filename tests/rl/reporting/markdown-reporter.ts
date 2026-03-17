// Markdown Reporter - Generates human-readable reports from RL data.
// Outputs to docs/rl-reports/ for easy review.

import fs from 'fs'
import path from 'path'
import * as db from '../database'

const REPORT_DIR = path.resolve(__dirname, '../../../docs/rl-reports')

/**
 * Generate a comprehensive Markdown report from current RL data.
 */
export function generateMarkdownReport(): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true })

  const stats = db.getStats()
  const anomalies = db.getUnresolvedAnomalies()
  const database = db.getDb()

  // ── Summary Report ───────────────────────────────────────────────────

  const criticalAnomalies = anomalies.filter((a: any) => a.severity === 'critical')
  const warningAnomalies = anomalies.filter((a: any) => a.severity === 'warning')

  // Top routes by error count
  const errorRoutes = database
    .prepare(
      `SELECT route, error_count, visit_count, avg_load_time_ms
     FROM route_coverage
     WHERE error_count > 0
     ORDER BY error_count DESC
     LIMIT 10`
    )
    .all() as {
    route: string
    error_count: number
    visit_count: number
    avg_load_time_ms: number
  }[]

  // Slowest routes
  const slowRoutes = database
    .prepare(
      `SELECT route, avg_load_time_ms, visit_count
     FROM route_coverage
     WHERE avg_load_time_ms > 3000
     ORDER BY avg_load_time_ms DESC
     LIMIT 10`
    )
    .all() as { route: string; avg_load_time_ms: number; visit_count: number }[]

  // Goal completion rates by archetype
  const goalRates = database
    .prepare(
      `SELECT archetype_id,
            COUNT(*) as total,
            SUM(CASE WHEN goal_achieved = 1 THEN 1 ELSE 0 END) as achieved,
            AVG(total_steps) as avg_steps,
            AVG(total_reward) as avg_reward
     FROM episodes
     WHERE ended_at IS NOT NULL
     GROUP BY archetype_id
     ORDER BY archetype_id`
    )
    .all() as {
    archetype_id: string
    total: number
    achieved: number
    avg_steps: number
    avg_reward: number
  }[]

  // Terminal reason distribution
  const terminalReasons = database
    .prepare(
      `SELECT terminal_reason, COUNT(*) as count
     FROM episodes
     WHERE ended_at IS NOT NULL
     GROUP BY terminal_reason
     ORDER BY count DESC`
    )
    .all() as { terminal_reason: string; count: number }[]

  // Build summary
  const summary = `# ChefFlow RL Agent - Summary Report

> Generated: ${new Date().toISOString()}
> Target: https://beta.cheflowhq.com/

## Overview

| Metric | Value |
|--------|-------|
| Total Episodes | ${stats.totalEpisodes} |
| Average Reward | ${stats.avgReward.toFixed(1)} |
| Goal Completion Rate | ${stats.goalRate.toFixed(1)}% |
| Routes Covered | ${stats.routesCovered} |
| Unresolved Anomalies | ${stats.anomaliesTotal} |
| Critical Anomalies | ${stats.anomaliesCritical} |

## Terminal Reasons

| Reason | Count | % |
|--------|-------|---|
${terminalReasons.map((r) => `| ${r.terminal_reason || 'unknown'} | ${r.count} | ${((r.count / Math.max(stats.totalEpisodes, 1)) * 100).toFixed(1)}% |`).join('\n')}

## Archetype Performance

| Archetype | Episodes | Goal Rate | Avg Steps | Avg Reward |
|-----------|----------|-----------|-----------|------------|
${goalRates.map((g) => `| ${g.archetype_id} | ${g.total} | ${((g.achieved / Math.max(g.total, 1)) * 100).toFixed(0)}% | ${g.avg_steps?.toFixed(0) ?? 'N/A'} | ${g.avg_reward?.toFixed(1) ?? 'N/A'} |`).join('\n')}

## Critical Anomalies (${criticalAnomalies.length})

${
  criticalAnomalies.length === 0
    ? 'None found.'
    : criticalAnomalies
        .map(
          (a: any) => `### ${a.category}: ${a.route}
- **Detected:** ${a.detected_at}
- **Description:** ${a.description}
- **Episode:** ${a.episode_id}
${a.screenshot_path ? `- **Screenshot:** ${a.screenshot_path}` : ''}
${a.reproduction_steps ? `- **Steps:** ${formatSteps(a.reproduction_steps)}` : ''}
`
        )
        .join('\n')
}

## Warning Anomalies (${warningAnomalies.length})

${
  warningAnomalies.length === 0
    ? 'None found.'
    : warningAnomalies
        .slice(0, 20)
        .map((a: any) => `- **${a.category}** on \`${a.route}\`: ${a.description}`)
        .join('\n')
}
${warningAnomalies.length > 20 ? `\n... and ${warningAnomalies.length - 20} more` : ''}

## Routes with Errors

${
  errorRoutes.length === 0
    ? 'No routes with errors.'
    : `| Route | Errors | Visits | Avg Load |
|-------|--------|--------|----------|
${errorRoutes.map((r) => `| \`${r.route}\` | ${r.error_count} | ${r.visit_count} | ${r.avg_load_time_ms?.toFixed(0) ?? 'N/A'}ms |`).join('\n')}`
}

## Slow Routes (>3s avg)

${
  slowRoutes.length === 0
    ? 'No routes averaging over 3 seconds.'
    : `| Route | Avg Load | Visits |
|-------|----------|--------|
${slowRoutes.map((r) => `| \`${r.route}\` | ${r.avg_load_time_ms?.toFixed(0) ?? 'N/A'}ms | ${r.visit_count} |`).join('\n')}`
}
`

  fs.writeFileSync(path.join(REPORT_DIR, 'summary-latest.md'), summary)

  // Daily report
  const dateStr = new Date().toISOString().split('T')[0]
  fs.writeFileSync(path.join(REPORT_DIR, `report-${dateStr}.md`), summary)

  // Anomalies file
  const anomalyReport = `# Unresolved Anomalies

> Updated: ${new Date().toISOString()}
> Total: ${anomalies.length} (${criticalAnomalies.length} critical, ${warningAnomalies.length} warnings)

${anomalies
  .map(
    (a: any) => `## [${a.severity.toUpperCase()}] ${a.category} - ${a.route}

- **ID:** ${a.id}
- **Detected:** ${a.detected_at}
- **Episode:** ${a.episode_id}
- **Description:** ${a.description}
${a.reproduction_steps ? `- **Reproduction:** ${formatSteps(a.reproduction_steps)}` : ''}
${a.screenshot_path ? `- **Screenshot:** ${a.screenshot_path}` : ''}

---
`
  )
  .join('\n')}
`
  fs.writeFileSync(path.join(REPORT_DIR, 'anomalies-unresolved.md'), anomalyReport)

  console.log(`[report] Generated summary to docs/rl-reports/summary-latest.md`)
  console.log(`[report] Generated anomalies to docs/rl-reports/anomalies-unresolved.md`)
}

function formatSteps(stepsJson: string): string {
  try {
    const steps = JSON.parse(stepsJson)
    if (!Array.isArray(steps)) return stepsJson
    return steps
      .map((s: any, i: number) => `${i + 1}. ${s.type} "${s.text || s.selector || ''}"`)
      .join(', ')
  } catch {
    return stepsJson
  }
}
