#!/usr/bin/env node
import path from 'node:path'
import {
  loadSkillMaturity,
  loadSkills,
  nowStamp,
  parseArgs,
  projectSkillRoot,
  relative,
  reportsRoot,
  skillMaturityState,
  writeJson,
} from './agent-skill-utils.mjs'

const validStates = new Set(['draft', 'active', 'proven', 'needs-healing', 'deprecated'])

function buildReport() {
  const manifest = loadSkillMaturity()
  const skills = loadSkills(projectSkillRoot)
  const known = new Set(skills.map((skill) => skill.name))
  const rows = skills.map((skill) => {
    const configured = manifest.skills?.[skill.name] || null
    const state = skillMaturityState(skill.name, manifest)
    const flags = []
    if (!validStates.has(state)) flags.push('invalid-state')
    if (!configured) flags.push('implicit-default')
    return {
      name: skill.name,
      file: relative(skill.file),
      state,
      configured: Boolean(configured),
      reason: configured?.reason || null,
      updated_at: configured?.updated_at || null,
      flags,
    }
  })
  const unknownConfigured = Object.keys(manifest.skills || {})
    .filter((name) => !known.has(name))
    .sort()
  return {
    generated_at: new Date().toISOString(),
    default_state: manifest.default_state || 'active',
    skill_count: rows.length,
    counts: Object.fromEntries(
      [...validStates].map((state) => [state, rows.filter((row) => row.state === state).length]),
    ),
    invalid_count: rows.filter((row) => row.flags.includes('invalid-state')).length,
    implicit_default_count: rows.filter((row) => row.flags.includes('implicit-default')).length,
    unknown_configured_skills: unknownConfigured,
    skills: rows.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

function printSummary(report) {
  console.log(`Skill maturity rows: ${report.skill_count}`)
  console.log(`Proven: ${report.counts.proven || 0}`)
  console.log(`Active: ${report.counts.active || 0}`)
  console.log(`Draft: ${report.counts.draft || 0}`)
  console.log(`Needs healing: ${report.counts['needs-healing'] || 0}`)
  console.log(`Deprecated: ${report.counts.deprecated || 0}`)
  console.log(`Implicit defaults: ${report.implicit_default_count}`)
  console.log(`Invalid states: ${report.invalid_count}`)
}

const args = parseArgs()
const report = buildReport()

if (args.stdout || args.json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const outFile = path.join(reportsRoot, 'skill-maturity', `${nowStamp()}-skill-maturity.json`)
  writeJson(outFile, report)
  printSummary(report)
  console.log(`Wrote report: ${outFile.replace(/\\/g, '/')}`)
}

process.exit(report.invalid_count ? 1 : 0)
