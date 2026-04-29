#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultClaimsRoot, claimRootFromArgs } from './agent-claim-utils.mjs'
import { parseArgs, readJson, relative, writeJson } from './agent-skill-utils.mjs'

const DEFAULT_MAX_AGE_HOURS = 24
const OPEN_STATUSES = new Set(['active', 'stale'])

function usage() {
  console.log(`Usage:
  node devtools/agent-claim-cleanup.mjs [--write] [--max-age-hours 24] [--claims-dir dir]

Scans agent claim files, emits JSON, and never deletes claim files.
Dry-run is the default. Use --write to mark stale or orphaned claims.`)
}

function parseMaxAgeHours(value) {
  if (value === undefined || value === null || value === true || value === '') {
    return DEFAULT_MAX_AGE_HOURS
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('--max-age-hours must be a non-negative number.')
  }
  return parsed
}

function toDate(value) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function claimAgeHours(claim, now) {
  const createdAt = toDate(claim?.created_at)
  if (!createdAt) return null
  return Math.max(0, (now.getTime() - createdAt.getTime()) / 36e5)
}

function normalizeBranchName(value) {
  return String(value || '').trim()
}

export function listGitBranches() {
  try {
    const output = execFileSync(
      'git',
      ['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes'],
      { encoding: 'utf8' }
    )
    return new Set(
      output
        .split(/\r?\n/)
        .map((line) => normalizeBranchName(line).replace(/^origin\//, ''))
        .filter((line) => line && line !== 'origin')
    )
  } catch {
    return new Set()
  }
}

function listClaimFiles(claimsDir) {
  if (!fs.existsSync(claimsDir)) return []
  return fs
    .readdirSync(claimsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(claimsDir, entry.name))
    .sort()
}

function classifyClaim({ claim, existingBranches, maxAgeHours, now }) {
  const status = String(claim?.status || '')
  const branch = normalizeBranchName(claim?.branch)
  const open = OPEN_STATUSES.has(status)
  const ageHours = claimAgeHours(claim, now)

  if (open && branch && !existingBranches.has(branch)) {
    return {
      nextStatus: 'orphaned',
      reason: 'branch_missing',
      ageHours,
    }
  }

  if (status === 'active' && ageHours !== null && ageHours > maxAgeHours) {
    return {
      nextStatus: 'stale',
      reason: 'max_age_exceeded',
      ageHours,
    }
  }

  return {
    nextStatus: status,
    reason: null,
    ageHours,
  }
}

function updateClaimForStatus(claim, nextStatus, now) {
  const isoNow = now.toISOString()
  const next = {
    ...claim,
    status: nextStatus,
    updated_at: isoNow,
  }
  if (nextStatus === 'stale') {
    next.stale_at = claim.stale_at || isoNow
  }
  if (nextStatus === 'orphaned') {
    next.orphaned_at = claim.orphaned_at || isoNow
  }
  return next
}

export function cleanupAgentClaims({
  claimsDir = defaultClaimsRoot,
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  write = false,
  now = new Date(),
  existingBranches = listGitBranches(),
} = {}) {
  const resolvedClaimsDir = path.resolve(String(claimsDir))
  const branchSet =
    existingBranches instanceof Set ? existingBranches : new Set(existingBranches || [])
  const files = listClaimFiles(resolvedClaimsDir)
  const updates = []
  const skipped = []

  for (const file of files) {
    const claim = readJson(file, null)
    if (!claim || typeof claim !== 'object') {
      skipped.push({
        claim_file: relative(file),
        reason: 'invalid_json',
      })
      continue
    }

    const classification = classifyClaim({
      claim,
      existingBranches: branchSet,
      maxAgeHours,
      now,
    })

    if (!classification.reason || classification.nextStatus === claim.status) {
      continue
    }

    const update = {
      claim_file: relative(file),
      claim_id: claim.id || path.basename(file, '.json'),
      branch: claim.branch || null,
      previous_status: claim.status || null,
      next_status: classification.nextStatus,
      reason: classification.reason,
      age_hours:
        classification.ageHours === null ? null : Number(classification.ageHours.toFixed(3)),
      written: Boolean(write),
    }
    updates.push(update)

    if (write) {
      writeJson(file, updateClaimForStatus(claim, classification.nextStatus, now))
    }
  }

  return {
    ok: true,
    dry_run: !write,
    claims_dir: relative(resolvedClaimsDir),
    max_age_hours: maxAgeHours,
    scanned: files.length,
    updated: write ? updates.length : 0,
    would_update: write ? 0 : updates.length,
    skipped,
    updates,
    summary: {
      stale: updates.filter((update) => update.next_status === 'stale').length,
      orphaned: updates.filter((update) => update.next_status === 'orphaned').length,
      invalid: skipped.length,
    },
  }
}

export function main() {
  const args = parseArgs()
  if (args.help) {
    usage()
    return 0
  }

  const result = cleanupAgentClaims({
    claimsDir: claimRootFromArgs(args),
    maxAgeHours: parseMaxAgeHours(args['max-age-hours']),
    write: Boolean(args.write),
  })
  console.log(JSON.stringify(result, null, 2))
  return 0
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  try {
    process.exit(main())
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    usage()
    process.exit(1)
  }
}
