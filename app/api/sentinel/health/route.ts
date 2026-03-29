import { NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const startTime = new Date().toISOString()

export async function GET() {
  let buildId = 'unknown'
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID')
    if (existsSync(buildIdPath)) {
      buildId = readFileSync(buildIdPath, 'utf-8').trim()
    }
  } catch {
    // BUILD_ID not available in dev mode
  }

  return NextResponse.json({
    ok: true,
    buildId,
    upSince: startTime,
    timestamp: new Date().toISOString(),
  })
}
