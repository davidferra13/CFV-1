import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  currentBranch,
  ensureDir,
  nowStamp,
  readJson,
  relative,
  repoRoot,
  slugify,
  splitCsv,
  writeJson,
} from './agent-skill-utils.mjs'

export const defaultClaimsRoot = path.join(repoRoot, 'system', 'agent-claims')

function gitOutput(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

function normalizePath(input) {
  return String(input || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
}

export function currentCommit() {
  return gitOutput(['rev-parse', '--short', 'HEAD'], null)
}

export function normalizeOwnedPaths(input) {
  return [...new Set(splitCsv(input).map(normalizePath).filter(Boolean))]
}

export function claimRootFromArgs(args = {}) {
  return path.resolve(String(args['claims-dir'] || args.claimsDir || defaultClaimsRoot))
}

export function readClaim(file) {
  return readJson(path.resolve(String(file)), null)
}

export function listClaims(claimsRoot = defaultClaimsRoot) {
  if (!fs.existsSync(claimsRoot)) return []
  return fs
    .readdirSync(claimsRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(claimsRoot, name))
    .map((file) => ({ file, claim: readJson(file, null) }))
    .filter((entry) => entry.claim && typeof entry.claim === 'object')
}

export function writeClaim(claimsRoot, claim) {
  ensureDir(claimsRoot)
  const file = path.join(claimsRoot, `${claim.id}.json`)
  writeJson(file, claim)
  return file
}

export function createClaim({
  prompt,
  owned = '',
  claimsRoot = defaultClaimsRoot,
  agent = process.env.CODEX_AGENT_ID || process.env.USERNAME || process.env.USER || 'codex',
} = {}) {
  const branch = currentBranch()
  const id = `${nowStamp()}-${slugify(`${branch || 'detached'}-${prompt || 'task'}`)}`
  const claim = {
    id,
    status: 'active',
    agent,
    prompt: String(prompt || '').trim() || null,
    branch,
    branch_start_commit: currentCommit(),
    branch_finish: null,
    branch_finish_commit: null,
    owned_paths: normalizeOwnedPaths(owned),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    finished_at: null,
    commit_hash: null,
    pushed: null,
  }
  const file = writeClaim(claimsRoot, claim)
  return { claim_file: relative(file), claim }
}

export function finishClaim({
  claimFile,
  claimsRoot = defaultClaimsRoot,
  owned = '',
  commit = null,
  pushed = null,
} = {}) {
  if (!claimFile) throw new Error('Missing claim file.')
  const file = path.isAbsolute(String(claimFile))
    ? String(claimFile)
    : path.resolve(String(claimFile))
  const existing = readJson(file, null)
  if (!existing) throw new Error(`Could not read claim: ${claimFile}`)
  const ownedPaths = normalizeOwnedPaths(owned)
  const next = {
    ...existing,
    status: 'finished',
    branch_finish: currentBranch(),
    branch_finish_commit: currentCommit(),
    owned_paths: ownedPaths.length ? ownedPaths : existing.owned_paths || [],
    updated_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    commit_hash: commit || existing.commit_hash || null,
    pushed: pushed ?? existing.pushed ?? null,
  }
  writeJson(file, next)
  return { claim_file: relative(file), claim: next, claims_root: relative(claimsRoot) }
}

export function detectClaimConflicts({
  claimFile = null,
  claimsRoot = defaultClaimsRoot,
  owned = '',
} = {}) {
  const ownedPaths = new Set(normalizeOwnedPaths(owned))
  const currentClaimPath = claimFile ? path.resolve(String(claimFile)) : null
  const conflicts = []
  if (!ownedPaths.size) return conflicts

  for (const entry of listClaims(claimsRoot)) {
    if (currentClaimPath && path.resolve(entry.file) === currentClaimPath) continue
    if (entry.claim.status !== 'active') continue
    const overlap = (entry.claim.owned_paths || []).filter((item) => ownedPaths.has(normalizePath(item)))
    if (!overlap.length) continue
    conflicts.push({
      claim_file: relative(entry.file),
      claim_id: entry.claim.id,
      branch: entry.claim.branch,
      agent: entry.claim.agent,
      overlap,
    })
  }
  return conflicts
}

export function verifyClaimBranch(claim) {
  if (!claim) return { ok: true, expected: null, actual: currentBranch() }
  const actual = currentBranch()
  const expected = claim.branch || null
  return {
    ok: !expected || expected === actual,
    expected,
    actual,
  }
}
