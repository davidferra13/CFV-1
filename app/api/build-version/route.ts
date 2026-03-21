/**
 * GET /api/build-version
 *
 * Returns the current BUILD_ID so the service worker can detect
 * when a new deployment has landed and purge stale caches.
 * Force-dynamic + no-store ensures this is never cached.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let cachedBuildId: string | null = null

function getBuildId(): string {
  if (cachedBuildId) return cachedBuildId
  try {
    cachedBuildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
  } catch {
    cachedBuildId = 'unknown'
  }
  return cachedBuildId
}

export async function GET() {
  return NextResponse.json(
    { buildId: getBuildId(), timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
