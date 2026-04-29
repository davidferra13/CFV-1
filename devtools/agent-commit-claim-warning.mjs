#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { claimRootFromArgs, listClaims, normalizeOwnedPaths } from './agent-claim-utils.mjs'
import { currentBranch, parseArgs, splitCsv } from './agent-skill-utils.mjs'

function gitStagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'buffer' })
      .toString('utf8')
      .split('\0')
      .map((line) => line.trim().replace(/\\/g, '/'))
      .filter(Boolean)
  } catch {
    return []
  }
}

function claimMode(args = {}) {
  const raw = String(args.mode || process.env.CHEFFLOW_AGENT_CLAIM_MODE || 'warn').toLowerCase()
  return ['warn', 'block', 'off'].includes(raw) ? raw : 'warn'
}

function buildWarning({ stagedFiles, claimsRoot, branch, mode, maxAgeHours }) {
  const staged = normalizeOwnedPaths(stagedFiles.join(','))
  if (!staged.length || mode === 'off') {
    return {
      ok: true,
      mode,
      branch,
      staged_files: staged,
      covering_claims: [],
      coverage_percent: 100,
      stale_claims: [],
      warnings: [],
    }
  }

  const stagedSet = new Set(staged)
  const activeClaims = listClaims(claimsRoot)
    .map((entry) => ({
      ...entry,
      owned_paths: normalizeOwnedPaths((entry.claim.owned_paths || []).join(',')),
    }))
    .filter((entry) => entry.claim.status === 'active')
    .filter((entry) => !entry.claim.branch || entry.claim.branch === branch)

  const coveringClaims = activeClaims
    .map((entry) => ({
      claim_file: entry.file.replace(/\\/g, '/'),
      claim_id: entry.claim.id,
      agent: entry.claim.agent,
      owned_paths: entry.owned_paths.filter((ownedPath) => stagedSet.has(ownedPath)),
    }))
    .filter((entry) => entry.owned_paths.length)

  const staleClaims = activeClaims
    .map((entry) => {
      const createdAt = Date.parse(entry.claim.created_at || '')
      if (!Number.isFinite(createdAt)) return null
      const ageHours = (Date.now() - createdAt) / 36e5
      if (ageHours <= maxAgeHours) return null
      return {
        claim_file: entry.file.replace(/\\/g, '/'),
        claim_id: entry.claim.id,
        agent: entry.claim.agent,
        age_hours: Math.round(ageHours * 10) / 10,
      }
    })
    .filter(Boolean)

  const covered = new Set(coveringClaims.flatMap((entry) => entry.owned_paths))
  const uncovered = staged.filter((file) => !covered.has(file))
  const warnings = []

  if (!activeClaims.length) {
    warnings.push('No active agent claim found for staged files.')
  } else if (!coveringClaims.length) {
    warnings.push('Active agent claims exist, but none cover the staged files.')
  } else if (uncovered.length) {
    warnings.push(
      `Some staged files are not covered by an active agent claim: ${uncovered.join(', ')}`
    )
  }
  if (staleClaims.length) {
    warnings.push(
      `Active agent claims are stale: ${staleClaims.map((claim) => claim.claim_id).join(', ')}`
    )
  }

  return {
    ok: mode !== 'block' || warnings.length === 0,
    mode,
    branch,
    staged_files: staged,
    covering_claims: coveringClaims,
    coverage_percent: staged.length ? Math.round((covered.size / staged.length) * 100) : 100,
    stale_claims: staleClaims,
    warnings,
  }
}

function printHuman(result) {
  if (!result.staged_files.length || !result.warnings.length) return
  console.log('')
  console.log(result.mode === 'block' ? '  AGENT CLAIM BLOCK:' : '  AGENT CLAIM WARNING:')
  for (const warning of result.warnings) console.log(`  ${warning}`)
  console.log(`  Claim coverage: ${result.coverage_percent}%`)
  console.log('  Start claimed work with:')
  console.log('    node devtools/agent-start.mjs --prompt "..." --owned "path,other-path"')
  console.log('')
}

const args = parseArgs()
const mode = claimMode(args)
const claimsRoot = claimRootFromArgs(args)
const stagedFiles = args.staged && args.staged !== true ? splitCsv(args.staged) : gitStagedFiles()
const branch = args.branch && args.branch !== true ? String(args.branch) : currentBranch()
const maxAgeHours = Number(
  args['max-age-hours'] || process.env.CHEFFLOW_AGENT_CLAIM_MAX_AGE_HOURS || 12
)
const result = buildWarning({ stagedFiles, claimsRoot, branch, mode, maxAgeHours })

if (args.json || args.stdout) {
  console.log(JSON.stringify(result, null, 2))
} else {
  printHuman(result)
}

process.exit(result.ok ? 0 : 1)
