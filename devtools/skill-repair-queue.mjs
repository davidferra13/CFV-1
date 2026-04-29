#!/usr/bin/env node
import path from 'node:path'
import {
  loadSkillMaturity,
  loadSkillStats,
  nowStamp,
  parseArgs,
  readJson,
  relative,
  reportsRoot,
  skillMaturityState,
  writeJson,
  writeText,
} from './agent-skill-utils.mjs'

function buildQueue() {
  const stats = loadSkillStats()
  const maturity = loadSkillMaturity()
  const entries = Object.entries(stats.skills || [])
    .map(([skill, row]) => {
      const state = skillMaturityState(skill, maturity)
      const priority =
        state === 'needs-healing'
          ? 'high'
          : row.missed_count > 0 || row.failure_count > 0
            ? 'medium'
            : 'low'
      const reasons = []
      if (state === 'needs-healing') reasons.push('maturity state needs-healing')
      if (row.missed_count > 0) reasons.push(`${row.missed_count} missed routing event(s)`)
      if (row.failure_count > 0) reasons.push(`${row.failure_count} failed outcome event(s)`)
      return {
        skill,
        state,
        priority,
        reasons,
        stats: row,
        suggested_patch_target: `.claude/skills/${skill}/SKILL.md`,
      }
    })
    .filter((entry) => entry.reasons.length)
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[a.priority] - rank[b.priority] || a.skill.localeCompare(b.skill)
    })
  return {
    generated_at: new Date().toISOString(),
    repair_count: entries.length,
    entries,
  }
}

function toMarkdown(queue) {
  const lines = ['# Skill Repair Queue', '', `Generated: ${queue.generated_at}`, '']
  if (!queue.entries.length) {
    lines.push('No skill repairs are currently queued.', '')
    return `${lines.join('\n')}\n`
  }
  for (const entry of queue.entries) {
    lines.push(`## ${entry.priority.toUpperCase()} ${entry.skill}`)
    lines.push('')
    lines.push(`- State: ${entry.state}`)
    lines.push(`- Target: ${entry.suggested_patch_target}`)
    lines.push(`- Last record: ${entry.stats.last_record || 'none'}`)
    lines.push(`- Reasons: ${entry.reasons.join('; ')}`)
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

const args = parseArgs()
const queue = buildQueue()

if (args.stdout || args.json) {
  console.log(JSON.stringify(queue, null, 2))
} else {
  const jsonFile = path.join(reportsRoot, 'skill-repair-queue', `${nowStamp()}-skill-repair-queue.json`)
  const mdFile = path.join(reportsRoot, 'skill-repair-queue', 'latest.md')
  writeJson(jsonFile, queue)
  writeText(mdFile, toMarkdown(queue))
  console.log(`Wrote repair queue JSON: ${relative(jsonFile)}`)
  console.log(`Wrote repair queue markdown: ${relative(mdFile)}`)
}
