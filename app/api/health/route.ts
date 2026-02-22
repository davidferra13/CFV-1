/**
 * GET /api/health
 *
 * Public health check endpoint — no authentication required.
 * Returns 200 when the application is running and can reach the database.
 * Returns 503 if any critical dependency is unavailable.
 *
 * Designed for use with:
 *   - Vercel uptime checks
 *   - UptimeRobot / Better Uptime / Freshping (free tier)
 *   - Internal load balancer health probes
 *
 * Response schema:
 * {
 *   "status": "ok" | "degraded" | "error",
 *   "timestamp": "2026-02-20T12:00:00.000Z",
 *   "version": "chefflow-build",
 *   "checks": {
 *     "database": "ok" | "error",
 *     "env": "ok" | "missing"
 *   },
 *   "latencyMs": {
 *     "database": 12
 *   }
 * }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCircuitBreakerHealth } from '@/lib/resilience/circuit-breaker'

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

export const runtime = 'nodejs'
// No caching — health checks must always be fresh
export const dynamic = 'force-dynamic'

// HEAD — lightweight connectivity check for offline detection (no DB query)
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? 'health-check'
  const startTime = Date.now()

  const checks: Record<string, string> = {}
  const latencyMs: Record<string, number> = {}
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok'

  // --- 1. Environment variable check ---
  const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v])
  if (missingVars.length > 0) {
    checks.env = `missing: ${missingVars.join(', ')}`
    overallStatus = 'error'
  } else {
    checks.env = 'ok'
  }

  // --- 2. Database connectivity check ---
  try {
    const dbStart = Date.now()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Lightweight query — just fetch one row from a small, always-present table
    const { error } = await supabase.from('chefs').select('id').limit(1).maybeSingle()

    latencyMs.database = Date.now() - dbStart

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "no rows" — perfectly fine, DB is reachable
      checks.database = `error: ${error.message}`
      overallStatus = 'error'
    } else {
      checks.database = 'ok'
    }
  } catch (err) {
    latencyMs.database = Date.now() - startTime
    checks.database = `unreachable: ${err instanceof Error ? err.message : 'unknown'}`
    overallStatus = 'error'
  }

  // --- 3. Upstash Redis check (optional — only if configured) ---
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redisStart = Date.now()
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      })
      latencyMs.redis = Date.now() - redisStart
      checks.redis = response.ok ? 'ok' : `degraded: HTTP ${response.status}`
      if (!response.ok && overallStatus === 'ok') overallStatus = 'degraded'
    } catch {
      latencyMs.redis = Date.now() - startTime
      checks.redis = 'degraded: unreachable'
      if (overallStatus === 'ok') overallStatus = 'degraded'
    }
  }

  // --- 4. Circuit breaker health snapshot ---
  const circuitBreakers = getCircuitBreakerHealth()
  const openCircuits = Object.entries(circuitBreakers)
    .filter(([, v]) => v.state === 'OPEN')
    .map(([name]) => name)
  if (openCircuits.length > 0) {
    checks.circuit_breakers = `open: ${openCircuits.join(', ')}`
    if (overallStatus === 'ok') overallStatus = 'degraded'
  } else if (Object.keys(circuitBreakers).length > 0) {
    checks.circuit_breakers = 'ok'
  }

  const httpStatus = overallStatus === 'error' ? 503 : 200

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'chefflow-build',
      requestId,
      checks,
      latencyMs,
      circuit_breakers: circuitBreakers,
      uptimeMs: process.uptime ? Math.round(process.uptime() * 1000) : undefined,
    },
    {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store',
        'X-Request-ID': requestId,
      },
    }
  )
}
