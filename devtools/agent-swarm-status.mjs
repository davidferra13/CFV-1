#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { claimRootFromArgs, listClaims, normalizeOwnedPaths } from './agent-claim-utils.mjs'
import { currentBranch, parseArgs } from './agent-skill-utils.mjs'

function gitOutput(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

function gitOutputRaw(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' })
  } catch {
    return fallback
  }
}

function gitLines(args) {
  return gitOutput(args)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function statusEntries() {
  return gitOutputRaw(['status', '--porcelain=v1'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3).replace(/\\/g, '/'),
      raw: line,
    }))
}

function buildStatus({ claimsRoot, maxAgeHours = 12 }) {
  const branch = currentBranch()
  const claims = listClaims(claimsRoot).map((entry) => ({
    claim_file: entry.file.replace(/\\/g, '/'),
    ...entry.claim,
    owned_paths: normalizeOwnedPaths((entry.claim.owned_paths || []).join(',')),
  }))
  const activeClaims = claims.filter((claim) => claim.status === 'active')
  const staleClaims = activeClaims.filter((claim) => {
    const createdAt = Date.parse(claim.created_at || '')
    return Number.isFinite(createdAt) && (Date.now() - createdAt) / 36e5 > maxAgeHours
  })
  const ownership = new Map()
  for (const claim of activeClaims) {
    for (const ownedPath of claim.owned_paths || []) {
      if (!ownership.has(ownedPath)) ownership.set(ownedPath, [])
      ownership.get(ownedPath).push(claim)
    }
  }
  const overlappingClaims = [...ownership.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([filePath, owners]) => ({
      path: filePath,
      claims: owners.map((claim) => claim.id),
    }))
  const claimedDirty = []
  const unclaimedDirty = []
  for (const entry of statusEntries()) {
    const owners = ownership.get(entry.path) || []
    const row = { ...entry, claims: owners.map((claim) => claim.id) }
    if (owners.length) claimedDirty.push(row)
    else unclaimedDirty.push(row)
  }
  const upstream = gitOutput(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], '')
  const unpushedCommits = upstream ? gitLines(['log', '--oneline', `${upstream}..HEAD`]) : []

  return {
    ok: overlappingClaims.length === 0,
    branch,
    upstream: upstream || null,
    active_claim_count: activeClaims.length,
    stale_claim_count: staleClaims.length,
    active_claims: activeClaims,
    stale_claims: staleClaims,
    overlapping_claims: overlappingClaims,
    dirty: {
      claimed: claimedDirty,
      unclaimed: unclaimedDirty,
      claimed_count: claimedDirty.length,
      unclaimed_count: unclaimedDirty.length,
    },
    unpushed_commits: unpushedCommits,
  }
}

function printHuman(status) {
  console.log(`Branch: ${status.branch}`)
  console.log(`Active claims: ${status.active_claim_count}`)
  console.log(`Stale claims: ${status.stale_claim_count}`)
  console.log(`Overlaps: ${status.overlapping_claims.length}`)
  console.log(`Dirty claimed: ${status.dirty.claimed_count}`)
  console.log(`Dirty unclaimed: ${status.dirty.unclaimed_count}`)
  console.log(`Unpushed commits: ${status.unpushed_commits.length}`)
}

const args = parseArgs()
const result = buildStatus({
  claimsRoot: claimRootFromArgs(args),
  maxAgeHours: Number(args['max-age-hours'] || 12),
})

if (args.json || args.stdout) console.log(JSON.stringify(result, null, 2))
else printHuman(result)

process.exit(result.ok ? 0 : 1)
