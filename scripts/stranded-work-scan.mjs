#!/usr/bin/env node
// Stranded work scan: finds ChefFlow app/UI work that exists somewhere on this machine but is not on origin/main,
// so it can never be seen live and silently disappears when production moves. Read-only.
//
// Usage: node scripts/stranded-work-scan.mjs [--hours 6] [--json]
// Exit code 1 when any uncommitted or branch-only change under app/, components/ or lib/ is older than --hours.
//
// Background: docs/autonomous-delivery-contract.md, "One Source of Truth, One Deployer".
import { execFileSync } from 'node:child_process'
import { statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const hoursIdx = args.indexOf('--hours')
const staleHours = hoursIdx >= 0 ? Number(args[hoursIdx + 1]) : 6
const asJson = args.includes('--json')
const UI = /^(app|components|lib)\//

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (cwd, ...a) => {
  try {
    return execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).trim()
  } catch {
    return ''
  }
}

git(repo, 'fetch', '-q', 'origin', 'main')
const mainSha = git(repo, 'rev-parse', '--short', 'origin/main')
const now = Date.now()
const ageHours = (ms) => Math.round(((now - ms) / 36e5) * 10) / 10

// 1. Uncommitted UI changes in every worktree, minus those already identical to main.
const worktrees = git(repo, 'worktree', 'list', '--porcelain')
  .split(/\r?\n/)
  .filter((l) => l.startsWith('worktree '))
  .map((l) => l.slice(9))

const uncommitted = []
for (const wt of worktrees) {
  if (!existsSync(wt)) continue
  const branch = git(wt, 'branch', '--show-current') || '(detached)'
  for (const line of git(wt, 'status', '--porcelain', '--untracked-files=all').split(/\r?\n/)) {
    if (!line) continue
    const path = line.slice(3).replace(/^"|"$/g, '')
    if (!UI.test(path)) continue
    const full = join(wt, path)
    if (!existsSync(full) || statSync(full).isDirectory()) continue
    const onMain = git(repo, 'rev-parse', `origin/main:${path}`)
    if (onMain && onMain === git(wt, 'hash-object', '--', full)) continue // same bytes already on main
    uncommitted.push({ worktree: wt, branch, path, status: line.slice(0, 2).trim(), ageHours: ageHours(statSync(full).mtimeMs) })
  }
}

// 2. Local branches holding UI commits that main does not have (patch-equivalent commits excluded).
const branchOnly = []
for (const b of git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split(/\r?\n/)) {
  if (!b || b === 'main') continue
  const unique = git(repo, 'log', '--cherry-pick', '--right-only', '--no-merges', '--format=%h %ct', `origin/main...${b}`)
  if (!unique) continue
  const shas = unique.split(/\r?\n/).map((l) => l.split(' '))
  const files = new Set()
  for (const [sha] of shas) {
    for (const f of git(repo, 'show', '--name-only', '--format=', sha).split(/\r?\n/)) if (UI.test(f)) files.add(f)
  }
  if (!files.size) continue
  const newest = Math.max(...shas.map(([, t]) => Number(t) * 1000))
  branchOnly.push({ branch: b, commits: shas.length, uiFiles: [...files].sort(), ageHours: ageHours(newest) })
}

const stale = [...uncommitted, ...branchOnly].filter((x) => x.ageHours >= staleHours)
const report = { main: mainSha, staleHours, worktrees: worktrees.length, uncommitted, branchOnly, staleCount: stale.length }

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`origin/main ${mainSha} | ${worktrees.length} worktrees scanned | stale threshold ${staleHours}h`)
  const byWt = new Map()
  for (const u of uncommitted) (byWt.get(u.worktree) ?? byWt.set(u.worktree, []).get(u.worktree)).push(u)
  console.log(`\nUncommitted app/components/lib changes not on main: ${uncommitted.length}`)
  for (const [wt, list] of byWt) {
    console.log(`  ${wt} [${list[0].branch}]`)
    for (const u of list.sort((a, b) => b.ageHours - a.ageHours)) console.log(`    ${u.status.padEnd(2)} ${String(u.ageHours).padStart(6)}h  ${u.path}`)
  }
  console.log(`\nBranches with app/components/lib commits not on main: ${branchOnly.length}`)
  for (const b of branchOnly.sort((a, b) => a.ageHours - b.ageHours)) {
    console.log(`  ${b.branch}: ${b.commits} commit(s), newest ${b.ageHours}h ago, ${b.uiFiles.length} file(s): ${b.uiFiles.slice(0, 6).join(', ')}${b.uiFiles.length > 6 ? ', ...' : ''}`)
  }
  console.log(`\nStale (>= ${staleHours}h): ${stale.length}${stale.length ? '  -> commit to main or hand off explicitly' : ''}`)
}
process.exitCode = stale.length ? 1 : 0
