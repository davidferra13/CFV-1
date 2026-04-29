#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import {
  currentBranch,
  ensureDir,
  flightRecordsRoot,
  nowStamp,
  parseArgs,
  readJson,
  readStdin,
  relative,
  repoRoot,
  slugify,
  splitCsv,
  writeJson,
} from './agent-skill-utils.mjs'
import {
  createClaim,
  finishClaim,
  readClaim,
} from './agent-claim-utils.mjs'

function usage() {
  console.log(`Usage:
  node devtools/agent-flight-recorder.mjs start --prompt "..." [--primary skill] [--sidecars a,b]
  node devtools/agent-flight-recorder.mjs finish --record path --owned a,b [--used a,b] [--validations a,b] [--commit sha]

Records what Codex planned, touched, validated, and shipped for a task.`)
}

function gitOutput(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

function routePrompt(prompt) {
  const output = execFileSync('node', ['devtools/skill-router.mjs', '--prompt', prompt], {
    encoding: 'utf8',
  })
  return JSON.parse(output)
}

function collectTouchedFiles(owned) {
  const explicit = splitCsv(owned)
  if (explicit.length) return explicit
  const status = gitOutput(['status', '--porcelain=v1'], '')
  return status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, '/'))
    .filter(Boolean)
}

function start(args) {
  const prompt = String(args.prompt || args._.join(' ') || readStdin()).trim()
  if (!prompt) throw new Error('Missing --prompt for flight recorder start.')
  const routed = args.primary ? null : routePrompt(prompt)
  const primarySkill = String(args.primary || routed?.primary_skill || '').trim()
  const sidecarSkills = splitCsv(args.sidecars || routed?.sidecar_skills?.join(',') || '')
  const id = `${nowStamp()}-${slugify(prompt)}`
  const file = path.join(flightRecordsRoot, `${id}.json`)
  const claim =
    args.claim && args.claim !== true
      ? { claim_file: String(args.claim), claim: readClaim(String(args.claim)) }
      : args['create-claim'] || args.owned
        ? createClaim({
            prompt,
            owned: args.owned,
          })
        : null
  const record = {
    id,
    prompt,
    status: 'started',
    branch: currentBranch(),
    branch_start_commit: claim?.claim?.branch_start_commit || gitOutput(['rev-parse', '--short', 'HEAD'], null),
    claim_file: claim?.claim_file || null,
    started_at: new Date().toISOString(),
    finished_at: null,
    selected_primary_skill: primarySkill || null,
    selected_sidecar_skills: sidecarSkills,
    router_decision: routed,
    used_skills: [...new Set([primarySkill, ...sidecarSkills].filter(Boolean))],
    files_touched: [],
    commands_run: splitCsv(args.commands),
    validations_run: [],
    commit_hash: null,
    pushed: null,
    missed_skills: [],
    skill_garden_triggered: [primarySkill, ...sidecarSkills].includes('skill-garden'),
    heal_skill_triggered: [primarySkill, ...sidecarSkills].includes('heal-skill'),
    notes: args.notes || null,
  }
  ensureDir(flightRecordsRoot)
  writeJson(file, record)
  return { record_file: relative(file), record }
}

function finish(args) {
  if (!args.record || args.record === true) throw new Error('Missing --record for finish.')
  const file = path.resolve(String(args.record))
  const record = readJson(file, null)
  if (!record) throw new Error(`Could not read flight record: ${args.record}`)
  const usedSkills = splitCsv(args.used)
  const validations = splitCsv(args.validations || args.validation)
  const commands = splitCsv(args.commands)
  const touchedFiles = collectTouchedFiles(args.owned)
  const commit = args.commit && args.commit !== true ? String(args.commit) : gitOutput(['rev-parse', '--short', 'HEAD'], null)
  const branchFinish = currentBranch()
  const pushed = commit
    ? gitOutput(['merge-base', '--is-ancestor', commit, `origin/${branchFinish}`], null) === ''
    : null
  const claimFile = args.claim || record.claim_file || null
  let claim = null
  if (claimFile) {
    claim = finishClaim({
      claimFile,
      owned: args.owned,
      commit,
      pushed,
    })
  }

  const next = {
    ...record,
    status: 'finished',
    finished_at: new Date().toISOString(),
    branch_finish: branchFinish,
    branch_changed: Boolean(record.branch && record.branch !== branchFinish),
    claim_file: claim?.claim_file || record.claim_file || null,
    used_skills: [...new Set([...(record.used_skills || []), ...usedSkills].filter(Boolean))],
    files_touched: [...new Set([...(record.files_touched || []), ...touchedFiles].filter(Boolean))],
    commands_run: [...new Set([...(record.commands_run || []), ...commands].filter(Boolean))],
    validations_run: [...new Set([...(record.validations_run || []), ...validations].filter(Boolean))],
    commit_hash: commit || record.commit_hash || null,
    pushed,
    skill_garden_triggered:
      Boolean(record.skill_garden_triggered) || usedSkills.includes('skill-garden'),
    heal_skill_triggered: Boolean(record.heal_skill_triggered) || usedSkills.includes('heal-skill'),
    notes: args.notes || record.notes || null,
  }
  writeJson(file, next)
  return { record_file: relative(file), record: next }
}

try {
  const args = parseArgs()
  const command = args._.shift()
  if (args.help || !command) {
    usage()
    process.exit(command ? 0 : 1)
  }
  const result = command === 'start' ? start(args) : command === 'finish' ? finish(args) : null
  if (!result) throw new Error(`Unknown flight recorder command: ${command}`)
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
