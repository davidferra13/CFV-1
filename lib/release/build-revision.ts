// Resolves the full commit a running build was made from.
//
// next.config.js stamps BUILD_ID with `git rev-parse --short HEAD`. The
// capability proof gate (scripts/verify-capability-claims.mjs) compares the
// live build against a full commit, so the short id alone can never satisfy it.
// This expands the built short id through git. It never reads the checkout's
// current HEAD: a checkout can move after a build, and the build is what is
// actually being served.
//
// Fails closed. If the build id is not a commit, or git cannot expand it, the
// answer is null and the gate keeps refusing.
//
// NOT a server action file - no 'use server'.

import { execFileSync } from 'node:child_process'

const ABBREVIATED_SHA = /^[0-9a-f]{7,40}$/
const FULL_SHA = /^[0-9a-f]{40}$/

export type RevisionExpander = (buildId: string, cwd: string) => string

function expandWithGit(buildId: string, cwd: string): string {
  return execFileSync('git', ['rev-parse', '--verify', '--quiet', `${buildId}^{commit}`], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 5_000,
    windowsHide: true,
  })
}

export function resolveBuildRevision(
  buildId: string | null | undefined,
  cwd: string,
  expand: RevisionExpander = expandWithGit
): string | null {
  const id = String(buildId ?? '')
    .trim()
    .toLowerCase()
  if (!ABBREVIATED_SHA.test(id)) return null
  if (FULL_SHA.test(id)) return id
  try {
    const full = String(expand(id, cwd)).trim().toLowerCase()
    return FULL_SHA.test(full) && full.startsWith(id) ? full : null
  } catch {
    return null
  }
}
