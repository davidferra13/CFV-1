'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useSSE } from '@/lib/realtime/sse-client'

/**
 * Subscribes to openclaw:alerts SSE channel and surfaces price anomalies
 * and growth regressions as toast notifications. Admin-only.
 * Renders nothing visible; just listens and toasts.
 */
export function OpenClawLiveAlerts() {
  const handleMessage = useCallback((msg: { event: string; data: any; timestamp: number }) => {
    if (msg.event === 'price_anomaly') {
      const d = msg.data
      const direction = d.changePct > 0 ? 'up' : 'down'
      const arrow = direction === 'up' ? '\u2191' : '\u2193'
      const pct = Math.abs(d.changePct).toFixed(1)
      const oldPrice = (d.oldPriceCents / 100).toFixed(2)
      const newPrice = (d.newPriceCents / 100).toFixed(2)

      toast.warning(`Price ${d.anomalyType || 'anomaly'}: ${d.ingredient}`, {
        description: `$${oldPrice} ${arrow} $${newPrice} (${pct}% ${direction})${d.source ? ` at ${d.source}` : ''}`,
        duration: 8000,
      })
    }

    if (msg.event === 'growth_regression') {
      const d = msg.data
      const tables =
        d.regressions
          ?.slice(0, 3)
          .map((r: any) => r.table || r.name)
          .join(', ') || `${d.totalTablesRegressed} tables`

      toast.error('Data regression detected', {
        description: `${d.totalRowsLost} rows lost across ${tables}`,
        duration: 12000,
      })
    }

    if (msg.event === 'sync_stale') {
      const d = msg.data
      toast.error('Price sync pipeline stale', {
        description: d.reason || 'No successful sync in 24+ hours. Check prod server.',
        duration: 15000,
      })
    }
  }, [])

  useSSE('openclaw:alerts', { onMessage: handleMessage })

  // No visible UI; toasts are rendered by the global Sonner provider
  return null
}
