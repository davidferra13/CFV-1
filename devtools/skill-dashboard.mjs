#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  ensureDir,
  learningInboxRoot,
  loadSkillStats,
  nowStamp,
  parseArgs,
  readJson,
  relative,
  reportsRoot,
  writeJson,
  writeText,
} from './agent-skill-utils.mjs'

function runJson(args) {
  const output = execFileSync('node', args, { encoding: 'utf8' })
  return JSON.parse(output)
}

function latestJson(dirName) {
  const dir = path.join(reportsRoot, dirName)
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
  if (!files.length) return null
  return readJson(path.join(dir, files.at(-1)), null)
}

function openLearningCount() {
  if (!fs.existsSync(learningInboxRoot)) return 0
  return fs
    .readdirSync(learningInboxRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(learningInboxRoot, name), null))
    .filter((item) => item && item.status !== 'resolved').length
}

function buildDashboard() {
  const coverage = runJson(['devtools/skill-coverage-map.mjs', '--stdout'])
  const dependencies = runJson(['devtools/skill-dependency-graph.mjs', '--stdout'])
  const maturity = runJson(['devtools/skill-maturity-report.mjs', '--stdout'])
  const health = latestJson('skill-health')
  const stats = loadSkillStats()
  const repairQueue = latestJson('skill-repair-queue')
  const weakDomains = coverage.classes
    .filter((row) => row.status !== 'covered')
    .map((row) => ({ id: row.id, status: row.status, flags: row.flags }))
  const highestRisk = weakDomains[0] || null
  return {
    generated_at: new Date().toISOString(),
    coverage: {
      class_count: coverage.class_count,
      covered_count: coverage.covered_count,
      weak_count: coverage.weak_count,
      gap_count: coverage.gap_count,
      weak_domains: weakDomains,
      highest_risk_missing_owner: highestRisk,
    },
    dependencies: {
      edge_count: dependencies.edge_count,
      unknown_ref_count: dependencies.unknown_ref_count,
      orphan_count: dependencies.orphan_count,
      orphan_skills: dependencies.orphan_skills,
    },
    maturity: {
      skill_count: maturity.skill_count,
      counts: maturity.counts,
      implicit_default_count: maturity.implicit_default_count,
      invalid_count: maturity.invalid_count,
    },
    reliability: {
      tracked_skill_count: Object.keys(stats.skills || {}).length,
      session_count: (stats.sessions || []).length,
      top_failures: Object.entries(stats.skills || {})
        .map(([skill, row]) => ({
          skill,
          missed_count: row.missed_count || 0,
          failure_count: row.failure_count || 0,
          clean_success_count: row.clean_success_count || 0,
        }))
        .filter((row) => row.missed_count || row.failure_count)
        .sort((a, b) => b.failure_count - a.failure_count || b.missed_count - a.missed_count)
        .slice(0, 5),
    },
    repair_queue: repairQueue
      ? {
          repair_count: repairQueue.repair_count,
          high_count: repairQueue.entries?.filter((entry) => entry.priority === 'high').length || 0,
        }
      : null,
    health: health
      ? {
          unhealthy_count: health.unhealthy_count,
          overlap_count: health.overlaps?.length || 0,
          stale_generated_report_count: health.stale_generated_reports?.length || 0,
        }
      : null,
    learning: {
      open_count: openLearningCount(),
    },
  }
}

function toMarkdown(report) {
  const lines = [
    '# Agent Skill Dashboard',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Coverage',
    '',
    `- Classes: ${report.coverage.class_count}`,
    `- Covered: ${report.coverage.covered_count}`,
    `- Weak: ${report.coverage.weak_count}`,
    `- Gaps: ${report.coverage.gap_count}`,
    `- Highest risk missing owner: ${report.coverage.highest_risk_missing_owner?.id || 'none'}`,
    '',
    '## Dependencies',
    '',
    `- Edges: ${report.dependencies.edge_count}`,
    `- Unknown refs: ${report.dependencies.unknown_ref_count}`,
    `- Orphan skills: ${report.dependencies.orphan_count}`,
    '',
    '## Maturity',
    '',
    `- Proven: ${report.maturity.counts.proven || 0}`,
    `- Active: ${report.maturity.counts.active || 0}`,
    `- Draft: ${report.maturity.counts.draft || 0}`,
    `- Needs healing: ${report.maturity.counts['needs-healing'] || 0}`,
    `- Deprecated: ${report.maturity.counts.deprecated || 0}`,
    `- Implicit defaults: ${report.maturity.implicit_default_count}`,
    '',
    '## Reliability',
    '',
    `- Tracked skills: ${report.reliability.tracked_skill_count}`,
    `- Recorded sessions: ${report.reliability.session_count}`,
    `- Skills with failures: ${report.reliability.top_failures.length}`,
    '',
    '## Repair Queue',
    '',
    `- Open repairs: ${report.repair_queue?.repair_count ?? 0}`,
    `- High priority repairs: ${report.repair_queue?.high_count ?? 0}`,
    '',
    '## Health',
    '',
    `- Unhealthy skills: ${report.health?.unhealthy_count ?? 'unknown'}`,
    `- Overlaps: ${report.health?.overlap_count ?? 'unknown'}`,
    `- Stale generated reports: ${report.health?.stale_generated_report_count ?? 'unknown'}`,
    '',
    '## Learning',
    '',
    `- Open learning items: ${report.learning.open_count}`,
    '',
  ]
  return `${lines.join('\n')}\n`
}

const args = parseArgs()
const report = buildDashboard()

if (args.stdout || args.json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const jsonFile = path.join(reportsRoot, 'skill-dashboard', `${nowStamp()}-skill-dashboard.json`)
  const mdFile = path.join(reportsRoot, 'skill-dashboard', 'latest.md')
  ensureDir(path.dirname(jsonFile))
  writeJson(jsonFile, report)
  writeText(mdFile, toMarkdown(report))
  console.log(`Wrote dashboard JSON: ${relative(jsonFile)}`)
  console.log(`Wrote dashboard markdown: ${relative(mdFile)}`)
}
