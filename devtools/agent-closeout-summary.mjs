#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  claimRootFromArgs,
  detectClaimConflicts,
  readClaim,
  verifyClaimBranch,
} from './agent-claim-utils.mjs'
import { parseArgs, readJson, splitCsv } from './agent-skill-utils.mjs'

function gitOutput(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

function gitStatus(paths) {
  const statusArgs = ['status', '--porcelain=v1']
  if (paths.length) statusArgs.push('--', ...paths)
  return gitOutput(statusArgs).split(/\r?\n/).filter(Boolean)
}

const args = parseArgs()
const owned = splitCsv(args.owned)
const commit =
  args.commit && args.commit !== true
    ? String(args.commit)
    : gitOutput(['rev-parse', '--short', 'HEAD'], null)
const branch = gitOutput(['branch', '--show-current'], null)
const upstream = gitOutput(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], null)
const record = args.record && args.record !== true ? readJson(String(args.record), null) : null
const claimFile =
  args.claim && args.claim !== true ? String(args.claim) : record?.claim_file || null
const claim = claimFile ? readClaim(claimFile) : null
const pushed =
  commit && upstream
    ? gitOutput(['merge-base', '--is-ancestor', commit, upstream], 'not-contained') === ''
    : false
const ownedDirty = gitStatus(owned)
const allDirty = gitStatus([])
const claimBranch = claim ? verifyClaimBranch(claim) : null
const claimConflicts = detectClaimConflicts({
  claimFile,
  claimsRoot: claimRootFromArgs(args),
  owned: owned.join(','),
})
const validations = splitCsv(args.validations || args.validation)

const result = {
  ok: ownedDirty.length === 0 && claimConflicts.length === 0 && (!claimBranch || claimBranch.ok),
  branch,
  upstream,
  commit,
  pushed,
  owned_files: owned,
  owned_files_clean: ownedDirty.length === 0,
  owned_dirty: ownedDirty,
  unrelated_dirty_count: Math.max(0, allDirty.length - ownedDirty.length),
  claim_file: claimFile,
  claim_branch: claimBranch,
  claim_conflicts: claimConflicts,
  validations,
  branch_drift: record?.branch
    ? { started: record.branch, finished: branch, changed: record.branch !== branch }
    : null,
}

console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
