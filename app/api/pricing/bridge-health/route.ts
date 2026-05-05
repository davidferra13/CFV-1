import { NextResponse } from 'next/server'
import { getCircuitState } from '@/lib/pricing/pi-bridge'

/**
 * GET /api/pricing/bridge-health
 * Returns Pi Bridge circuit breaker state for the health indicator.
 * No auth required (no sensitive data, just operational status).
 */
export async function GET() {
  const state = getCircuitState()
  return NextResponse.json({
    status: state.state, // 'closed' | 'open' | 'half_open'
    failures: state.failures,
    lastFailure: state.lastFailure || null,
    lastSuccess: state.lastSuccess || null,
  })
}
