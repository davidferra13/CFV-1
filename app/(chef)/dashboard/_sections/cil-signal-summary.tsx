// CIL Signal Summary - surfaces top intelligence signals by domain

import { Suspense } from 'react'
import { DomainSignals } from '@/components/cil/domain-signals'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import { getSignalsForDisplay } from '@/lib/cil/signal-actions'

const DOMAINS = ['finance', 'pipeline', 'calendar'] as const

function DomainSection({ domain, limit }: { domain: (typeof DOMAINS)[number]; limit: number }) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase mb-1">{domain}</p>
      <DomainSignals domain={domain} limit={limit} />
    </div>
  )
}

function DomainFallback() {
  return <div className="h-6 animate-pulse rounded bg-stone-800/50" />
}

export async function CilSignalSummary() {
  try {
    // Pre-check if any signals exist for these domains
    const allSignals = await getSignalsForDisplay()
    const hasAny = allSignals.some((s) => DOMAINS.includes(s.domain as (typeof DOMAINS)[number]))

    return (
      <WidgetCardShell
        widgetId="cil_signals"
        title="Intelligence Signals"
        href="/remy/signals"
        size="md"
      >
        {hasAny ? (
          <div className="space-y-3">
            {DOMAINS.map((domain) => (
              <Suspense key={domain} fallback={<DomainFallback />}>
                <DomainSection domain={domain} limit={3} />
              </Suspense>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500 italic">No active signals</p>
        )}
      </WidgetCardShell>
    )
  } catch (err) {
    console.error('[Dashboard/CilSignalSummary] failed:', err)
    return null
  }
}
