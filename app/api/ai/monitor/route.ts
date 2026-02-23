// GET /api/ai/monitor
// Returns the cross-monitoring supervisor state.
// Used by admin dashboard and diagnostics.
// No auth required — monitoring metadata is non-sensitive.

import { NextResponse } from 'next/server'
import { getSystemHealth, getRecoveryLog } from '@/lib/ai/cross-monitor'

export async function GET() {
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
