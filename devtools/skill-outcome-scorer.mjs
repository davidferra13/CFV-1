#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
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
  splitCsv,
  updateSkillMaturity,
  writeJson,
  writeSkillStats,
} from './agent-skill-utils.mjs'

function usage() {
  console.log(`Usage:
  node devtools/skill-outcome-scorer.mjs --record path [--owned a,b] [--require-pushed] [--update-stats] [--auto-maturity] [--stdout]

Scores a finished flight record and can update skill reliability stats plus maturity.`)
}

function gitStatus(paths) {
  if (!paths.length) return []
  const output = execFileSync('git', ['status', '--porcelain=v1', '--', ...paths], {
    encoding: 'utf8',
  })
  return output.split(/\r?\n/).filter(Boolean)
}

function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

function scoreRecord(record, ownedPaths, requirePushed) {
  const selected = unique([record.selected_primary_skill, ...(record.selected_sidecar_skills || [])])
  const used = unique(record.used_skills || [])
  const missed = record.missed_skills || []
  const validations = record.validations_run || []
  const dirtyOwned = gitStatus(ownedPaths)
  const checks = [
    {
      id: 'routed',
      ok: Boolean(record.selected_primary_skill),
      points: 15,
      detail: record.selected_primary_skill || 'missing primary skill',
    },
    {
      id: 'selected_skill_used',
      ok: !record.selected_primary_skill || used.includes(record.selected_primary_skill),
      points: 15,
      detail: `primary=${record.selected_primary_skill || 'none'}`,
    },
    {
      id: 'no_missed_skills',
      ok: missed.length === 0,
      points: 25,
      detail: missed.map((miss) => miss.skill).join(', ') || 'none',
    },
    {
      id: 'validations_present',
      ok: validations.length > 0,
      points: 15,
      detail: validations.join(', ') || 'none',
    },
    {
      id: 'commit_present',
      ok: Boolean(record.commit_hash),
      points: 10,
      detail: record.commit_hash || 'none',
    },
    {
      id: 'pushed',
      ok: requirePushed ? record.pushed === true : record.pushed !== false,
      points: 10,
      detail: String(record.pushed),
    },
    {
      id: 'owned_clean',
      ok: dirtyOwned.length === 0,
      points: 10,
      detail: dirtyOwned.join('; ') || 'clean',
    },
  ]
  const score = checks.reduce((sum, check) => sum + (check.ok ? check.points : 0), 0)
  return {
    ok: checks.every((check) => check.ok),
    score,
    max_score: checks.reduce((sum, check) => sum + check.points, 0),
    selected_skills: selected,
    used_skills: used,
    missed_skills: missed,
    validations,
    dirty_owned: dirtyOwned,
    checks,
  }
}

function blankSkillStats() {
  return {
    selected_count: 0,
    used_count: 0,
    missed_count: 0,
    failure_count: 0,
    repair_count: 0,
    clean_success_count: 0,
    last_selected_at: null,
    last_used_at: null,
    last_missed_at: null,
    last_failure_at: null,
    last_success_at: null,
    last_record: null,
  }
}

function updateStats(record, outcome) {
  const stats = loadSkillStats()
  const now = new Date().toISOString()
  for (const skill of outcome.selected_skills) {
    const row = { ...blankSkillStats(), ...(stats.skills[skill] || {}) }
    row.selected_count += 1
    row.last_selected_at = now
    row.last_record = record.id
    stats.skills[skill] = row
  }
  for (const skill of outcome.used_skills) {
    const row = { ...blankSkillStats(), ...(stats.skills[skill] || {}) }
    row.used_count += 1
    row.last_used_at = now
    row.last_record = record.id
    if (outcome.ok) {
      row.clean_success_count += 1
      row.last_success_at = now
    }
    stats.skills[skill] = row
  }
  for (const miss of outcome.missed_skills) {
    const row = { ...blankSkillStats(), ...(stats.skills[miss.skill] || {}) }
    row.missed_count += 1
    row.failure_count += 1
    row.last_missed_at = now
    row.last_failure_at = now
    row.last_record = record.id
    stats.skills[miss.skill] = row
  }
  if (!outcome.ok) {
    for (const skill of outcome.used_skills) {
      const row = { ...blankSkillStats(), ...(stats.skills[skill] || {}) }
      row.failure_count += 1
      row.last_failure_at = now
      row.last_record = record.id
      stats.skills[skill] = row
    }
  }
  stats.sessions = [
    ...(stats.sessions || []),
    {
      record_id: record.id,
      prompt: record.prompt,
      score: outcome.score,
      ok: outcome.ok,
      skills: outcome.used_skills,
      created_at: now,
    },
  ].slice(-100)
  writeSkillStats(stats)
  return stats
}

function applyMaturity(stats, outcome) {
  const maturity = loadSkillMaturity()
  const updates = []
  for (const miss of outcome.missed_skills) {
    const updated = updateSkillMaturity(miss.skill, {
      state: 'needs-healing',
      reason: `Missed in flight record ${outcome.record_id}: ${miss.reason}`,
    })
    updates.push({ skill: miss.skill, state: updated.state, reason: updated.reason })
  }
  for (const skill of outcome.used_skills) {
    const row = stats.skills[skill]
    if (!row) continue
    const current = skillMaturityState(skill, maturity)
    if (current === 'needs-healing' && outcome.ok) {
      const updated = updateSkillMaturity(skill, {
        state: 'active',
        reason: `Recovered with clean flight record ${outcome.record_id}`,
      })
      updates.push({ skill, state: updated.state, reason: updated.reason })
      continue
    }
    if (current === 'active' && row.clean_success_count >= 5 && row.failure_count === 0) {
      const updated = updateSkillMaturity(skill, {
        state: 'proven',
        reason: `Promoted after ${row.clean_success_count} clean recorded uses.`,
      })
      updates.push({ skill, state: updated.state, reason: updated.reason })
    }
  }
  return updates
}

try {
  const args = parseArgs()
  if (args.help) {
    usage()
    process.exit(0)
  }
  if (!args.record || args.record === true) throw new Error('Missing --record.')
  const recordFile = path.resolve(String(args.record))
  const record = readJson(recordFile, null)
  if (!record) throw new Error(`Could not read flight record: ${args.record}`)
  const owned = splitCsv(args.owned || (record.files_touched || []).join(','))
  const baseOutcome = scoreRecord(record, owned, Boolean(args['require-pushed'] || args.pushed))
  const outcome = {
    ...baseOutcome,
    record_id: record.id,
    record_file: relative(recordFile),
    generated_at: new Date().toISOString(),
  }
  const stats = args['update-stats'] ? updateStats(record, outcome) : null
  const maturity_updates = args['auto-maturity'] && stats ? applyMaturity(stats, outcome) : []
  const report = {
    ...outcome,
    stats_updated: Boolean(stats),
    maturity_updates,
  }
  if (args.stdout || args['no-report']) {
    console.log(JSON.stringify({ report_file: null, outcome: report }, null, 2))
  } else {
    const outFile = path.join(reportsRoot, 'skill-outcomes', `${nowStamp()}-${record.id}.json`)
    writeJson(outFile, report)
    console.log(JSON.stringify({ report_file: relative(outFile), outcome: report }, null, 2))
  }
  process.exit(outcome.ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
