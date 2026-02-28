// GET /api/ai/monitor
// Returns the cross-monitoring supervisor state.
// Used by admin dashboard and diagnostics.
// Gated behind CRON_SECRET to prevent exposing internal recovery actions.

import { NextResponse } from 'next/server'
import { getSystemHealth, getRecoveryLog } from '@/lib/ai/cross-monitor'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError
  const health = getSystemHealth()
  const recentActions = getRecoveryLog().slice(0, 20) // Last 20 actions

  return NextResponse.json(
    {
      ...health,
      recentActions: recentActions.map((a) => ({
        level: a.level,
        action: a.action,
        target: a.target,
        timestamp: a.timestamp.toISOString(),
        success: a.success,
        detail: a.detail,
      })),
    },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
