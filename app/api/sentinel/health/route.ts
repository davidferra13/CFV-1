import { NextResponse } from 'next/server'
import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

const startTime = new Date().toISOString()

let cachedBuildId: string | null = null

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

function readBuildId(): string {
  if (cachedBuildId) return cachedBuildId

  cachedBuildId =
    firstNonEmpty(process.env.NEXT_BUILD_ID, process.env.BUILD_ID) ??
    readBuildIdFile(firstNonEmpty(process.env.NEXT_DIST_DIR) ?? '.next') ??
    readBuildIdFile('.next')

  if (cachedBuildId) return cachedBuildId

  try {
    cachedBuildId = firstNonEmpty(execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString())
  } catch {
    cachedBuildId = null
  }

  cachedBuildId = cachedBuildId ?? (process.env.NODE_ENV ?? 'development')
  return cachedBuildId
}

export async function GET() {
  return NextResponse.json({
    buildId: readBuildId(),
    ok: true,
    upSince: startTime,
    timestamp: new Date().toISOString(),
  })
}
