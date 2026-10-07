/**
 * GET /api/build-version
 *
 * Returns the current BUILD_ID so the service worker can detect
 * when a new deployment has landed and purge stale caches.
 * Force-dynamic + no-store ensures this is never cached.
 *
 * Also returns `revision`: the full commit the served build was made from,
 * or null when that cannot be established. The capability proof gate needs
 * the full commit to tie a receipt to the build that is actually live.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveBuildRevision } from '@/lib/release/build-revision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let cachedBuildId: string | null = null
let cachedRevision: string | null | undefined

function getBuildId(): string {
  if (cachedBuildId) return cachedBuildId
  try {
    cachedBuildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
  } catch {
    cachedBuildId = 'unknown'
  }
  return cachedBuildId
}

function getRevision(): string | null {
  if (cachedRevision !== undefined) return cachedRevision
  cachedRevision = resolveBuildRevision(getBuildId(), process.cwd())
  return cachedRevision
}

export async function GET() {
  return NextResponse.json(
    { buildId: getBuildId(), revision: getRevision(), timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
