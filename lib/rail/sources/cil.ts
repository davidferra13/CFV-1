import type { RailItem, RailTier } from '@/lib/rail/types'

const URGENCY_TO_TIER: Record<number, RailTier> = {
  5: 'critical',
  4: 'action',
  3: 'awareness',
  2: 'awareness',
  1: 'opportunity',
}

const URGENCY_TO_SCORE: Record<number, number> = {
  5: 100,
  4: 80,
  3: 60,
  2: 40,
  1: 20,
}

export async function getCILRailItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { getProactiveSignals } = await import('@/lib/cil/api')
    const signals = await getProactiveSignals(tenantId)
    const now = new Date()

    return signals
      .filter((s) => s.confidence >= 0.3)
      .map((signal) => {
        const href =
          signal.actionType === 'navigate' && signal.actionPayload?.href
            ? String(signal.actionPayload.href)
            : '/dashboard/intelligence'

        return {
          id: `cil-${signal.id}`,
          tenantId,
          source: 'cil',
          tier: URGENCY_TO_TIER[signal.urgency] ?? 'awareness',
          state: 'surfaced' as const,
          score: URGENCY_TO_SCORE[signal.urgency] ?? 40,
          title: signal.title,
          subtitle: signal.detail,
          actionUrl: href,
          createdAt: now,
          surfacedAt: now,
          ttlMinutes: 1440,
          metadata: {
            cilSignalId: signal.id,
            domain: signal.domain,
            signalSource: signal.source,
            confidence: signal.confidence,
            urgency: signal.urgency,
          },
        } satisfies RailItem
      })
  } catch (err) {
    console.error('[rail/sources/cil] Failed to fetch CIL signals:', err)
    return []
  }
}
