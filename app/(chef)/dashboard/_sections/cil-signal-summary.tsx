// CIL Signal Summary - System Pulse card for the dashboard
// Shows signal count, domain breakdown, top 3 signals with confidence + actions

import { getSignalsForDisplay } from '@/lib/cil/signal-actions'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { CilSignalSummaryClient } from '@/components/cil/cil-signal-summary-client'

const DOMAIN_LABELS: Record<SignalDomain, string> = {
  finance: 'Finance',
  clients: 'Clients',
  calendar: 'Calendar',
  inventory: 'Inventory',
  reputation: 'Reputation',
  pipeline: 'Pipeline',
  cannabis: 'Cannabis',
  commitment: 'Commitment',
  event_debrief: 'Event Debrief',
}

export async function CilSignalSummary() {
  try {
    const allSignals = await getSignalsForDisplay()
    if (allSignals.length === 0) return null

    // Domain breakdown: count per domain
    const domainCounts: Partial<Record<SignalDomain, number>> = {}
    for (const s of allSignals) {
      domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1
    }

    // Top 3 by urgency then confidence
    const top3 = [...allSignals]
      .sort((a, b) => {
        if (b.urgency !== a.urgency) return b.urgency - a.urgency
        if (b.confidence !== a.confidence) return b.confidence - a.confidence
        return b.createdAt - a.createdAt
      })
      .slice(0, 3)

    // Filter to signals from last 24h for the count display
    const dayAgo = Date.now() - 86_400_000
    const recent = allSignals.filter((s) => s.createdAt > dayAgo)

    const breakdown = Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([domain, count]) => ({
        domain: domain as SignalDomain,
        label: DOMAIN_LABELS[domain as SignalDomain] || domain,
        count,
      }))

    return (
      <CilSignalSummaryClient
        totalCount={allSignals.length}
        recentCount={recent.length}
        breakdown={breakdown}
        topSignals={top3}
      />
    )
  } catch (err) {
    console.error('[Dashboard/CilSignalSummary] failed:', err)
    return null
  }
}
