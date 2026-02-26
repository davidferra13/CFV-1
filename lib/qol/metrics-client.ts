'use client'

import type { QolMetricKey } from '@/lib/qol/metrics'

type QolClientMetricInput = {
  metricKey: QolMetricKey
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export function trackQolMetric(input: QolClientMetricInput): void {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({
    metricKey: input.metricKey,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  })

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/qol/metrics', blob)
      return
    }

    void fetch('/api/qol/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    })
  } catch {
    // Best-effort metrics, no user-facing failure.
  }
}
