#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  parseArgs,
  readJson,
  relative,
  reportsRoot,
} from './agent-skill-utils.mjs'
import {
  claimRootFromArgs,
  detectClaimConflicts,
  readClaim,
  verifyClaimBranch,
} from './agent-claim-utils.mjs'

const args = parseArgs()
const bannedEmDash = '\u2014'

function normalizePath(input) {
  return String(input || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
}

function collectOwnedPaths() {
  const fromOwned = String(args.owned || '')
    .split(',')
    .map(normalizePath)
    .filter(Boolean)
  const positional = args._
    .map(normalizePath)
    .filter(Boolean)
  return [...new Set([...fromOwned, ...positional])]
}

function runGitStatus(paths) {
  const output = execFileSync('git', ['status', '--porcelain=v1', '--', ...paths], {
    encoding: 'utf8',
  })
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3),
      raw: line,
    }))
}

function gitOutput(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function currentBranch() {
  return gitOutput(['branch', '--show-current'])
}

function commitContainsOwnedPaths(commit, ownedPaths) {
  const files = new Set(
    gitOutput(['diff-tree', '--no-commit-id', '--name-only', '-r', commit])
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean),
  )
  return ownedPaths.filter((ownedPath) => !files.has(normalizePath(ownedPath)))
}

function originContainsCommit(commit) {
  const branch = args.branch || gitOutput(['branch', '--show-current'])
  const remoteRef = args.remote || `origin/${branch}`
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit, remoteRef], {
      stdio: 'ignore',
    })
    return { ok: true, remoteRef }
  } catch {
    return { ok: false, remoteRef }
  }
}

function isSkillPath(file) {
  return file.replace(/\\/g, '/').startsWith('.claude/skills/')
}

function hasValidatorEvidence() {
  return Boolean(
    args['skill-validator'] ||
      args.validator ||
      args['validator-evidence'] ||
      args['skill-validator-evidence'],
  )
}

function hasCloseoutReportEvidence() {
  if (args['closeout-report'] && args['closeout-report'] !== true) {
    return fs.existsSync(path.resolve(String(args['closeout-report'])))
  }
  if (args['closeout-report'] === true || args.closeout === true) {
    const dir = path.join(reportsRoot, 'skill-closeouts')
    return fs.existsSync(dir) && fs.readdirSync(dir).some((name) => name.endsWith('.json'))
  }
  if (args.closeout && args.closeout !== true) {
    return fs.existsSync(path.resolve(String(args.closeout)))
  }
  return false
}

function listFilesForScan(ownedPath) {
  const absolute = path.resolve(ownedPath)
  if (!fs.existsSync(absolute)) return []
  const stat = fs.statSync(absolute)
  if (stat.isFile()) return [absolute]
  if (!stat.isDirectory()) return []
  const results = []
  const stack = [absolute]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== '.git' && entry.name !== 'node_modules') stack.push(next)
        continue
      }
      if (entry.isFile()) results.push(next)
    }
  }
  return results
}

function scanEmDashes(ownedPaths) {
  const offenders = []
  const files = [...new Set(ownedPaths.flatMap(listFilesForScan))]
  for (const file of files) {
    const buffer = fs.readFileSync(file)
    if (buffer.includes(0)) continue
    const text = buffer.toString('utf8')
    if (text.includes(bannedEmDash)) offenders.push(relative(file))
  }
  return offenders
}

const ownedPaths = collectOwnedPaths()
const failures = []
const warnings = []
const claimsRoot = claimRootFromArgs(args)
const record = args.record && args.record !== true ? readJson(path.resolve(String(args.record)), null) : null
const claimFile =
  args.claim && args.claim !== true
    ? String(args.claim)
    : record?.claim_file || null

if (args.record && args.record !== true && !record) {
  failures.push(`Could not read flight record: ${args.record}`)
}

if (record?.branch && record.branch !== currentBranch()) {
  failures.push(
    `Branch changed during task: started on ${record.branch}, now on ${currentBranch()}`,
  )
}

if (claimFile) {
  const claim = readClaim(claimFile)
  if (!claim) {
    failures.push(`Could not read agent claim: ${claimFile}`)
  } else {
    const branch = verifyClaimBranch(claim)
    if (!branch.ok) {
      failures.push(
        `Agent claim branch mismatch: started on ${branch.expected}, now on ${branch.actual}`,
      )
    }
  }
}

if (!ownedPaths.length) {
  failures.push('No owned paths supplied. Use --owned path,other-path or positional paths.')
}

if (ownedPaths.length) {
  const conflicts = detectClaimConflicts({
    claimFile,
    claimsRoot,
    owned: ownedPaths.join(','),
  })
  if (conflicts.length) {
    failures.push(
      `Active agent claim overlap detected: ${conflicts
        .map((conflict) => `${conflict.claim_file} owns ${conflict.overlap.join(',')}`)
        .join('; ')}`,
    )
  }
}

let statusEntries = []
if (ownedPaths.length) {
  try {
    statusEntries = runGitStatus(ownedPaths)
  } catch (error) {
    failures.push(`git status failed: ${error.message}`)
  }
}

if (statusEntries.length) {
  failures.push(
    `Uncommitted owned changes detected: ${statusEntries.map((entry) => entry.raw).join('; ')}`,
  )
}

const changedSkillFiles = [...new Set(
  [...ownedPaths, ...statusEntries.map((entry) => entry.path)]
    .map(normalizePath)
    .filter(isSkillPath),
)]
if (changedSkillFiles.length && !hasValidatorEvidence()) {
  failures.push(
    `Changed skill files need validator evidence: ${changedSkillFiles.join(', ')}`,
  )
}

if (ownedPaths.length) {
  const emDashFiles = scanEmDashes(ownedPaths)
  if (emDashFiles.length) {
    failures.push(`Em dash found in owned files: ${emDashFiles.join(', ')}`)
  }
}

if (args['skill-task'] && !hasCloseoutReportEvidence()) {
  failures.push(
    'Skill task is missing closeout report evidence. Pass --closeout-report <path> after writing one.',
  )
}

if (args.commit && args.commit !== true) {
  const commit = String(args.commit)
  try {
    const missingFromCommit = commitContainsOwnedPaths(commit, ownedPaths)
    if (missingFromCommit.length) {
      failures.push(
        `Commit ${commit} does not contain owned paths: ${missingFromCommit.join(', ')}`,
      )
    }
    if (args['require-pushed'] || args.pushed) {
      const pushed = originContainsCommit(commit)
      if (!pushed.ok) {
        failures.push(`Commit ${commit} is not contained in ${pushed.remoteRef}`)
      }
    }
  } catch (error) {
    failures.push(`Commit verification failed: ${error.message}`)
  }
}

if (!statusEntries.length && ownedPaths.length) {
  warnings.push('No uncommitted owned changes detected.')
}

const result = {
  ok: failures.length === 0,
  owned_paths: ownedPaths,
  commit: args.commit && args.commit !== true ? String(args.commit) : null,
  failures,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
process.exit(failures.length ? 1 : 0)
