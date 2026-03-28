import { NextRequest, NextResponse } from 'next/server'
import {
  buildPublicHealthSnapshot,
  getPublicHealthResponseHeaders,
  getPublicHealthResponseStatus,
} from '@/lib/health/public-health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const

function isStrict(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('strict') === '1'
}

export async function GET(request: NextRequest) {
  const snapshot = await buildPublicHealthSnapshot({
    includeBackgroundJobs: true,
    requiredEnvVars: REQUIRED_ENV_VARS,
  })

  return NextResponse.json(snapshot.body, {
    status: getPublicHealthResponseStatus(isStrict(request), snapshot.status),
    headers: getPublicHealthResponseHeaders(snapshot.requestId, snapshot.status, 'readiness'),
  })
}

export async function HEAD(request: NextRequest) {
  const snapshot = await buildPublicHealthSnapshot({
    includeBackgroundJobs: true,
    requiredEnvVars: REQUIRED_ENV_VARS,
  })

  return new NextResponse(null, {
    status: getPublicHealthResponseStatus(isStrict(request), snapshot.status),
    headers: getPublicHealthResponseHeaders(snapshot.requestId, snapshot.status, 'readiness'),
  })
}
