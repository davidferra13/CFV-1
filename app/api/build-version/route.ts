/**
 * GET /api/build-version
 *
 * Returns the current BUILD_ID so the service worker can detect
 * when a new deployment has landed and purge stale caches.
 * Force-dynamic + no-store ensures this is never cached.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BuildIdentity = {
  buildId: string
  source: 'env' | 'build-file' | 'git' | 'runtime'
}

let cachedBuildIdentity: BuildIdentity | null = null

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function readBuildIdFile(distDir: string): string | null {
  try {
    return firstNonEmpty(readFileSync(join(process.cwd(), distDir, 'BUILD_ID'), 'utf-8'))
  } catch {
    return null
  }
}

function readGitBuildId(): string | null {
  try {
    return firstNonEmpty(execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString())
  } catch {
    return null
  }
}

function getBuildIdentity(): BuildIdentity {
  if (cachedBuildIdentity) return cachedBuildIdentity

  const envBuildId = firstNonEmpty(process.env.NEXT_BUILD_ID, process.env.BUILD_ID)
  if (envBuildId) {
    cachedBuildIdentity = { buildId: envBuildId, source: 'env' }
    return cachedBuildIdentity
  }

  const configuredDistDir = firstNonEmpty(process.env.NEXT_DIST_DIR) ?? '.next'
  const buildFileId = readBuildIdFile(configuredDistDir) ?? readBuildIdFile('.next')
  if (buildFileId) {
    cachedBuildIdentity = { buildId: buildFileId, source: 'build-file' }
    return cachedBuildIdentity
  }

  const gitBuildId = readGitBuildId()
  if (gitBuildId) {
    cachedBuildIdentity = { buildId: gitBuildId, source: 'git' }
    return cachedBuildIdentity
  }

  cachedBuildIdentity = { buildId: process.env.NODE_ENV ?? 'development', source: 'runtime' }
  return cachedBuildIdentity
}

export async function GET() {
  const build = getBuildIdentity()

  return NextResponse.json(
    { buildId: build.buildId, source: build.source, timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
